import { ConflictException, Injectable } from '@nestjs/common';
import { Company } from '../../db/models/Company';
import {
  Ticket,
  TicketCategory,
  TicketStatus,
  TicketType,
} from '../../db/models/Ticket';
import { User, UserRole } from '../../db/models/User';
import { TicketConfig } from './tickets.type';
import { CreateTicketDto } from './tickets.dto';

@Injectable()
export class TicketsService {
  private readonly ticketConfigs: Record<TicketType, TicketConfig> = {
    [TicketType.managementReport]: {
      category: TicketCategory.accounting,
      role: UserRole.accountant,
    },
    [TicketType.registrationAddressChange]: {
      category: TicketCategory.corporate,
      role: UserRole.corporateSecretary,
    },
  };

  async findAll() {
    return await Ticket.findAll({ include: [Company, User] });
  }

  async create(createTicketDto: CreateTicketDto) {
    const { type, companyId } = createTicketDto;

    if (type === TicketType.registrationAddressChange) {
      await this.checkForDuplicateTicket(type, companyId);
    }

    const config = this.getTicketConfig(type);
    const assignee = await this.findAssignee(type, companyId, config.role);

    return await Ticket.create({
      companyId,
      assigneeId: assignee.id,
      category: config.category,
      type,
      status: TicketStatus.open,
    });
  }

  private async checkForDuplicateTicket(type: TicketType, companyId: number) {
    const existingTicket = await Ticket.findOne({
      where: { companyId, type },
    });

    if (existingTicket) {
      throw new ConflictException(`Company already has a ${type} ticket`);
    }
  }

  private getTicketConfig(type: TicketType): TicketConfig {
    const config = this.ticketConfigs[type];
    if (!config) {
      throw new Error(`Unsupported ticket type: ${type}`);
    }
    return config;
  }

  private async findAssignee(
    type: TicketType,
    companyId: number,
    primaryRole: UserRole,
  ): Promise<User> {
    let assignees = await this.findUsersByRole(companyId, primaryRole);

    if (type === TicketType.registrationAddressChange) {
      if (assignees.length > 1) {
        throw new ConflictException(
          'Multiple secretaries found. Cannot create a ticket',
        );
      }

      if (!assignees.length) {
        assignees = await this.findUsersByRole(companyId, UserRole.director);
        if (assignees.length > 1) {
          throw new ConflictException(
            'Multiple directors found. Cannot create a ticket',
          );
        }
      }
    }

    if (!assignees.length) {
      throw new ConflictException(
        'Cannot find an assignee with the required role for this ticket',
      );
    }

    return assignees[0];
  }

  private async findUsersByRole(
    companyId: number,
    role: UserRole,
  ): Promise<User[]> {
    return await User.findAll({
      where: { companyId, role },
      order: [['createdAt', 'DESC']],
    });
  }
}
