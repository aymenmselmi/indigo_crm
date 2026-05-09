import { IsString, IsOptional, IsUUID, IsEnum, IsNumber, Min } from 'class-validator';

export class CreateOpportunityDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  leadId?: string;

  @IsOptional()
  @IsUUID()
  accountId?: string;

  @IsOptional()
  @IsEnum(['prospecting', 'qualification', 'proposal', 'negotiation', 'closed-won', 'closed-lost'])
  stage?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  probability?: number;

  @IsOptional()
  expectedCloseDate?: Date;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  customFields?: Record<string, any>;
}
