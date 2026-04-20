import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TenantContextService } from '@/tenant/services/tenant-context.service';
import { DatabaseSwitcherService } from '@/tenant/services/database-switcher.service';
import { Account } from '@/database/entities/tenant/account.entity';

/**
 * Account Service - Multi-tenant aware
 * 
 * Each organization has its own database (no tenantId filtering needed).
 * DatabaseSwitcherService automatically routes to the correct tenant database.
 */
@Injectable()
export class AccountService {
  private logger = new Logger(AccountService.name);

  constructor(
    private databaseSwitcher: DatabaseSwitcherService,
    private tenantContext: TenantContextService,
  ) {}

  /**
   * Get the organization ID from the current request context
   */
  private getOrganizationId(): string {
    const orgId = this.tenantContext.getOrganizationId();
    if (!orgId) {
      throw new Error('Organization context not initialized');
    }
    return orgId;
  }

  /**
   * Get repository for accounts in the current tenant's database
   */
  private async getRepository(dataSource: DataSource) {
    return dataSource.getRepository(Account);
  }

  /**
   * Find all accounts for current organization with pagination
   * 
   * @param limit - Number of records to return (default: 20, max: 100)
   * @param offset - Offset for pagination (default: 0)
   * @returns Array of accounts with total count
   */
  async findAll(limit: number = 20, offset: number = 0) {
    try {
      const orgId = this.getOrganizationId();
      const dataSource = await this.databaseSwitcher.getDataSourceForOrganization(orgId);
      
      // Validate pagination params
      limit = Math.min(Math.max(limit, 1), 100);
      offset = Math.max(offset, 0);

      this.logger.debug(`Fetching accounts for org ${orgId}: limit=${limit}, offset=${offset}`);

      const repo = await this.getRepository(dataSource);
      const [accounts, total] = await repo
        .createQueryBuilder('account')
        .orderBy('account.createdAt', 'DESC')
        .skip(offset)
        .take(limit)
        .getManyAndCount();

      return {
        data: accounts,
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      };
    } catch (error) {
      this.logger.error(`Error fetching accounts: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find account by ID
   * 
   * @param id - Account ID
   * @returns Account or throws NotFoundException
   */
  async findById(id: string) {
    const orgId = this.getOrganizationId();
    const dataSource = await this.databaseSwitcher.getDataSourceForOrganization(orgId);
    const repo = await this.getRepository(dataSource);

    const account = await repo.findOne({ where: { id } });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    return account;
  }

  /**
   * Create new account for current organization
   * 
   * @param data - Account data
   * @returns Created account
   */
  async create(data: Partial<Account>) {
    try {
      const orgId = this.getOrganizationId();
      const dataSource = await this.databaseSwitcher.getDataSourceForOrganization(orgId);
      const repo = await this.getRepository(dataSource);

      // Automatically set tenantId to ensure data integrity
      const account = repo.create({
        ...data,
        tenantId: orgId,
      });
      
      this.logger.debug(`Creating account: ${JSON.stringify(account)}`);
      const saved = await repo.save(account);
      this.logger.debug(`Account created successfully: ${saved.id}`);
      return saved;
    } catch (error) {
      this.logger.error(`Error creating account: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update account
   * 
   * @param id - Account ID
   * @param data - Fields to update
   * @returns Updated account
   */
  async update(id: string, data: Partial<Account>) {
    try {
      // Verify it exists first
      const existing = await this.findById(id);

      const orgId = this.getOrganizationId();
      const dataSource = await this.databaseSwitcher.getDataSourceForOrganization(orgId);
      const repo = await this.getRepository(dataSource);

      const updated = Object.assign(existing, data);
      this.logger.debug(`Updating account ${id}: ${JSON.stringify(updated)}`);
      const saved = await repo.save(updated);
      this.logger.debug(`Account updated successfully: ${saved.id}`);
      return saved;
    } catch (error) {
      this.logger.error(`Error updating account: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Delete account
   * 
   * @param id - Account ID
   * @returns Deletion result
   */
  async delete(id: string) {
    const account = await this.findById(id);
    
    const orgId = this.getOrganizationId();
    const dataSource = await this.databaseSwitcher.getDataSourceForOrganization(orgId);
    const repo = await this.getRepository(dataSource);
    
    return repo.remove(account);
  }

  /**
   * Search accounts by name (case-insensitive)
   * 
   * @param query - Search string
   * @param limit - Max results (default: 20)
   * @returns Matching accounts
   */
  async search(query: string, limit: number = 20) {
    const orgId = this.getOrganizationId();
    const dataSource = await this.databaseSwitcher.getDataSourceForOrganization(orgId);
    const repo = await this.getRepository(dataSource);

    return repo
      .createQueryBuilder('account')
      .where('account.name ILIKE :query', { query: `%${query}%` })
      .orderBy('account.name', 'ASC')
      .limit(limit)
      .getMany();
  }

  /**
   * Get account count for current organization
   * 
   * @returns Total number of accounts
   */
  async count(): Promise<number> {
    const orgId = this.getOrganizationId();
    const dataSource = await this.databaseSwitcher.getDataSourceForOrganization(orgId);
    const repo = await this.getRepository(dataSource);

    return repo.createQueryBuilder('account').getCount();
  }

  /**
   * Get all contacts for a specific account
   * 
   * @param accountId - Account ID
   * @param limit - Number of records to return (default: 50, max: 100)
   * @param offset - Offset for pagination (default: 0)
   * @returns Array of contacts linked to the account
   */
  async getContacts(accountId: string, limit: number = 50, offset: number = 0) {
    // Verify account exists
    await this.findById(accountId);

    const orgId = this.getOrganizationId();
    const dataSource = await this.databaseSwitcher.getDataSourceForOrganization(orgId);
    
    limit = Math.min(Math.max(limit, 1), 100);
    offset = Math.max(offset, 0);

    const [contacts, total] = await dataSource
      .getRepository('Contact')
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
   * Get all opportunities for a specific account
   * 
   * @param accountId - Account ID
   * @param limit - Number of records to return (default: 50, max: 100)
   * @param offset - Offset for pagination (default: 0)
   * @returns Array of opportunities linked to the account
   */
  async getOpportunities(accountId: string, limit: number = 50, offset: number = 0) {
    // Verify account exists
    await this.findById(accountId);

    const orgId = this.getOrganizationId();
    const dataSource = await this.databaseSwitcher.getDataSourceForOrganization(orgId);

    limit = Math.min(Math.max(limit, 1), 100);
    offset = Math.max(offset, 0);

    const [opportunities, total] = await dataSource
      .getRepository('Opportunity')
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
}
