import { Type } from 'class-transformer';
import { IsInt, IsOptional, Matches, Min } from 'class-validator';
import { PaginationQuery } from '../common/pagination';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export class ReportRangeQuery {
  @Matches(DATE_RE, { message: 'from must be YYYY-MM-DD' })
  from: string;

  @Matches(DATE_RE, { message: 'to must be YYYY-MM-DD' })
  to: string;
}

export class ReportSessionsQuery extends PaginationQuery {
  @Matches(DATE_RE, { message: 'from must be YYYY-MM-DD' })
  from: string;

  @Matches(DATE_RE, { message: 'to must be YYYY-MM-DD' })
  to: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pcId?: number;
}
