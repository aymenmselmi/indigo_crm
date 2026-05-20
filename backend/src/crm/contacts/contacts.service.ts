import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TenantContextService } from '@/tenant/services/tenant-context.service';
import { DatabaseSwitcherService } from '@/tenant/services/database-switcher.service';
import { Contact } from '@/database/entities/tenant/contact.entity';
import { Account } from '@/database/entities/tenant/account.entity';
import { Activity } from '@/database/entities/tenant/activity.entity';

/**
 * Contact Service - Multi-tenant aware
 * Each organization has its own database (no tenantId filtering needed).
 */
@Injectable()
export class ContactService {
  private logger = new Logger(ContactService.name);

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
    return dataSource.getRepository(Contact);
  }

  async findAll(limit: number = 20, offset: number = 0) {
    const orgId = this.getOrganizationId();
    const dataSource = await this.databaseSwitcher.getDataSourceForOrganization(orgId);
    const repo = await this.getRepository(dataSource);
    
    limit = Math.min(Math.max(limit, 1), 100);
    offset = Math.max(offset, 0);

    const [contacts, total] = await repo
      .createQueryBuilder('contact')
      .leftJoinAndSelect('contact.account', 'account')
      .orderBy('contact.createdAt', 'DESC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return { data: contacts, total, limit, offset, hasMore: offset + limit < total };
  }

  async findById(id: string) {
    const orgId = this.getOrganizationId();
    const dataSource = await this.databaseSwitcher.getDataSourceForOrganization(orgId);
    const repo = await this.getRepository(dataSource);

    const contact = await repo.findOne({ where: { id }, relations: ['account'] });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }
    return contact;
  }

  async create(data: Partial<Contact>) {
    try {
      const orgId = this.getOrganizationId();
      const dataSource = await this.databaseSwitcher.getDataSourceForOrganization(orgId);
      const repo = await this.getRepository(dataSource);

      const contact = repo.create({
        ...data,
        tenantId: orgId,
      });
      
      this.logger.debug(`Creating contact: ${JSON.stringify(contact)}`);
      const saved = await repo.save(contact);
      this.logger.debug(`Contact created successfully: ${saved.id}`);
      return saved;
    } catch (error) {
      this.logger.error(`Error creating contact: ${error.message}`, error.stack);
      throw error;
    }
  }

  async update(id: string, data: Partial<Contact>) {
    try {
      const existing = await this.findById(id);
      const orgId = this.getOrganizationId();
      const dataSource = await this.databaseSwitcher.getDataSourceForOrganization(orgId);
      const repo = await this.getRepository(dataSource);

      const updated = Object.assign(existing, data);
      this.logger.debug(`Updating contact ${id}: ${JSON.stringify(updated)}`);
      const saved = await repo.save(updated);
      this.logger.debug(`Contact updated successfully: ${saved.id}`);
      return saved;
    } catch (error) {
      this.logger.error(`Error updating contact: ${error.message}`, error.stack);
      throw error;
    }
  }

  async delete(id: string) {
    const contact = await this.findById(id);
    const orgId = this.getOrganizationId();
    const dataSource = await this.databaseSwitcher.getDataSourceForOrganization(orgId);
    const repo = await this.getRepository(dataSource);

    return repo.remove(contact);
  }

  async search(query: string, limit: number = 20) {
    const orgId = this.getOrganizationId();
    const dataSource = await this.databaseSwitcher.getDataSourceForOrganization(orgId);
    const repo = await this.getRepository(dataSource);

    return repo
      .createQueryBuilder('contact')
      .where('contact.firstName ILIKE :query OR contact.lastName ILIKE :query', { query: `%${query}%` })
      .limit(limit)
      .getMany();
  }

  async count(): Promise<number> {
    const orgId = this.getOrganizationId();
    const dataSource = await this.databaseSwitcher.getDataSourceForOrganization(orgId);
    const repo = await this.getRepository(dataSource);

    return repo.createQueryBuilder('contact').getCount();
  }

  /**
   * Find contacts by account ID
   * 
   * @param accountId - Account ID
   * @param limit - Number of records to return (default: 50, max: 100)
   * @param offset - Offset for pagination (default: 0)
   * @returns Array of contacts for the account with pagination info
   */
  async findByAccountId(accountId: string, limit: number = 50, offset: number = 0) {
    const orgId = this.getOrganizationId();
    const dataSource = await this.databaseSwitcher.getDataSourceForOrganization(orgId);
    const repo = await this.getRepository(dataSource);

    limit = Math.min(Math.max(limit, 1), 100);
    offset = Math.max(offset, 0);

    const [contacts, total] = await repo
      .createQueryBuilder('contact')
      .where('contact.accountId = :accountId', { accountId })
      .orderBy('contact.createdAt', 'DESC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return {
      data: contacts,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Get account linked to a contact
   * 
   * @param contactId - Contact ID
   * @returns Account entity or null if not linked
   */
  async getAccount(contactId: string) {
    const orgId = this.getOrganizationId();
    const dataSource = await this.databaseSwitcher.getDataSourceForOrganization(orgId);
    const repo = await this.getRepository(dataSource);

    const contact = await repo
      .createQueryBuilder('contact')
      .leftJoinAndSelect('contact.account', 'account')
      .where('contact.id = :contactId', { contactId })
      .getOne();

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    return contact.account || null;
  }

  /**
   * Get activities related to a contact
   * 
   * @param contactId - Contact ID
   * @param limit - Number of records to return (default: 50, max: 100)
   * @param offset - Offset for pagination (default: 0)
   * @returns Array of activities linked to contact
   */
  async getActivities(contactId: string, limit: number = 50, offset: number = 0) {
    // Verify contact exists
    await this.findById(contactId);

    const orgId = this.getOrganizationId();
    const dataSource = await this.databaseSwitcher.getDataSourceForOrganization(orgId);

    limit = Math.min(Math.max(limit, 1), 100);
    offset = Math.max(offset, 0);

    const [activities, total] = await dataSource
      .getRepository(Activity)
      .createQueryBuilder('activity')
      .where('activity.relatedContactId = :contactId', { contactId })
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
