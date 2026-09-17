import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PaginationQuery } from '../common/pagination';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const PHONE_RE = /^\+?[0-9\s\-()]{6,20}$/;

export class CreateUserDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @Transform(trim)
  @IsEmail()
  @MaxLength(254)
  email: string;

  @Transform(trim)
  @Matches(PHONE_RE, { message: 'phone must be a valid phone number' })
  phone: string;

  @IsString()
  @MinLength(6)
  @MaxLength(128)
  password: string;

  /** Initial balance in hours (decimals allowed, e.g. 1.5 = 1h 30m). */
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10000)
  balanceHours?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateUserDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @Transform(trim)
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @IsOptional()
  @Transform(trim)
  @Matches(PHONE_RE, { message: 'phone must be a valid phone number' })
  phone?: string;

  /** Admin can set a new password (no current password required). */
  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(128)
  password?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ListUsersQuery extends PaginationQuery {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsIn(['all', 'active', 'inactive'])
  status: 'all' | 'active' | 'inactive' = 'all';
}

export class AdjustBalanceDto {
  /** add = top up, subtract = remove time, set = set exact balance */
  @IsIn(['add', 'subtract', 'set'])
  operation: 'add' | 'subtract' | 'set';

  @IsNumber()
  @Min(0)
  @Max(10000)
  hours: number;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  note?: string;
}
