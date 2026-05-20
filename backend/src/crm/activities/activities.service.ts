import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TenantContextService } from '@/tenant/services/tenant-context.service';
import { DatabaseSwitcherService } from '@/tenant/services/database-switcher.service';
import { Activity } from '@/database/entities/tenant/activity.entity';

/**
 * Activity Service - Multi-tenant aware
 * Each organization has its own database (no tenantId filtering needed).
 */
@Injectable()
export class ActivityService {
  private logger = new Logger(ActivityService.name);

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
    return dataSource.getRepository(Activity);
  }

  async findAll(limit: number = 20, offset: number = 0) {
    const orgId = this.getOrganizationId();
    const dataSource = await this.databaseSwitcher.getDataSourceForOrganization(orgId);
    const repo = await this.getRepository(dataSource);
    
    limit = Math.min(Math.max(limit, 1), 100);
    offset = Math.max(offset, 0);

    const [activities, total] = await repo
      .createQueryBuilder('activity')
      .leftJoinAndSelect('activity.relatedContact', 'contact')
      .leftJoinAndSelect('activity.relatedOpportunity', 'opportunity')
      .orderBy('activity.createdAt', 'DESC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return { data: activities, total, limit, offset, hasMore: offset + limit < total };
  }

  async findById(id: string) {
    const orgId = this.getOrganizationId();
    const dataSource = await this.databaseSwitcher.getDataSourceForOrganization(orgId);
    const repo = await this.getRepository(dataSource);

    const activity = await repo.findOne({ where: { id } });

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }
    return activity;
  }

  async create(data: Partial<Activity>) {
    const orgId = this.getOrganizationId();
    const dataSource = await this.databaseSwitcher.getDataSourceForOrganization(orgId);
    const repo = await this.getRepository(dataSource);

    const activity = repo.create({
      ...data,
      tenantId: orgId,
    });
    return repo.save(activity);
  }

  async update(id: string, data: Partial<Activity>) {
    const existing = await this.findById(id);
    const orgId = this.getOrganizationId();
    const dataSource = await this.databaseSwitcher.getDataSourceForOrganization(orgId);
    const repo = await this.getRepository(dataSource);

    const updated = Object.assign(existing, data);
    return repo.save(updated);
  }

  async delete(id: string) {
    const activity = await this.findById(id);
    const orgId = this.getOrganizationId();
    const dataSource = await this.databaseSwitcher.getDataSourceForOrganization(orgId);
    const repo = await this.getRepository(dataSource);

    return repo.remove(activity);
  }

  async findByContact(contactId: string, limit: number = 50) {
    const orgId = this.getOrganizationId();
    const dataSource = await this.databaseSwitcher.getDataSourceForOrganization(orgId);
    const repo = await this.getRepository(dataSource);

    const activities = await repo
      .createQueryBuilder('activity')
      .where('activity.relatedContactId = :contactId', { contactId })
      .orderBy('activity.dueDate', 'DESC')
      .addOrderBy('activity.createdAt', 'DESC')
      .take(limit)
      .getMany();

    return activities;
  }

  async findByOpportunity(opportunityId: string, limit: number = 50) {
    const orgId = this.getOrganizationId();
    const dataSource = await this.databaseSwitcher.getDataSourceForOrganization(orgId);
    const repo = await this.getRepository(dataSource);

    const activities = await repo
      .createQueryBuilder('activity')
      .leftJoinAndSelect('activity.relatedContact', 'contact')
      .leftJoinAndSelect('activity.relatedOpportunity', 'opportunity')
      .where('activity.relatedOpportunityId = :opportunityId', { opportunityId })
      .orderBy('activity.dueDate', 'DESC')
      .addOrderBy('activity.createdAt', 'DESC')
      .take(limit)
      .getMany();

    return activities;
  }

  async search(query: string, limit: number = 20) {
    const orgId = this.getOrganizationId();
    const dataSource = await this.databaseSwitcher.getDataSourceForOrganization(orgId);
    const repo = await this.getRepository(dataSource);

    return repo
      .createQueryBuilder('activity')
      .where('activity.subject ILIKE :query OR activity.description ILIKE :query', { query: `%${query}%` })
      .limit(limit)
      .getMany();
  }

  async count(): Promise<number> {
    const orgId = this.getOrganizationId();
    const dataSource = await this.databaseSwitcher.getDataSourceForOrganization(orgId);
    const repo = await this.getRepository(dataSource);

    return repo.createQueryBuilder('activity').getCount();
  }
}
