import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { TenantContextService } from './tenant-context.service';
import { Organization } from '../../database/entities/master';
import * as tenantEntities from '../../database/entities/tenant';

/**
 * DatabaseSwitcherService manages per-tenant DataSources.
 * 
 * Architecture:
 * 1. MASTER database: stores Organization records with db_host, db_port, db_name
 * 2. TENANT databases: one per organization, accessed via DataSource instances
 * 3. CACHING: Connections are cached to avoid repeated initialization
 * 
 * Flow:
 * 1. Tenant makes request (with organizationId in JWT)
 * 2. TenantInterceptor sets tenantContextService.organizationId
 * 3. Service calls getCurrentDataSource()
 * 4. DatabaseSwitcherService.getDataSourceForOrganization(orgId)
 * 5. Look up Organization record in master DB
 * 6. Create DataSource with org's db_host, db_port, db_name
 * 7. Cache it and return
 */
@Injectable()
export class DatabaseSwitcherService {
  private dataSourceMap: Map<string, DataSource> = new Map();
  private logger = new Logger(DatabaseSwitcherService.name);

  constructor(
    @InjectDataSource()
    private masterDataSource: DataSource,
    private tenantContextService: TenantContextService,
  ) {
    this.logger.log('DatabaseSwitcherService initialized');
  }

  /**
   * Get the active DataSource for the current tenant.
   * 
   * Reads organizationId from TenantContextService and loads the
   * corresponding database connection.
   * 
   * @throws Error if tenant context not initialized
   * @returns DataSource for current tenant's database
   */
  async getCurrentDataSource(): Promise<DataSource> {
    const organizationId = this.tenantContextService.getOrganizationId();
    
    if (!organizationId) {
      throw new Error('Tenant context not initialized - no organizationId');
    }
    
    return this.getDataSourceForOrganization(organizationId);
  }

  /**
   * Get DataSource for a specific organization.
   * 
   * Caches connections to avoid repeated initialization.
   * On first call for an org:
   * 1. Fetches Organization record from master DB
   * 2. Extracts db_host, db_port, db_name, db_user, db_password
   * 3. Creates new DataSource with those credentials
   * 4. Initializes the connection
   * 5. Caches it
   * 
   * Subsequent calls return cached DataSource.
   * 
   * @param organizationId - Organization ID
   * @returns DataSource for that organization's database
   * @throws NotFoundException if organization not found
   */
  async getDataSourceForOrganization(organizationId: string): Promise<DataSource> {
    // Return cached DataSource if available
    if (this.dataSourceMap.has(organizationId)) {
      this.logger.debug(`✓ Returning cached DataSource for org ${organizationId}`);
      return this.dataSourceMap.get(organizationId)!;
    }

    this.logger.debug(`Loading DataSource for org ${organizationId}...`);

    // Query master database for Organization record
    const orgRepo = this.masterDataSource.getRepository(Organization);
    const organization = await orgRepo.findOne({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException(
        `Organization ${organizationId} not found in master database`,
      );
    }

    this.logger.debug(
      `Found org: ${organization.name}, database: ${organization.dbName}`,
    );

    // Build DataSource for this tenant
    const {
      User,
      Role,
      Permission,
      Account,
      Contact,
      Lead,
      Opportunity,
      Activity,
      Task,
      TaskComment,
      DynamicEntity,
      DynamicField,
      Notification,
      CustomFieldSchema,
    } = tenantEntities;

    const tenantDataSource = new DataSource({
      type: 'postgres',
      host: organization.dbHost,
      port: organization.dbPort,
      username: organization.dbUser,
      password: organization.dbPassword,
      database: organization.dbName!,
      entities: [
        User,
        Role,
        Permission,
        Account,
        Contact,
        Lead,
        Opportunity,
        Activity,
        Task,
        TaskComment,
        DynamicEntity,
        DynamicField,
        Notification,
        CustomFieldSchema,
      ],
      synchronize: process.env.NODE_ENV === 'development',
      logging: process.env.NODE_ENV === 'development',
      maxQueryExecutionTime: 5000, // Log slow queries
      ssl: process.env.DATABASE_SSL === 'true',
    });

    // Initialize the connection
    try {
      await tenantDataSource.initialize();
      this.logger.log(
        `✓ Initialized DataSource for org ${organizationId} (database: ${organization.dbName})`,
      );
    } catch (error) {
      this.logger.error(
        `✗ Failed to initialize DataSource for org ${organizationId}: ${error.message}`,
      );
      throw error;
    }

    // Cache the DataSource
    this.dataSourceMap.set(organizationId, tenantDataSource);

    // Monitor cache size
    this.logger.debug(`DataSource cache size: ${this.dataSourceMap.size}`);

    return tenantDataSource;
  }

  /**
   * Close and remove a DataSource from cache.
   * Call when organization is deleted or database is purged.
   * 
   * @param organizationId - Organization ID
   */
  async closeDataSource(organizationId: string): Promise<void> {
    const dataSource = this.dataSourceMap.get(organizationId);
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
    this.dataSourceMap.delete(organizationId);
  }

  /**
   * Get total cached DataSources (for monitoring).
   */
  getCacheSize(): number {
    return this.dataSourceMap.size;
  }
}
