import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const DEVICE = /^(PC-([1-9]|10)|SONY-[12])$/;

export class BookingsDayQuery {
  @Matches(DATE)
  date!: string;
}

export class UpdateBookingDto {
  @IsOptional()
  @Matches(DATE)
  date?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(720)
  startMinute?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(720)
  endMinute?: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(12)
  @ArrayUnique()
  @Matches(DEVICE, { each: true })
  devices?: string[];

  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  customerName?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(30)
  phone?: string | null;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(300)
  note?: string | null;
}

export class CreateBookingDto extends UpdateBookingDto {
  @Matches(DATE)
  declare date: string;

  @IsInt()
  @Min(0)
  @Max(720)
  declare startMinute: number;

  @IsInt()
  @Min(0)
  @Max(720)
  declare endMinute: number;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(12)
  @ArrayUnique()
  @Matches(DEVICE, { each: true })
  declare devices: string[];

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  declare customerName: string;
}
