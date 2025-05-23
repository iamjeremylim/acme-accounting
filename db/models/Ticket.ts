import {
  Table,
  Column,
  Model,
  BelongsTo,
  ForeignKey,
  PrimaryKey,
  AutoIncrement,
} from 'sequelize-typescript';
import { Company } from './Company';
import { User } from './User';
import {
  TicketStatus,
  TicketType,
  TicketCategory,
} from '../../src/tickets/tickets.type';

@Table({ tableName: 'tickets' })
export class Ticket extends Model {
  @AutoIncrement
  @PrimaryKey
  @Column
  declare id: number;

  @Column
  declare type: TicketType;

  @Column
  declare status: TicketStatus;

  @Column
  declare category: TicketCategory;

  @ForeignKey(() => Company)
  declare companyId: number;

  @ForeignKey(() => User)
  declare assigneeId: number;

  @BelongsTo(() => Company)
  company: Company;
  @BelongsTo(() => User)
  assignee: User;
}
