import { GameLaunchType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class UpdateGameDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsEnum(GameLaunchType)
  launchType?: GameLaunchType;

  @IsOptional()
  @IsInt()
  @Min(1)
  steamAppId?: number | null;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  exePath?: string | null;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  args?: string | null;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  url?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  processNames?: string[];

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  imageUrl?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  sortOrder?: number;
}

export class CreateGameDto extends UpdateGameDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  declare name: string;

  @IsEnum(GameLaunchType)
  declare launchType: GameLaunchType;
}
