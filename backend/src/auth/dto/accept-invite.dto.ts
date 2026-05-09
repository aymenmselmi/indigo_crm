import { IsString, MinLength } from 'class-validator';

export class AcceptInviteDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  @MinLength(6)
  password: string;
}
