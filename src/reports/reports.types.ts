export interface ProcessState {
  status: 'idle' | 'processing' | 'completed' | 'error';
  startTime?: number;
  endTime?: number;
  duration?: number;
  progress: number;
  error?: string;
  totalFiles?: number;
  processedFiles?: number;
}

export type ProcessScope = 'accounts' | 'yearly' | 'fs';
