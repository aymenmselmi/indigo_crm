import { Injectable } from '@nestjs/common';
import { TenantContextService } from '@/tenant/services/tenant-context.service';
import { DatabaseSwitcherService } from '@/tenant/services/database-switcher.service';
import { CustomFieldSchema, CfEntityType } from '@/database/entities/tenant/custom-field-schema.entity';
import { CreateCustomFieldSchemaDto } from './dto/create-custom-field-schema.dto';

@Injectable()
export class CustomFieldsService {
  constructor(
    private databaseSwitcher: DatabaseSwitcherService,
    private tenantContext: TenantContextService,
  ) {}

  private async repo() {
    const orgId = this.tenantContext.getOrganizationId();
    const ds = await this.databaseSwitcher.getDataSourceForOrganization(orgId);
    return ds.getRepository(CustomFieldSchema);
  }

  async findByEntityType(entityType: CfEntityType) {
    const repo = await this.repo();
    return repo.find({ where: { entityType }, order: { order: 'ASC', createdAt: 'ASC' } });
  }

  async findAll() {
    const repo = await this.repo();
    return repo.find({ order: { entityType: 'ASC', order: 'ASC' } });
  }

  async create(dto: CreateCustomFieldSchemaDto) {
    const repo = await this.repo();
    // Slugify name to safe key
    const name = dto.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
    const schema = repo.create({ ...dto, name, fieldType: dto.fieldType || 'text', required: dto.required ?? false, order: dto.order ?? 0 });
    return repo.save(schema);
  }

  async delete(id: string) {
    const repo = await this.repo();
    await repo.delete(id);
  }
}
