import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class AdminLoginDto {
  @Transform(trim)
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

export class UserLoginDto {
  /** email or phone */
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(254)
  login: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

export class ForgotPasswordDto {
  @Transform(trim)
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @MinLength(6)
  @MaxLength(128)
  password: string;
}

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @IsString()
  @MinLength(6)
  @MaxLength(128)
  newPassword: string;
}
