export interface ProcessState {
  status: 'idle' | 'processing' | 'completed' | 'error';
  duration?: string;
  progress: number;
  error?: string;
  totalFiles?: number;
  processedFiles?: number;
}

export type ProcessScope = 'accounts' | 'yearly' | 'fs';
