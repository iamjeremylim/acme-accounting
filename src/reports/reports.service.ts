import { Injectable, Logger } from '@nestjs/common';
import { createReadStream, promises as fs } from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';
import { createInterface } from 'readline';
import { EventEmitter } from 'events';
import { ProcessState, ProcessScope } from './reports.types';

interface ProcessError extends Error {
  message: string;
}

@Injectable()
export class ReportsService {
  private readonly eventEmitter: EventEmitter;
  private readonly logger = new Logger(ReportsService.name);
  private states: Record<ProcessScope, ProcessState> = {
    accounts: { status: 'idle', progress: 0 },
    yearly: { status: 'idle', progress: 0 },
    fs: { status: 'idle', progress: 0 },
  };

  constructor() {
    this.eventEmitter = new EventEmitter();
  }

  state(scope: ProcessScope): ProcessState {
    return this.states[scope];
  }

  private updateState(scope: ProcessScope, update: Partial<ProcessState>) {
    this.states[scope] = { ...this.states[scope], ...update };
    this.eventEmitter.emit(`${scope}:stateUpdate`, this.states[scope]);
  }

  accounts(): Promise<ProcessState> {
    const scope: ProcessScope = 'accounts';
    if (this.states[scope].status === 'processing') {
      return Promise.resolve(this.states[scope]);
    }

    // Start background processing with error handling
    this.processAccountsInBackground().catch((error: Error) => {
      this.logger.error('Accounts report processing failed', {
        error: error.message,
        stack: error.stack,
      });
    });
    return Promise.resolve(this.states[scope]);
  }

  yearly(): Promise<ProcessState> {
    const scope: ProcessScope = 'yearly';
    if (this.states[scope].status === 'processing') {
      return Promise.resolve(this.states[scope]);
    }

    // Start background processing with error handling
    this.processYearlyInBackground().catch((error: Error) => {
      this.logger.error('Yearly report processing failed', {
        error: error.message,
        stack: error.stack,
      });
    });
    return Promise.resolve(this.states[scope]);
  }

  fs(): Promise<ProcessState> {
    const scope: ProcessScope = 'fs';
    if (this.states[scope].status === 'processing') {
      return Promise.resolve(this.states[scope]);
    }

    // Start background processing with error handling
    this.processFinancialStatementsInBackground().catch((error: Error) => {
      this.logger.error('Financial statements processing failed', {
        error: error.message,
        stack: error.stack,
      });
    });
    return Promise.resolve(this.states[scope]);
  }

  private async processAccountsInBackground() {
    const startTime = performance.now();
    const scope: ProcessScope = 'accounts';
    const tmpDir = 'tmp';
    const outputFile = 'out/accounts.csv';
    const accountBalances: Record<string, number> = {};

    try {
      this.updateState(scope, {
        status: 'processing',
        progress: 0,
        processedFiles: 0,
      });

      const files = (await fs.readdir(tmpDir)).filter((file) =>
        file.endsWith('.csv'),
      );
      this.updateState(scope, { totalFiles: files.length, processedFiles: 0 });

      for (const file of files) {
        const fileStream = createReadStream(path.join(tmpDir, file));
        const rl = createInterface({ input: fileStream });

        for await (const line of rl) {
          const [, account, , debit, credit] = line.split(',');
          if (!accountBalances[account]) {
            accountBalances[account] = 0;
          }
          accountBalances[account] +=
            parseFloat(String(debit || 0)) - parseFloat(String(credit || 0));
        }

        const currentProcessedFiles =
          (this.states[scope].processedFiles || 0) + 1;
        this.updateState(scope, {
          processedFiles: currentProcessedFiles,
          progress: (currentProcessedFiles / files.length) * 100,
        });
      }

      const output = ['Account,Balance'];
      for (const [account, balance] of Object.entries(accountBalances)) {
        output.push(`${account},${balance.toFixed(2)}`);
      }

      await fs.writeFile(outputFile, output.join('\n'));

      this.updateState(scope, {
        status: 'completed',
        duration: `finished in ${((performance.now() - startTime) / 1000).toFixed(2)}`,
        progress: 100,
      });
    } catch (error: unknown) {
      const processError = error as ProcessError;
      this.updateState(scope, {
        status: 'error',
        error:
          processError.message ||
          'An error occurred while processing accounts report',
      });
    }
  }

  private async processYearlyInBackground() {
    const startTime = performance.now();
    const scope: ProcessScope = 'yearly';
    const tmpDir = 'tmp';
    const outputFile = 'out/yearly.csv';
    const cashByYear: Record<string, number> = {};

    try {
      this.updateState(scope, {
        status: 'processing',
        progress: 0,
        processedFiles: 0,
      });

      const files = (await fs.readdir(tmpDir)).filter(
        (file) => file.endsWith('.csv') && file !== 'yearly.csv',
      );
      this.updateState(scope, { totalFiles: files.length, processedFiles: 0 });

      for (const file of files) {
        const fileStream = createReadStream(path.join(tmpDir, file));
        const rl = createInterface({ input: fileStream });

        for await (const line of rl) {
          const [date, account, , debit, credit] = line.split(',');
          if (account === 'Cash') {
            const year = new Date(date).getFullYear();
            if (!cashByYear[year]) {
              cashByYear[year] = 0;
            }
            cashByYear[year] +=
              parseFloat(String(debit || 0)) - parseFloat(String(credit || 0));
          }
        }

        const currentProcessedFiles =
          (this.states[scope].processedFiles || 0) + 1;
        this.updateState(scope, {
          processedFiles: currentProcessedFiles,
          progress: (currentProcessedFiles / files.length) * 100,
        });
      }

      const output = ['Financial Year,Cash Balance'];
      Object.keys(cashByYear)
        .sort()
        .forEach((year) => {
          output.push(`${year},${cashByYear[year].toFixed(2)}`);
        });

      await fs.writeFile(outputFile, output.join('\n'));

      this.updateState(scope, {
        status: 'completed',
        duration: `finished in ${((performance.now() - startTime) / 1000).toFixed(2)}`,
        progress: 100,
      });
    } catch (error: unknown) {
      const processError = error as ProcessError;
      this.updateState(scope, {
        status: 'error',
        error:
          processError.message ||
          'An error occurred while processing yearly report',
      });
    }
  }

