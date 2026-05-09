import { IsEmail, IsOptional, IsIn } from 'class-validator';

export class InviteUserDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsIn(['admin', 'user'])
  role?: string;
}
