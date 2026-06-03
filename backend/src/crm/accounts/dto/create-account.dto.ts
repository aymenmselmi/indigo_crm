import { IsString, IsOptional, IsEnum, IsEmail, Min, Max, IsNumber, IsUUID } from 'class-validator';

export class CreateAccountDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(['prospect', 'customer', 'partner', 'competitor'])
  type?: 'prospect' | 'customer' | 'partner' | 'competitor';

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  billingAddress?: string;

  @IsOptional()
  @IsString()
  shippingAddress?: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  employees?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  annualRevenue?: number;

  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @IsOptional()
  customFields?: Record<string, any>;
}
