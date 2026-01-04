export class CreateTicketDto {
  title: string;
  description: string;
  priority?: 'low' | 'medium' | 'high';
  status: 'Open' | 'In Progress' | 'Closed' | 'Waiting';
  queueId: number;
  createdById: number;
  assignedToId?: number;
  dueAt?: Date;
}