  private async processFinancialStatementsInBackground() {
    const startTime = performance.now();
    const scope: ProcessScope = 'fs';
    const tmpDir = 'tmp';
    const outputFile = 'out/fs.csv';
    const categories = {
      'Income Statement': {
        Revenues: ['Sales Revenue'],
        Expenses: [
          'Cost of Goods Sold',
          'Salaries Expense',
          'Rent Expense',
          'Utilities Expense',
          'Interest Expense',
          'Tax Expense',
        ],
      },
      'Balance Sheet': {
        Assets: [
          'Cash',
          'Accounts Receivable',
          'Inventory',
          'Fixed Assets',
          'Prepaid Expenses',
        ],
        Liabilities: [
          'Accounts Payable',
          'Loan Payable',
          'Sales Tax Payable',
          'Accrued Liabilities',
          'Unearned Revenue',
          'Dividends Payable',
        ],
        Equity: ['Common Stock', 'Retained Earnings'],
      },
    };

    try {
      this.updateState(scope, {
        status: 'processing',
        progress: 0,
        processedFiles: 0,
      });

      const balances: Record<string, number> = {};
      for (const section of Object.values(categories)) {
        for (const group of Object.values(section)) {
          for (const account of group) {
            balances[account] = 0;
          }
        }
      }

      const files = (await fs.readdir(tmpDir)).filter(
        (file) => file.endsWith('.csv') && file !== 'fs.csv',
      );
      this.updateState(scope, { totalFiles: files.length, processedFiles: 0 });

      for (const file of files) {
        const fileStream = createReadStream(path.join(tmpDir, file));
        const rl = createInterface({ input: fileStream });

        for await (const line of rl) {
          const [, account, , debit, credit] = line.split(',');
          if (account in balances) {
            balances[account] +=
              parseFloat(String(debit || 0)) - parseFloat(String(credit || 0));
          }
        }

        const currentProcessedFiles =
          (this.states[scope].processedFiles || 0) + 1;
        this.updateState(scope, {
          processedFiles: currentProcessedFiles,
          progress: (currentProcessedFiles / files.length) * 100,
        });
      }

      const output: string[] = [];
      output.push('Basic Financial Statement');
      output.push('');
      output.push('Income Statement');

      let totalRevenue = 0;
      let totalExpenses = 0;

      for (const account of categories['Income Statement']['Revenues']) {
        const value = balances[account] || 0;
        output.push(`${account},${value.toFixed(2)}`);
        totalRevenue += value;
      }

      for (const account of categories['Income Statement']['Expenses']) {
        const value = balances[account] || 0;
        output.push(`${account},${value.toFixed(2)}`);
        totalExpenses += value;
      }

      const netIncome = totalRevenue - totalExpenses;
      output.push(`Net Income,${netIncome.toFixed(2)}`);
      output.push('');
      output.push('Balance Sheet');

      let totalAssets = 0;
      let totalLiabilities = 0;
      let totalEquity = 0;

      output.push('Assets');
      for (const account of categories['Balance Sheet']['Assets']) {
        const value = balances[account] || 0;
        output.push(`${account},${value.toFixed(2)}`);
        totalAssets += value;
      }
      output.push(`Total Assets,${totalAssets.toFixed(2)}`);
      output.push('');

      output.push('Liabilities');
      for (const account of categories['Balance Sheet']['Liabilities']) {
        const value = balances[account] || 0;
        output.push(`${account},${value.toFixed(2)}`);
        totalLiabilities += value;
      }
      output.push(`Total Liabilities,${totalLiabilities.toFixed(2)}`);
      output.push('');

      output.push('Equity');
      for (const account of categories['Balance Sheet']['Equity']) {
        const value = balances[account] || 0;
        output.push(`${account},${value.toFixed(2)}`);
        totalEquity += value;
      }

      output.push(`Retained Earnings (Net Income),${netIncome.toFixed(2)}`);
      totalEquity += netIncome;
      output.push(`Total Equity,${totalEquity.toFixed(2)}`);
      output.push('');
      output.push(
        `Assets = Liabilities + Equity, ${totalAssets.toFixed(2)} = ${(
          totalLiabilities + totalEquity
        ).toFixed(2)}`,
      );

      await fs.writeFile(outputFile, output.join('\n'));

      this.updateState(scope, {
        status: 'completed',
        duration: `finished in ${((performance.now() - startTime) / 1000).toFixed(2)}`,
        progress: 100,
      });
    } catch (error: unknown) {
      const processError = error as ProcessError;
      this.updateState(scope, {
        status: 'error',
        error:
          processError.message ||
          'An error occurred while processing financial statements report',
      });
    }
  }
}
