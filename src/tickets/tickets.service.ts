import { Body, ConflictException, Controller } from '@nestjs/common';
import { Company } from '../../db/models/Company';
import {
  Ticket,
  TicketCategory,
  TicketStatus,
  TicketType,
} from '../../db/models/Ticket';
import { User, UserRole } from '../../db/models/User';

interface newTicketDto {
  type: TicketType;
  companyId: number;
}

@Controller('api/v1/tickets')
export class TicketsService {
  async findAll() {
    return await Ticket.findAll({ include: [Company, User] });
  }

  async create(@Body() newTicketDto: newTicketDto) {
    const { type, companyId } = newTicketDto;
    const typeToCategoryAndRole = {
      [TicketType.managementReport]: {
        category: TicketCategory.accounting,
        role: UserRole.accountant,
      },
      [TicketType.registrationAddressChange]: {
        category: TicketCategory.corporate,
        role: UserRole.corporateSecretary,
      },
    };
    const mapping = typeToCategoryAndRole[type];

    if (!mapping) {
      throw new Error(`Unsupported ticket type: ${type}`);
    }

    const { category, role: userRole } = mapping;

    const assignees = await User.findAll({
      where: { companyId, role: userRole },
      order: [['createdAt', 'DESC']],
    });

    if (!assignees.length)
      throw new ConflictException(
        `Cannot find user with role ${userRole} to create a ticket`,
      );

    if (userRole === UserRole.corporateSecretary && assignees.length > 1)
      throw new ConflictException(
        `Multiple users with role ${userRole}. Cannot create a ticket`,
      );

    const assignee = assignees[0];

    return await Ticket.create({
      companyId,
      assigneeId: assignee.id,
      category,
      type,
      status: TicketStatus.open,
    });
  }
}
