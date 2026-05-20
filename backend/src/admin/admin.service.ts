import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Organization, GlobalUser } from '../database/entities/master';
import { TenantContextService } from '../tenant/services/tenant-context.service';

@Injectable()
export class AdminService {
  constructor(private dataSource: DataSource) {}

  async getStats() {
    const orgRepo  = this.dataSource.getRepository(Organization);
    const userRepo = this.dataSource.getRepository(GlobalUser);

    const [totalOrgs, totalUsers, activeOrgs, suspendedOrgs] = await Promise.all([
      orgRepo.count(),
      userRepo.count(),
      orgRepo.count({ where: { status: 'active' } }),
      orgRepo.count({ where: { status: 'suspended' } }),
    ]);

    return { totalOrgs, totalUsers, activeOrgs, suspendedOrgs };
  }

  async listOrganizations() {
    const orgRepo  = this.dataSource.getRepository(Organization);
    const userRepo = this.dataSource.getRepository(GlobalUser);

    const orgs = await orgRepo.find({ order: { createdAt: 'DESC' } });

    const withCounts = await Promise.all(
      orgs.map(async (org) => {
        const userCount = await userRepo.count({ where: { organizationId: org.id } });
        return {
          id:           org.id,
          name:         org.name,
          slug:         org.slug,
          status:       org.status,
          planType:     org.planType,
          maxUsers:     org.maxUsers,
          userCount,
          website:      org.website,
          dbName:       org.dbName,
          createdAt:    org.createdAt,
          updatedAt:    org.updatedAt,
        };
      }),
    );

    return withCounts;
  }

  async getOrganization(id: string) {
    const orgRepo  = this.dataSource.getRepository(Organization);
    const userRepo = this.dataSource.getRepository(GlobalUser);

    const org = await orgRepo.findOne({ where: { id } });
    if (!org) throw new NotFoundException('Organization not found');

    const users = await userRepo.find({
      where: { organizationId: id },
      select: ['id', 'firstName', 'lastName', 'email', 'role', 'status', 'lastLogin', 'createdAt'],
      order: { createdAt: 'ASC' },
    });

    return { ...org, users };
  }

  async updateOrganization(id: string, dto: { status?: string; planType?: string; maxUsers?: number }) {
    const orgRepo = this.dataSource.getRepository(Organization);
    const org = await orgRepo.findOne({ where: { id } });
    if (!org) throw new NotFoundException('Organization not found');

    if (dto.status)   org.status   = dto.status as any;
    if (dto.planType) org.planType = dto.planType as any;
    if (dto.maxUsers) org.maxUsers = dto.maxUsers;

    return orgRepo.save(org);
  }

  async listUsers(search?: string) {
    const userRepo = this.dataSource.getRepository(GlobalUser);
    const orgRepo  = this.dataSource.getRepository(Organization);

    const qb = userRepo
      .createQueryBuilder('u')
      .select(['u.id', 'u.firstName', 'u.lastName', 'u.email', 'u.role', 'u.status', 'u.organizationId', 'u.lastLogin', 'u.createdAt'])
      .orderBy('u.createdAt', 'DESC');

    if (search) {
      qb.where('u.email ILIKE :s OR u.firstName ILIKE :s OR u.lastName ILIKE :s', { s: `%${search}%` });
    }

    const users = await qb.getMany();

    const orgIds = [...new Set(users.map(u => u.organizationId))];
    const orgs = await orgRepo.findByIds(orgIds);
    const orgMap = Object.fromEntries(orgs.map(o => [o.id, o.name]));

    return users.map(u => ({ ...u, organizationName: orgMap[u.organizationId] || '—' }));
  }

  async updateUser(id: string, dto: { role?: string; status?: string }) {
    const userRepo = this.dataSource.getRepository(GlobalUser);
    const user = await userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    if (dto.role)   user.role   = dto.role   as any;
    if (dto.status) user.status = dto.status as any;

    return userRepo.save(user);
  }

  async getManagerMetrics(organizationId: string) {
    const userRepo = this.dataSource.getRepository(GlobalUser);
    const org = await this.dataSource.getRepository(Organization).findOne({ where: { id: organizationId } });
    if (!org || !org.dbName) return null;

    const tenantDs = this.dataSource.manager.connection;

    // Query tenant DB directly via raw query on the named DB
    const members = await userRepo.find({
      where: { organizationId },
      select: ['id', 'firstName', 'lastName', 'email', 'role'],
    });

    return {
      organizationId,
      memberCount: members.length,
      members: members.map(m => ({
        id: m.id,
        name: [m.firstName, m.lastName].filter(Boolean).join(' '),
        email: m.email,
        role: m.role,
      })),
    };
  }
}
