import { IsString, IsOptional, IsEmail, IsEnum, IsNumber, Min, IsUUID } from 'class-validator';

export class CreateLeadDto {
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
  company?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsEnum(['new', 'contacted', 'qualified', 'converted', 'rejected'])
  status?: 'new' | 'contacted' | 'qualified' | 'converted' | 'rejected';

  @IsOptional()
  @IsEnum(['website', 'email', 'phone', 'referral', 'event', 'social', 'cold'])
  source?: 'website' | 'email' | 'phone' | 'referral' | 'event' | 'social' | 'cold';

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedValue?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  leadScore?: number;

  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @IsOptional()
  customFields?: Record<string, any>;
}
