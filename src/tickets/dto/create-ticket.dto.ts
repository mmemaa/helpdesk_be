import { IsString, IsNumber, IsOptional, IsEnum, IsDateString } from 'class-validator';

export class CreateTicketDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsEnum(['low', 'medium', 'high'])
  priority?: 'low' | 'medium' | 'high';

  @IsString()
  status: string;

  @IsNumber()
  queueId: number;

  @IsNumber()
  createdById: number;

  @IsOptional()
  @IsNumber()
  assignedToId?: number;

  @IsOptional()
  @IsDateString()
  dueAt?: Date;
}
