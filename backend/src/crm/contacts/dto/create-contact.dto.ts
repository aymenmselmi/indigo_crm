import { IsString, IsOptional, IsEmail, IsUUID, IsEnum } from 'class-validator';

export class CreateContactDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  mobilePhone?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsEnum(['active', 'inactive', 'prospect'])
  status?: 'active' | 'inactive' | 'prospect';

  @IsUUID()
  accountId: string;

  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @IsOptional()
  customFields?: Record<string, any>;
}
