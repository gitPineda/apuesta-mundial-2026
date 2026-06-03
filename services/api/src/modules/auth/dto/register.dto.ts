import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MaxLength(80)
  @Matches(/^[A-Za-z\u00C0-\u017F\s]+$/, {
    message: 'El usuario solo puede contener letras y espacios.',
  })
  username: string;

  @IsString()
  @MaxLength(160)
  @Matches(/^[A-Za-z\u00C0-\u017F\s]+$/, {
    message: 'El nombre completo solo puede contener letras y espacios.',
  })
  fullName: string;

  @IsString()
  @MaxLength(30)
  @Matches(/^\d{7,15}$/, {
    message: 'El telefono debe tener solo digitos, entre 7 y 15 caracteres.',
  })
  phone: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}
