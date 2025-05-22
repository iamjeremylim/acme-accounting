import { Controller, Get, Post, HttpCode } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ProcessState } from './reports.types';

@Controller('api/v1/reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get()
  report(): Record<string, ProcessState> {
    return {
      'accounts.csv': this.reportsService.state('accounts'),
      'yearly.csv': this.reportsService.state('yearly'),
      'fs.csv': this.reportsService.state('fs'),
    };
  }

  @Post()
  @HttpCode(201)
  async generate() {
    await Promise.all([
      this.reportsService.accounts(),
      this.reportsService.yearly(),
      this.reportsService.fs(),
    ]);
    return { message: 'finished' };
  }
}
