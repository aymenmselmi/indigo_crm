import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TenantContextService } from '@/tenant/services/tenant-context.service';
import { DatabaseSwitcherService } from '@/tenant/services/database-switcher.service';
import { Opportunity } from '@/database/entities/tenant/opportunity.entity';
import { Activity } from '@/database/entities/tenant/activity.entity';

/**
 * Opportunity Service - Multi-tenant aware
 * Each organization has its own database (no tenantId filtering needed).
 */
@Injectable()
export class OpportunityService {
  private logger = new Logger(OpportunityService.name);

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
    return dataSource.getRepository(Opportunity);
  }

  async findAll(limit: number = 20, offset: number = 0) {
    const orgId = this.getOrganizationId();
    const dataSource = await this.databaseSwitcher.getDataSourceForOrganization(orgId);
    const repo = await this.getRepository(dataSource);
    
    limit = Math.min(Math.max(limit, 1), 100);
    offset = Math.max(offset, 0);

    const [opportunities, total] = await repo
      .createQueryBuilder('opportunity')
      .leftJoinAndSelect('opportunity.account', 'account')
      .orderBy('opportunity.createdAt', 'DESC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return { data: opportunities, total, limit, offset, hasMore: offset + limit < total };
  }

  async findById(id: string) {
    const orgId = this.getOrganizationId();
    const dataSource = await this.databaseSwitcher.getDataSourceForOrganization(orgId);
    const repo = await this.getRepository(dataSource);

    const opportunity = await repo.findOne({ where: { id }, relations: ['account'] });

    if (!opportunity) {
      throw new NotFoundException('Opportunity not found');
    }
    return opportunity;
  }

  async create(data: Partial<Opportunity>) {
    try {
      const orgId = this.getOrganizationId();
      const dataSource = await this.databaseSwitcher.getDataSourceForOrganization(orgId);
      const repo = await this.getRepository(dataSource);

      const opportunity = repo.create({
        ...data,
        tenantId: orgId,
      });
      
      this.logger.debug(`Creating opportunity: ${JSON.stringify(opportunity)}`);
      const saved = await repo.save(opportunity);
      this.logger.debug(`Opportunity created successfully: ${saved.id}`);
      return saved;
    } catch (error) {
      this.logger.error(`Error creating opportunity: ${error.message}`, error.stack);
      throw error;
    }
  }

  async update(id: string, data: Partial<Opportunity>) {
    try {
      const existing = await this.findById(id);
      const orgId = this.getOrganizationId();
      const dataSource = await this.databaseSwitcher.getDataSourceForOrganization(orgId);
      const repo = await this.getRepository(dataSource);

      const updated = Object.assign(existing, data);
      this.logger.debug(`Updating opportunity ${id}: ${JSON.stringify(updated)}`);
      const saved = await repo.save(updated);
      this.logger.debug(`Opportunity updated successfully: ${saved.id}`);
      return saved;
    } catch (error) {
      this.logger.error(`Error updating opportunity: ${error.message}`, error.stack);
      throw error;
    }
  }

  async delete(id: string) {
    const opportunity = await this.findById(id);
    const orgId = this.getOrganizationId();
    const dataSource = await this.databaseSwitcher.getDataSourceForOrganization(orgId);
    const repo = await this.getRepository(dataSource);

    return repo.remove(opportunity);
  }

  async search(query: string, limit: number = 20) {
    const orgId = this.getOrganizationId();
    const dataSource = await this.databaseSwitcher.getDataSourceForOrganization(orgId);
    const repo = await this.getRepository(dataSource);

    return repo
      .createQueryBuilder('opportunity')
      .where('opportunity.name ILIKE :query', { query: `%${query}%` })
      .limit(limit)
      .getMany();
  }

  async count(): Promise<number> {
    const orgId = this.getOrganizationId();
    const dataSource = await this.databaseSwitcher.getDataSourceForOrganization(orgId);
    const repo = await this.getRepository(dataSource);

    return repo.createQueryBuilder('opportunity').getCount();
  }

  /**
   * Find opportunities by account ID
   * 
   * @param accountId - Account ID
   * @param limit - Number of records to return (default: 50, max: 100)
   * @param offset - Offset for pagination (default: 0)
   * @returns Array of opportunities for the account with pagination info
   */
  async findByAccountId(accountId: string, limit: number = 50, offset: number = 0) {
    const orgId = this.getOrganizationId();
    const dataSource = await this.databaseSwitcher.getDataSourceForOrganization(orgId);
    const repo = await this.getRepository(dataSource);

    limit = Math.min(Math.max(limit, 1), 100);
    offset = Math.max(offset, 0);

    const [opportunities, total] = await repo
      .createQueryBuilder('opportunity')
      .where('opportunity.accountId = :accountId', { accountId })
      .orderBy('opportunity.createdAt', 'DESC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return {
      data: opportunities,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Get account linked to an opportunity
   * 
   * @param opportunityId - Opportunity ID
   * @returns Account entity
   */
  async getAccount(opportunityId: string) {
    const orgId = this.getOrganizationId();
    const dataSource = await this.databaseSwitcher.getDataSourceForOrganization(orgId);
    const repo = await this.getRepository(dataSource);

    const opportunity = await repo
      .createQueryBuilder('opportunity')
      .leftJoinAndSelect('opportunity.account', 'account')
      .where('opportunity.id = :opportunityId', { opportunityId })
      .getOne();

    if (!opportunity) {
      throw new NotFoundException('Opportunity not found');
    }

    return opportunity.account || null;
  }

  /**
   * Get activities related to an opportunity
   * 
   * @param opportunityId - Opportunity ID
   * @param limit - Number of records to return (default: 50, max: 100)
   * @param offset - Offset for pagination (default: 0)
   * @returns Array of activities linked to opportunity
   */
  async getActivities(opportunityId: string, limit: number = 50, offset: number = 0) {
    // Verify opportunity exists
    await this.findById(opportunityId);

    const orgId = this.getOrganizationId();
    const dataSource = await this.databaseSwitcher.getDataSourceForOrganization(orgId);

    limit = Math.min(Math.max(limit, 1), 100);
    offset = Math.max(offset, 0);

    const [activities, total] = await dataSource
      .getRepository(Activity)
      .createQueryBuilder('activity')
      .where('activity.relatedOpportunityId = :opportunityId', { opportunityId })
      .orderBy('activity.createdAt', 'DESC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return {
      data: activities,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    };
  }
}
