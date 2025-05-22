import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Company } from '../../db/models/Company';
import {
  TicketCategory,
  TicketStatus,
  TicketType,
} from '../../db/models/Ticket';
import { User, UserRole } from '../../db/models/User';
import { DbModule } from '../db.module';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { Ticket } from '../../db/models/Ticket';

describe('TicketsController', () => {
  let controller: TicketsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TicketsController],
      providers: [TicketsService],
      imports: [DbModule],
    }).compile();

    controller = module.get<TicketsController>(TicketsController);
  });

  it('should be defined', async () => {
    expect(controller).toBeDefined();

    const res = await controller.findAll();
    console.log(res);
  });

  describe('create', () => {
    describe('managementReport', () => {
      it('creates managementReport ticket', async () => {
        const company = await Company.create({ name: 'test' });
        const user = await User.create({
          name: 'Test User',
          role: UserRole.accountant,
          companyId: company.id,
        });
        const ticket = await controller.create({
          companyId: company.id,
          type: TicketType.managementReport,
        });
        expect(ticket.category).toBe(TicketCategory.accounting);
        expect(ticket.assigneeId).toBe(user.id);
        expect(ticket.status).toBe(TicketStatus.open);
      });
      it('if there are multiple accountants, assign the last one', async () => {
        const company = await Company.create({ name: 'test' });
        await User.create({
          name: 'Test User',
          role: UserRole.accountant,
          companyId: company.id,
        });
        const user2 = await User.create({
          name: 'Test User',
          role: UserRole.accountant,
          companyId: company.id,
        });
        const ticket = await controller.create({
          companyId: company.id,
          type: TicketType.managementReport,
        });
        expect(ticket.category).toBe(TicketCategory.accounting);
        expect(ticket.assigneeId).toBe(user2.id);
        expect(ticket.status).toBe(TicketStatus.open);
      });
      it('if there is no accountant, throw', async () => {
        const company = await Company.create({ name: 'test' });
        await expect(
          controller.create({
            companyId: company.id,
            type: TicketType.managementReport,
          }),
        ).rejects.toEqual(
          new ConflictException(
            `Cannot find an assignee with the required role.`,
          ),
        );
      });
    });
    describe('registrationAddressChange', () => {
      it('creates registrationAddressChange ticket', async () => {
        const company = await Company.create({ name: 'test' });
        const user = await User.create({
          name: 'Test User',
          role: UserRole.corporateSecretary,
          companyId: company.id,
        });
        const ticket = await controller.create({
          companyId: company.id,
          type: TicketType.registrationAddressChange,
        });
        expect(ticket.category).toBe(TicketCategory.corporate);
        expect(ticket.assigneeId).toBe(user.id);
        expect(ticket.status).toBe(TicketStatus.open);
      });
      it('if there are multiple secretaries, throw', async () => {
        const company = await Company.create({ name: 'test' });
        await User.create({
          name: 'Test User',
          role: UserRole.corporateSecretary,
          companyId: company.id,
        });
        await User.create({
          name: 'Test User',
          role: UserRole.corporateSecretary,
          companyId: company.id,
        });
        await expect(
          controller.create({
            companyId: company.id,
            type: TicketType.registrationAddressChange,
          }),
        ).rejects.toEqual(new ConflictException(`Multiple secretaries found.`));
      });
      it('if there is no secretary, throw', async () => {
        const company = await Company.create({ name: 'test' });
        await expect(
          controller.create({
            companyId: company.id,
            type: TicketType.registrationAddressChange,
          }),
        ).rejects.toEqual(
          new ConflictException(
            'Cannot find an assignee with the required role.',
          ),
        );
      });
      it('throws error if duplicate registrationAddressChange ticket exists', async () => {
        const company = await Company.create({ name: 'test' });
        await User.create({
          name: 'Test User',
          role: UserRole.corporateSecretary,
          companyId: company.id,
        });
        // Create first ticket
        await controller.create({
          companyId: company.id,
          type: TicketType.registrationAddressChange,
        });
        // Try to create duplicate ticket
        await expect(
          controller.create({
            companyId: company.id,
            type: TicketType.registrationAddressChange,
          }),
        ).rejects.toEqual(
          new ConflictException(
            'Company already has a registrationAddressChange ticket',
          ),
        );
      });
      it('assigns to director if no corporate secretary exists', async () => {
        const company = await Company.create({ name: 'test' });
        const director = await User.create({
          name: 'Test Director',
          role: UserRole.director,
          companyId: company.id,
        });
        const ticket = await controller.create({
          companyId: company.id,
          type: TicketType.registrationAddressChange,
        });
        expect(ticket.category).toBe(TicketCategory.corporate);
        expect(ticket.assigneeId).toBe(director.id);
        expect(ticket.status).toBe(TicketStatus.open);
      });
      it('throws error if multiple directors exist and no corporate secretary', async () => {
        const company = await Company.create({ name: 'test' });
        await User.create({
          name: 'Director 1',
          role: UserRole.director,
          companyId: company.id,
        });
        await User.create({
          name: 'Director 2',
          role: UserRole.director,
          companyId: company.id,
        });
        await expect(
          controller.create({
            companyId: company.id,
            type: TicketType.registrationAddressChange,
          }),
        ).rejects.toEqual(new ConflictException('Multiple directors found.'));
      });
    });
    describe('strikeOff', () => {
      it('creates strikeOff ticket and resolves other active tickets', async () => {
        const company = await Company.create({ name: 'test' });
        const accountant = await User.create({
          name: 'Test Accountant',
          role: UserRole.accountant,
          companyId: company.id,
        });
        const director = await User.create({
          name: 'Test Director',
          role: UserRole.director,
          companyId: company.id,
        });
        // Create some active tickets first
        const ticket1 = await controller.create({
          companyId: company.id,
          type: TicketType.managementReport,
        });
        // Create strikeOff ticket
        const strikeOffTicket = await controller.create({
          companyId: company.id,
          type: TicketType.strikeOff,
        });
        // Verify managementReport ticket
        expect(ticket1.category).toBe(TicketCategory.accounting);
        expect(ticket1.assigneeId).toBe(accountant.id);
        expect(ticket1.status).toBe(TicketStatus.open);
        // Verify strikeOff ticket
        expect(strikeOffTicket.category).toBe(TicketCategory.management);
        expect(strikeOffTicket.assigneeId).toBe(director.id);
        expect(strikeOffTicket.status).toBe(TicketStatus.open);
        // Verify other tickets are resolved
        const updatedTicket1 = await Ticket.findByPk(ticket1.id);
        expect(updatedTicket1?.status).toBe(TicketStatus.resolved);
      });
      it('throws error if multiple directors exist', async () => {
        const company = await Company.create({ name: 'test' });
        await User.create({
          name: 'Director 1',
          role: UserRole.director,
          companyId: company.id,
        });
        await User.create({
          name: 'Director 2',
          role: UserRole.director,
          companyId: company.id,
        });
        await expect(
          controller.create({
            companyId: company.id,
            type: TicketType.strikeOff,
          }),
        ).rejects.toEqual(new ConflictException('Multiple directors found.'));
      });
    });
  });
});
