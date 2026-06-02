import { IsDateString, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Matches(/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]+$/, {
    message: 'El usuario solo puede contener letras y espacios.',
  })
  username?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  @Matches(/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]+$/, {
    message: 'El nombre completo solo puede contener letras y espacios.',
  })
  fullName?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  @Matches(/^\d{7,15}$/, {
    message: 'El telefono debe tener solo digitos, entre 7 y 15 caracteres.',
  })
  phone?: string;
}
