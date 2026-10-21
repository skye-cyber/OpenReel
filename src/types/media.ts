// src/types/mediaProbe.ts
export interface VideoStream {
  index: number;
  codec: string;
  profile: string;
  level: number;
  width: number;
  height: number;
  displayAspectRatio: string;
  pixFmt: string;
  bitDepth: number | null;
  frameRate: number;
  avgFrameRate: number;
  bitRate: number;
  colorSpace: string;
  colorTransfer: string;
  colorPrimaries: string;
  language: string | null;
  title: string | null;
  isDefault: boolean;
  isAttachedPic: boolean;
}

export interface AudioStream {
  index: number;
  codec: string;
  profile: string;
  sampleRate: number;
  channels: number;
  channelLayout: string;
  bitRate: number;
  bitDepth: number | null;
  language: string | null;
  title: string | null;
  isDefault: boolean;
}

export interface SubtitleStream {
  index: number;
  codec: string;
  language: string | null;
  title: string | null;
  isDefault: boolean;
  isForced: boolean;
}

export interface Chapter {
  id: number;
  startSeconds: number;
  endSeconds: number;
  title: string;
}

export interface MediaProbe {
  formatName: string;
  formatLongName: string;
  duration: number;
  sizeBytes: number;
  bitRate: number;
  nbStreams: number;
  hasVideo: boolean;
  hasAudio: boolean;
  hasSubtitles: boolean;
  videoStreams: VideoStream[];
  audioStreams: AudioStream[];
  subtitleStreams: SubtitleStream[];
  chapters: Chapter[];
  tags: Record<string, string>;
}
