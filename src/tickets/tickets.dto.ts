import {
  TicketCategory,
  TicketStatus,
  TicketType,
} from '../../db/models/Ticket';

export class TicketDto {
  id: number;
  type: TicketType;
  companyId: number;
  assigneeId: number;
  status: TicketStatus;
  category: TicketCategory;
}

export class CreateTicketDto {
  type: TicketType;
  companyId: number;
}
