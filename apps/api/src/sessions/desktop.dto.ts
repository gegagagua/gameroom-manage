import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEmail, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class HeartbeatDto {
  @IsInt()
  @Min(1)
  @Max(500)
  pcNumber: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  appVersion?: string;

  /** Game the customer launched from the library (heartbeat only; ignored without an active session). */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  currentGame?: string;

  /** Idle kiosk that can take over a session the admin started from the web for this PC. */
  @IsOptional()
  @IsBoolean()
  acceptSession?: boolean;
}

export class DesktopLoginDto extends HeartbeatDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(254)
  login: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

export class DesktopLogoutDto {
  @IsInt()
  @Min(1)
  @Max(500)
  pcNumber: number;

  /** USER = logout button, EXPIRED = the client's countdown reached zero */
  @IsOptional()
  @IsIn(['USER', 'EXPIRED'])
  reason: 'USER' | 'EXPIRED' = 'USER';
}

export class DesktopGamesQuery {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  pcNumber: number;
}

export class VerifyAdminDto {
  @Transform(trim)
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
