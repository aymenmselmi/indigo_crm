import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TenantContextService } from '@/tenant/services/tenant-context.service';
import { DatabaseSwitcherService } from '@/tenant/services/database-switcher.service';
import { Lead } from '@/database/entities/tenant/lead.entity';
import { Account } from '@/database/entities/tenant/account.entity';
import { Contact } from '@/database/entities/tenant/contact.entity';
import { Opportunity } from '@/database/entities/tenant/opportunity.entity';

/**
 * Lead Service - Multi-tenant aware
 * Each organization has its own database (no tenantId filtering needed).
 */
@Injectable()
export class LeadService {
  private logger = new Logger(LeadService.name);

  constructor(
    private databaseSwitcher: DatabaseSwitcherService,
    private tenantContext: TenantContextService,
  ) {}

  private getOrganizationId(): string {
    const orgId = this.tenantContext.getOrganizationId();
    if (!orgId) {
      throw new Error('Organization context not initialized');
    }
    return orgId;
  }

  private async getRepository(dataSource: DataSource) {
    return dataSource.getRepository(Lead);
  }

  async findAll(limit: number = 20, offset: number = 0) {
    const orgId = this.getOrganizationId();
    const dataSource = await this.databaseSwitcher.getDataSourceForOrganization(orgId);
    const repo = await this.getRepository(dataSource);
    
    limit = Math.min(Math.max(limit, 1), 100);
    offset = Math.max(offset, 0);

    const [leads, total] = await repo
      .createQueryBuilder('lead')
      .orderBy('lead.createdAt', 'DESC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return { data: leads, total, limit, offset, hasMore: offset + limit < total };
  }

  async findById(id: string) {
    const orgId = this.getOrganizationId();
    const dataSource = await this.databaseSwitcher.getDataSourceForOrganization(orgId);
    const repo = await this.getRepository(dataSource);

    const lead = await repo.findOne({ where: { id } });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }
    return lead;
  }

  async create(data: Partial<Lead>) {
    try {
      const orgId = this.getOrganizationId();
      const dataSource = await this.databaseSwitcher.getDataSourceForOrganization(orgId);
      const repo = await this.getRepository(dataSource);

      const lead = repo.create({
        ...data,
        tenantId: orgId,
      });
      
      this.logger.debug(`Creating lead: ${JSON.stringify(lead)}`);
      const saved = await repo.save(lead);
      this.logger.debug(`Lead created successfully: ${saved.id}`);
      return saved;
    } catch (error) {
      this.logger.error(`Error creating lead: ${error.message}`, error.stack);
      throw error;
    }
  }

  async update(id: string, data: Partial<Lead>) {
    try {
      const existing = await this.findById(id);
      const orgId = this.getOrganizationId();
      const dataSource = await this.databaseSwitcher.getDataSourceForOrganization(orgId);
      const repo = await this.getRepository(dataSource);

      const updated = Object.assign(existing, data);
      this.logger.debug(`Updating lead ${id}: ${JSON.stringify(updated)}`);
      const saved = await repo.save(updated);
      this.logger.debug(`Lead updated successfully: ${saved.id}`);
      return saved;
    } catch (error) {
      this.logger.error(`Error updating lead: ${error.message}`, error.stack);
      throw error;
    }
  }

  async delete(id: string) {
    const lead = await this.findById(id);
    const orgId = this.getOrganizationId();
    const dataSource = await this.databaseSwitcher.getDataSourceForOrganization(orgId);
    const repo = await this.getRepository(dataSource);

    return repo.remove(lead);
  }

  async search(query: string, limit: number = 20) {
    const orgId = this.getOrganizationId();
    const dataSource = await this.databaseSwitcher.getDataSourceForOrganization(orgId);
    const repo = await this.getRepository(dataSource);

    return repo
      .createQueryBuilder('lead')
      .where('lead.firstName ILIKE :query OR lead.lastName ILIKE :query OR lead.company ILIKE :query', { query: `%${query}%` })
      .limit(limit)
      .getMany();
  }

  async count(): Promise<number> {
    const orgId = this.getOrganizationId();
    const dataSource = await this.databaseSwitcher.getDataSourceForOrganization(orgId);
    const repo = await this.getRepository(dataSource);

    return repo.createQueryBuilder('lead').getCount();
  }

  /**
   * Convert a lead into a Contact, Account, and Opportunity
   * 
   * @param id - Lead ID
   * @returns Conversion result with created/updated Account, Contact, and Opportunity
   */
  async convertLead(id: string) {
    const lead = await this.findById(id);

    // Check if already converted
    if (lead.status === 'converted') {
      throw new BadRequestException('This lead has already been converted');
    }

    const orgId = this.getOrganizationId();
    const dataSource = await this.databaseSwitcher.getDataSourceForOrganization(orgId);

    // Create or find Account from lead.company
    const accountRepo = dataSource.getRepository(Account);
    let account = await accountRepo
      .createQueryBuilder('account')
      .where('account.name = :name', { name: lead.company || lead.firstName + ' ' + lead.lastName })
      .getOne();

    if (!account) {
      account = accountRepo.create({
        name: lead.company || `${lead.firstName} ${lead.lastName}`,
        type: 'prospect',
        tenantId: orgId,
      });
      await accountRepo.save(account);
    }

    // Create Contact from lead
    const contactRepo = dataSource.getRepository(Contact);
    const contact = contactRepo.create({
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      title: lead.title,
      accountId: account.id,
      status: 'active',
      tenantId: orgId,
    });
    await contactRepo.save(contact);

    // Create Opportunity from lead
    const opportunityRepo = dataSource.getRepository(Opportunity);
    const opportunity = opportunityRepo.create({
      name: `${lead.firstName} ${lead.lastName} - Opportunity`,
      description: lead.notes,
      leadId: lead.id,
      accountId: account.id,
      stage: 'prospecting',
      amount: lead.estimatedValue || 0,
      probability: 0,
      status: 'open',
      tenantId: orgId,
    });
    await opportunityRepo.save(opportunity);

    // Update lead status to converted
    lead.status = 'converted';
    const repo = await this.getRepository(dataSource);
    await repo.save(lead);

    return {
      lead: lead,
      account: account,
      contact: contact,
      opportunity: opportunity,
    };
  }
}
