import type { IconName } from '../types';

/* ============================================================
 *  Categories (navigation)
 *  ============================================================ */
export type Cat =
    | 'playback' | 'video' | 'audio' | 'subtitles' | 'appearance'
    | 'library' | 'plugins' | 'advanced' | 'privacy';

export interface CatDef {
    id: Cat;
    l: string;
    icon: IconName;
}

/* ============================================================
 *  Value types
 *  ============================================================ */
export type Hw = 'auto' | 'off';
export type Deint = 'auto' | 'on' | 'off';
export type Snap = 'png' | 'jpeg' | 'webp';
export type Density = 'comfortable' | 'compact';
export type ResumeMode = 'off' | 'per-item' | 'always';
export type Aspect = 'fit' | 'fill' | 'stretch';
export type MotionPref = 'system' | 'on' | 'off';
export type LogLevel = 'error' | 'warn' | 'info' | 'debug';
export type SeekStep = 5 | 10 | 30;
export type ResumeThreshold = 5 | 30 | 120;

export interface SubtitleStyle {
    fontFamily: string;             // reserved for future use; 'system' for now
    fontSize: number;               // px
    fontWeight: 'regular' | 'medium' | 'bold';
    color: 'white' | 'yellow' | 'cyan' | 'green' | 'magenta' | 'red' | 'black';
    outline: 'none' | 'thin' | 'medium' | 'thick';
    background: 'none' | 'subtle' | 'solid';
    positionFromBottom: number;     // percentage of viewport height
}

/* ============================================================
 *  Settings shape
 *  ============================================================ */
export interface Settings {
    /* Playback */
    resumeEnabled: boolean;
    resumeThreshold: ResumeThreshold;
    autoplayNext: boolean;
    previousRestartsCurrent: boolean;
    coarseSeekStep: SeekStep;

    /* Video */
    hardwareDecoding: Hw;
    deinterlace: Deint;
    defaultAspect: Aspect;
    snapshotFormat: Snap;

    /* Subtitles — new */
    useSystemCaptionStyle: boolean;
    subtitleStyle: SubtitleStyle;

    /* Appearance */
    density: Density;
    reducedMotion: MotionPref;
    showStatusStrip: boolean;

    /* Library */
    watchFolders: boolean;
    generateThumbnails: boolean;

    /* Plugins */
    pluginsEnabled: boolean;
    pluginUpdateChecks: boolean;

    /* Advanced */
    logLevel: LogLevel;

    /* Privacy */
    updateCheck: boolean;
    pluginNetwork: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
    resumeEnabled: true,
    resumeThreshold: 30,
    autoplayNext: true,
    previousRestartsCurrent: true,
    coarseSeekStep: 10,

    hardwareDecoding: 'auto',
    deinterlace: 'off',
    defaultAspect: 'fit',
    snapshotFormat: 'jpeg',

    useSystemCaptionStyle: true,
    subtitleStyle: {
        fontFamily: 'system',
        fontSize: 18,
        fontWeight: 'medium',
        color: 'white',
        outline: 'medium',
        background: 'subtle',
        positionFromBottom: 8,
    },

    density: 'comfortable',
    reducedMotion: 'system',
    showStatusStrip: true,

    watchFolders: true,
    generateThumbnails: true,

    pluginsEnabled: true,
    pluginUpdateChecks: true,

    logLevel: 'info',

    updateCheck: true,
    pluginNetwork: true,
};
export type SettingKey = keyof Settings;

/* ============================================================
 *  Row props (unchanged)
 *  ============================================================ */
export interface RowProps {
    title: string;
    desc: string;
    control: React.ReactNode;
    changed?: boolean;
    onReset?: () => void;
}
