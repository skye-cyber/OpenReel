import { invoke, Channel } from '@tauri-apps/api/core';
import { isTauri } from './system/shared';

export interface TranscodeProgress {
  processedSeconds: number;
  totalSeconds: number;
  percent: number;
  speed: number;
}

export interface TranscodeResult {
  outputPath: string;
  duration: number;
  cached: boolean;
}

export async function prepareTranscode(
  path: string,
  onProgress: (p: TranscodeProgress) => void,
): Promise<TranscodeResult> {
  if (!isTauri) {
    throw new Error('Transcode requires the desktop build');
  }

  const channel = new Channel<TranscodeProgress>();
  channel.onmessage = (msg) => onProgress(msg);

  return invoke<TranscodeResult>('prepare_transcode', {
    path,
    onProgress: channel,
  });
}
