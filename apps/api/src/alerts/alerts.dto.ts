import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { PaginationQuery } from '../common/pagination';

export class ListAlertsQuery extends PaginationQuery {
  @IsOptional()
  @IsIn(['open', 'all'])
  status: 'open' | 'all' = 'all';

  /** Only alerts with id greater than this (used by the web poller to detect new alerts). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  afterId?: number;
}
