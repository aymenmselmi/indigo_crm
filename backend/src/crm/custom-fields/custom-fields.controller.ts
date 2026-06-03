import { Controller, Get, Post, Delete, Param, Body, Query, ValidationPipe, UseGuards, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CustomFieldsService } from './custom-fields.service';
import { CreateCustomFieldSchemaDto } from './dto/create-custom-field-schema.dto';
import { RolesGuard } from '@/rbac/guards/roles.guard';
import { Roles } from '@/rbac/decorators/roles.decorator';
import { CfEntityType } from '@/database/entities/tenant/custom-field-schema.entity';

const VALID_ENTITY_TYPES: CfEntityType[] = ['lead', 'account', 'contact', 'opportunity'];

@Controller('custom-fields')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class CustomFieldsController {
  constructor(private service: CustomFieldsService) {}

  @Get()
  @Roles('admin', 'manager', 'user')
  async list(@Query('entity') entity?: string) {
    if (entity) {
      if (!VALID_ENTITY_TYPES.includes(entity as CfEntityType)) {
        throw new BadRequestException(`Invalid entity type: ${entity}`);
      }
      return this.service.findByEntityType(entity as CfEntityType);
    }
    return this.service.findAll();
  }

  @Post()
  @Roles('admin')
  async create(@Body(new ValidationPipe()) dto: CreateCustomFieldSchemaDto) {
    return this.service.create(dto);
  }

  @Delete(':id')
  @Roles('admin')
  async delete(@Param('id') id: string) {
    await this.service.delete(id);
    return { deleted: true };
  }
}
