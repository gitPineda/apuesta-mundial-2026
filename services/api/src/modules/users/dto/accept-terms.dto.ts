import { IsString, MaxLength } from 'class-validator';

export class AcceptTermsDto {
  @IsString()
  @MaxLength(30)
  termsVersion: string;
}
