import { UserRole } from '../user/user.type';

export enum TicketStatus {
  open = 'open',
  resolved = 'resolved',
}

export enum TicketType {
  managementReport = 'managementReport',
  registrationAddressChange = 'registrationAddressChange',
  strikeOff = 'strikeOff',
}

export enum TicketCategory {
  accounting = 'accounting',
  corporate = 'corporate',
  management = 'management',
}

export interface TicketConfig {
  category: TicketCategory;
  role: UserRole;
}

export const TICKET_CONFIGS = {
  [TicketType.managementReport]: {
    category: TicketCategory.accounting,
    role: UserRole.accountant,
  },
  [TicketType.registrationAddressChange]: {
    category: TicketCategory.corporate,
    role: UserRole.corporateSecretary,
  },
  [TicketType.strikeOff]: {
    category: TicketCategory.management,
    role: UserRole.director,
  },
} as const satisfies Record<TicketType, TicketConfig>;
