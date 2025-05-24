import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { EventEmitter } from 'events';
import { ProcessState } from './reports.types';

type MockedFs = {
  promises: {
    readdir: jest.Mock;
    writeFile: jest.Mock;
  };
  createReadStream: jest.Mock;
};

jest.mock('fs', () => ({
  promises: {
    readdir: jest.fn(),
    writeFile: jest.fn(),
  },
  createReadStream: jest.fn(),
}));

jest.mock('readline', () => ({
  createInterface: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    [Symbol.asyncIterator]: () => ({
      next: jest.fn().mockResolvedValue({ done: true, value: undefined }),
    }),
  })),
}));

const mockFs = jest.requireMock<MockedFs>('fs');

// Helper function to wait for background processing
const waitForProcessing = (ms = 50) =>
  new Promise((resolve) => setTimeout(resolve, ms));

describe('ReportsService', () => {
  let service: ReportsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReportsService],
      controllers: [ReportsController],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('file processing', () => {
    describe('accounts report', () => {
      it('should not start processing if already processing', async () => {
        // Set up initial state
        const initialState = service.state('accounts');
        expect(initialState.status).toBe('idle');

        // Mock fs.readdir
        mockFs.promises.readdir.mockResolvedValue(['file1.csv']);

        // Start first processing
        const firstCallPromise = service.accounts();

        // Verify state is now processing
        expect(service.state('accounts').status).toBe('processing');

        // Try second call while processing
        const secondCallPromise = service.accounts();

        // Both calls should resolve to the same state
        const [firstResult, secondResult] = await Promise.all([
          firstCallPromise,
          secondCallPromise,
        ]);

        expect(firstResult.status).toBe('processing');
        expect(secondResult).toEqual(firstResult);
        expect(mockFs.promises.readdir).toHaveBeenCalledTimes(1);
      });

      it('should start processing with correct initial state', async () => {
        const mockFiles = ['file1.csv', 'file2.csv'];
        mockFs.promises.readdir.mockResolvedValue(mockFiles);

        const result = await service.accounts();

        expect(result.status).toBe('processing');
        expect(result.progress).toBe(0);
        expect(mockFs.promises.readdir).toHaveBeenCalledWith('tmp');

        const finalState = service.state('accounts');
        expect(finalState.totalFiles).toBe(2);
      });

      it('should update progress during processing', async () => {
        mockFs.promises.readdir.mockResolvedValue(['file1.csv', 'file2.csv']);
        await service.accounts();

        const state = service.state('accounts');
        expect(state.progress).toBeGreaterThanOrEqual(0);
        expect(state.progress).toBeLessThanOrEqual(100);
      });

      it('should complete processing successfully', async () => {
        const mockReadStream = new EventEmitter();
        mockFs.createReadStream.mockReturnValue(mockReadStream);
        mockFs.promises.readdir.mockResolvedValue(['test.csv']);
        mockFs.promises.writeFile.mockResolvedValue(undefined);

        const processPromise = service.accounts();

        // Simulate file completion
        mockReadStream.emit('line', 'date,Cash,description,100,0');
        mockReadStream.emit('close');

        await processPromise;
        await waitForProcessing();

        const state = service.state('accounts');
        expect(state.status).toBe('completed');
        expect(state.progress).toBe(100);
      });
    });

    describe('yearly report', () => {
      it('should not start processing if already processing', async () => {
        // Set up initial state
        const initialState = service.state('yearly');
        expect(initialState.status).toBe('idle');

        // Mock fs.readdir
        mockFs.promises.readdir.mockResolvedValue(['file1.csv']);

        // Start first processing
        const firstCallPromise = service.yearly();

        // Verify state is now processing
        expect(service.state('yearly').status).toBe('processing');

        // Try second call while processing
        const secondCallPromise = service.yearly();

        // Both calls should resolve to the same state
        const [firstResult, secondResult] = await Promise.all([
          firstCallPromise,
          secondCallPromise,
        ]);

        expect(firstResult.status).toBe('processing');
        expect(secondResult).toEqual(firstResult);
        expect(mockFs.promises.readdir).toHaveBeenCalledTimes(1);
      });

      it('should start processing with correct initial state', async () => {
        const mockFiles = ['file1.csv', 'file2.csv'];
        mockFs.promises.readdir.mockResolvedValue(mockFiles);

        const result = await service.yearly();

        expect(result.status).toBe('processing');
        expect(result.progress).toBe(0);
        expect(mockFs.promises.readdir).toHaveBeenCalledWith('tmp');

        const finalState = service.state('yearly');
        expect(finalState.totalFiles).toBe(2);
      });
    });

    describe('financial statements', () => {
      it('should not start processing if already processing', async () => {
        // Set up initial state
        const initialState = service.state('fs');
        expect(initialState.status).toBe('idle');

        // Mock fs.readdir
        mockFs.promises.readdir.mockResolvedValue(['file1.csv']);

        // Start first processing
        const firstCallPromise = service.fs();

        // Verify state is now processing
        expect(service.state('fs').status).toBe('processing');

        // Try second call while processing
        const secondCallPromise = service.fs();

        // Both calls should resolve to the same state
        const [firstResult, secondResult] = await Promise.all([
          firstCallPromise,
          secondCallPromise,
        ]);

        expect(firstResult.status).toBe('processing');
        expect(secondResult).toEqual(firstResult);
        expect(mockFs.promises.readdir).toHaveBeenCalledTimes(1);
      });

      it('should start processing with correct initial state', async () => {
        const mockFiles = ['file1.csv', 'file2.csv'];
        mockFs.promises.readdir.mockResolvedValue(mockFiles);

        const result = await service.fs();

        expect(result.status).toBe('processing');
        expect(result.progress).toBe(0);
        expect(mockFs.promises.readdir).toHaveBeenCalledWith('tmp');

        const finalState = service.state('fs');
        expect(finalState.totalFiles).toBe(2);
      });
    });
  });

  describe('error handling', () => {
    it('should handle file system errors', async () => {
      const error = new Error('File system error');
      mockFs.promises.readdir.mockRejectedValue(error);

      await service.accounts();

      const state = service.state('accounts');
      expect(state.status).toBe('error');
      expect(state.error).toBeDefined();
    });

    it('should handle empty directory', async () => {
      mockFs.promises.readdir.mockResolvedValue([]);

      await service.accounts();

      const state = service.state('accounts');
      expect(state.totalFiles).toBe(0);
    });

    it('should handle writeFile errors', async () => {
      const mockReadStream = new EventEmitter();
      mockFs.createReadStream.mockReturnValue(mockReadStream);
      mockFs.promises.readdir.mockResolvedValue(['test.csv']);
      mockFs.promises.writeFile.mockRejectedValue(new Error('Write error'));

      const processPromise = service.accounts();

      // Simulate file data and completion
      mockReadStream.emit('line', 'date,Cash,description,100,0');
      mockReadStream.emit('close');

      await processPromise;
      await waitForProcessing();

      const state = service.state('accounts');
      expect(state.status).toBe('error');
      expect(state.error).toContain('Write error');
    });

    it('should handle malformed CSV data', async () => {
      const mockReadStream = new EventEmitter();
      mockFs.createReadStream.mockReturnValue(mockReadStream);
      mockFs.promises.readdir.mockResolvedValue(['test.csv']);

      const processPromise = service.accounts();

      // Simulate malformed data
      mockReadStream.emit('data', 'invalid,csv,format\n');
      mockReadStream.emit('end');

      await processPromise;
      await waitForProcessing();

      const state = service.state('accounts');
      expect(state.status).toBe('error');
    });
  });

  describe('event emitter', () => {
    it('should emit state updates when processing starts', async () => {
      // Create a Promise that resolves when the state update is emitted
      const stateUpdatePromise = new Promise<ProcessState>((resolve) => {
        service['eventEmitter'].once('accounts:stateUpdate', resolve);
      });

      // Start processing
      await service.accounts();

      // Wait for and verify the state update
      const state = await stateUpdatePromise;
      expect(state.status).toBe('processing');
    });
  });
});
