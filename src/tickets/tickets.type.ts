import { TicketCategory } from '../../db/models/Ticket';
import { UserRole } from '../../db/models/User';

export interface TicketConfig {
  category: TicketCategory;
  role: UserRole;
}
