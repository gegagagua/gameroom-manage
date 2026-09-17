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
  ValidateIf,
} from 'class-validator';
import { PaginationQuery } from '../common/pagination';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
/** Empty string from a form field means "no value" for optional username/phone. */
const trimToNull = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};
const PHONE_RE = /^\+?[0-9\s\-()]{6,20}$/;
const USERNAME_RE = /^[A-Za-z0-9._-]{3,32}$/;

export class CreateUserDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  /** Optional login name (letters, digits, dot, dash, underscore). */
  @IsOptional()
  @Transform(trimToNull)
  @ValidateIf((o: CreateUserDto) => o.username !== null && o.username !== undefined)
  @Matches(USERNAME_RE, { message: 'username must be 3-32 chars: letters, digits, . _ -' })
  username?: string | null;

  @Transform(trim)
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsOptional()
  @Transform(trimToNull)
  @ValidateIf((o: CreateUserDto) => o.phone !== null && o.phone !== undefined)
  @Matches(PHONE_RE, { message: 'phone must be a valid phone number' })
  phone?: string | null;

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
  @Transform(trimToNull)
  @ValidateIf((o: UpdateUserDto) => o.username !== null && o.username !== undefined)
  @Matches(USERNAME_RE, { message: 'username must be 3-32 chars: letters, digits, . _ -' })
  username?: string | null;

  @IsOptional()
  @Transform(trim)
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @IsOptional()
  @Transform(trimToNull)
  @ValidateIf((o: UpdateUserDto) => o.phone !== null && o.phone !== undefined)
  @Matches(PHONE_RE, { message: 'phone must be a valid phone number' })
  phone?: string | null;

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
