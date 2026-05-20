import { Injectable, BadRequestException, UnauthorizedException, Logger, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { RegisterDto, LoginDto, InviteUserDto, AcceptInviteDto } from './dto';
import { GlobalUser, Organization, Invitation } from '../database/entities/master';
import { TenantProvisioningService, DatabaseSwitcherService } from '../tenant/services';
import { User } from '../database/entities/tenant';

@Injectable()
export class AuthService {
  private logger = new Logger(AuthService.name);

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private dataSource: DataSource,
    private tenantProvisioning: TenantProvisioningService,
    private databaseSwitcher: DatabaseSwitcherService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, password, firstName, lastName, organizationName, organizationSlug, phone } = registerDto;

    this.logger.log(`📝 Registering new user: ${email} for organization: ${organizationName}`);

    const masterRepository = this.dataSource.getRepository(Organization);
    const globalUserRepository = this.dataSource.getRepository(GlobalUser);

    const organization = await masterRepository.findOne({ where: { slug: organizationSlug } });
    if (organization) {
      throw new BadRequestException(`Organization with slug '${organizationSlug}' already exists`);
    }

    const existingUser = await globalUserRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new BadRequestException('Email already registered');
    }

    this.logger.log(`🚀 Provisioning tenant database for: ${organizationName}`);
    const newOrg = await this.tenantProvisioning.provisionTenant(organizationName, organizationSlug, email);

    const hashedPassword = await bcrypt.hash(password, 10);

    const globalUser = globalUserRepository.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      organizationId: newOrg.id,
      phone,
      role: 'admin',
      emailVerified: false,
    });

    await globalUserRepository.save(globalUser);
    this.logger.log(`✅ User registered successfully: ${email} (org: ${organizationName})`);

    try {
      const tenantDataSource = await this.databaseSwitcher.getDataSourceForOrganization(newOrg.id);
      const tenantUserRepository = tenantDataSource.getRepository(User);
      const tenantUser = tenantUserRepository.create({
        id: globalUser.id,
        email,
        password: hashedPassword,
        firstName,
        lastName,
        tenantId: newOrg.id,
        status: 'active',
        emailVerified: false,
      });
      await tenantUserRepository.save(tenantUser);
      this.logger.log(`✅ Tenant user created: ${email}`);
    } catch (error) {
      this.logger.error(`⚠️ Failed to create tenant user: ${error.message}`);
    }

    return this.generateToken(globalUser);
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const globalUserRepository = this.dataSource.getRepository(GlobalUser);
    const user = await globalUserRepository.findOne({
      where: { email },
      relations: ['organization'],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    user.lastLogin = new Date();
    await globalUserRepository.save(user);

    return this.generateToken(user);
  }

  async inviteUser(inviteDto: InviteUserDto, currentUser: any) {
    const { email, role = 'user' } = inviteDto;
    const organizationId = currentUser.organizationId;

    // Check if user is already a member of this org
    const globalUserRepo = this.dataSource.getRepository(GlobalUser);
    const existing = await globalUserRepo.findOne({ where: { email, organizationId } });
    if (existing) {
      throw new BadRequestException('This user is already a member of your organization');
    }

    // Revoke any existing pending invite for this email in this org
    const invitationRepo = this.dataSource.getRepository(Invitation);
    const pendingInvite = await invitationRepo.findOne({
      where: { email, organizationId, status: 'pending' },
    });
    if (pendingInvite) {
      await invitationRepo.update(pendingInvite.id, { status: 'revoked' });
    }

    // Create new invitation (7-day expiry)
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invitation = invitationRepo.create({
      email,
      organizationId,
      invitedByUserId: currentUser.sub,
      token,
      role,
      status: 'pending',
      expiresAt,
    });

    await invitationRepo.save(invitation);
    this.logger.log(`✉️ Invitation created for ${email} in org ${organizationId}`);

    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5174';

    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
      inviteUrl: `${frontendUrl}/accept-invite?token=${token}`,
    };
  }

  async checkInvite(token: string) {
    const invitationRepo = this.dataSource.getRepository(Invitation);
    const invitation = await invitationRepo.findOne({
      where: { token },
      relations: ['organization'],
    });

    if (!invitation) {
      throw new NotFoundException('Invalid invitation token');
    }
    if (invitation.status === 'accepted') {
      throw new BadRequestException('This invitation has already been accepted');
    }
    if (invitation.status === 'revoked') {
      throw new BadRequestException('This invitation has been revoked');
    }
    if (new Date() > invitation.expiresAt) {
      await invitationRepo.update(invitation.id, { status: 'expired' });
      throw new BadRequestException('This invitation has expired');
    }

    return {
      email: invitation.email,
      organizationName: invitation.organization?.name,
      organizationSlug: invitation.organization?.slug,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
    };
  }

  async acceptInvite(token: string, dto: AcceptInviteDto) {
    const { firstName, lastName, password } = dto;

    const invitationRepo = this.dataSource.getRepository(Invitation);
    const invitation = await invitationRepo.findOne({
      where: { token },
      relations: ['organization'],
    });

    if (!invitation) {
      throw new NotFoundException('Invalid invitation token');
    }
    if (invitation.status !== 'pending') {
      throw new BadRequestException(`Invitation is no longer valid (status: ${invitation.status})`);
    }
    if (new Date() > invitation.expiresAt) {
      await invitationRepo.update(invitation.id, { status: 'expired' });
      throw new BadRequestException('This invitation has expired');
    }

    // Check email not already registered in this org
    const globalUserRepo = this.dataSource.getRepository(GlobalUser);
    const existing = await globalUserRepo.findOne({
      where: { email: invitation.email, organizationId: invitation.organizationId },
    });
    if (existing) {
      throw new BadRequestException('An account with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create GlobalUser
    const globalUser = globalUserRepo.create({
      email: invitation.email,
      password: hashedPassword,
      firstName,
      lastName,
      organizationId: invitation.organizationId,
      role: invitation.role as 'admin' | 'user',
      emailVerified: true,
      status: 'active',
    });
    await globalUserRepo.save(globalUser);

    // Create TenantUser
    try {
      const tenantDs = await this.databaseSwitcher.getDataSourceForOrganization(invitation.organizationId);
      const tenantUserRepo = tenantDs.getRepository(User);
      const tenantUser = tenantUserRepo.create({
        id: globalUser.id,
        email: invitation.email,
        password: hashedPassword,
        firstName,
        lastName,
        tenantId: invitation.organizationId,
        status: 'active',
        emailVerified: true,
      });
      await tenantUserRepo.save(tenantUser);
      this.logger.log(`✅ Tenant user created via invite: ${invitation.email}`);
    } catch (error) {
      this.logger.error(`⚠️ Failed to create tenant user via invite: ${error.message}`);
    }

    // Mark invitation accepted
    await invitationRepo.update(invitation.id, {
      status: 'accepted',
      acceptedAt: new Date(),
    });

    this.logger.log(`✅ Invite accepted: ${invitation.email} joined org ${invitation.organizationId}`);
    return this.generateToken(globalUser);
  }

  async listInvitations(organizationId: string) {
    const invitationRepo = this.dataSource.getRepository(Invitation);
    return invitationRepo.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
      select: ['id', 'email', 'role', 'status', 'expiresAt', 'acceptedAt', 'createdAt'],
    });
  }

  async revokeInvitation(id: string, organizationId: string) {
    const invitationRepo = this.dataSource.getRepository(Invitation);
    const invitation = await invitationRepo.findOne({ where: { id, organizationId } });
    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }
    await invitationRepo.update(id, { status: 'revoked' });
    return { success: true };
  }

  async listMembers(organizationId: string) {
    const globalUserRepo = this.dataSource.getRepository(GlobalUser);
    return globalUserRepo.find({
      where: { organizationId },
      order: { createdAt: 'ASC' },
      select: ['id', 'firstName', 'lastName', 'email', 'role', 'status', 'lastLogin', 'createdAt'],
    });
  }

  async updateMemberRole(memberId: string, organizationId: string, role: string, requesterId: string) {
    const allowed = ['user', 'manager', 'admin'];
    if (!allowed.includes(role)) {
      throw new BadRequestException(`Invalid role. Allowed: ${allowed.join(', ')}`);
    }
    const globalUserRepo = this.dataSource.getRepository(GlobalUser);
    const member = await globalUserRepo.findOne({ where: { id: memberId, organizationId } });
    if (!member) throw new NotFoundException('Member not found');
    if (member.id === requesterId) throw new BadRequestException('You cannot change your own role');
    await globalUserRepo.update(memberId, { role: role as any });
    return { success: true, id: memberId, role };
  }

  async refreshToken(user: any) {
    const globalUserRepository = this.dataSource.getRepository(GlobalUser);
    const foundUser = await globalUserRepository.findOne({ where: { id: user.id } });
    if (!foundUser) {
      throw new UnauthorizedException('User not found');
    }
    return this.generateToken(foundUser);
  }

  private generateToken(user: GlobalUser) {
    const payload = {
      sub: user.id,
      email: user.email,
      organizationId: user.organizationId,
      role: user.role,
    };

    return {
      accessToken: this.jwtService.sign(payload, {
        expiresIn: this.configService.get<string>('JWT_EXPIRATION') || '3600s',
      }),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        organizationId: user.organizationId,
        role: user.role,
      },
    };
  }
}
