export class UpdateTicketDto {
  title?: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  status?: 'Open' | 'In Progress' | 'Closed' | 'Waiting';
  queueId?: number;
  assignedToId?: number;
  dueAt?: Date;
}
