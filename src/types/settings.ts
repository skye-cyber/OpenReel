import type { IconName } from "../types";

export type Cat =
    | 'playback' | 'video' | 'audio' | 'subtitles' | 'appearance'
    | 'library' | 'plugins' | 'advanced' | 'privacy';

export type Hw = 'auto' | 'off';
export type Deint = 'auto' | 'on' | 'off';
export type Snap = 'png' | 'jpeg' | 'webp';
export type Density = 'comfortable' | 'compact';
export type ResumeMode = 'off' | 'per-item' | 'always';

export interface CatDef { id: Cat; l: string; icon: IconName }

export interface RowProps {
    title: string;
    desc: string;
    control: React.ReactNode;
    changed?: boolean;
}
