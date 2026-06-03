import { IsString, IsOptional, IsEnum, IsBoolean, IsNumber, IsArray, Min, MaxLength } from 'class-validator';
import { CfEntityType, CfFieldType } from '@/database/entities/tenant/custom-field-schema.entity';

export class CreateCustomFieldSchemaDto {
  @IsEnum(['lead', 'account', 'contact', 'opportunity'])
  entityType: CfEntityType;

  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @MaxLength(255)
  label: string;

  @IsOptional()
  @IsEnum(['text', 'number', 'date', 'boolean', 'dropdown'])
  fieldType?: CfFieldType;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  order?: number;
}
