import { useEffect, useState } from 'react';
import Icon from '../../lib/Icons';
import { usePlayer } from '../../hooks/player';
import { Bar } from './Bar';
import { IconButton } from '../Button';
import { Menu, MenuHead, MenuItem, MenuSep } from '../Menu';
import { fmt } from '../../lib/format';
import { AdvancedRow } from '../Transport/Row';
import { Pill } from './Pill';
import type { SubtitleTrackInfo, AudioTrackInfo } from '../../types/mkvSource';

type OpenMenu = 'speed' | 'audio' | 'subs' | null;

const FALLBACK_AUDIO_TRACKS = [
    { streamIndex: 0, language: 'English', title: 'English' },
    { streamIndex: 1, language: 'German', title: 'German' },
    { streamIndex: 2, language: 'Commentary', title: 'Commentary' },
] as any as AudioTrackInfo[];

const FALLBACK_SUB_TRACKS = [
    { streamIndex: 0, language: 'English', title: 'English', format: 'SRT · embedded', cues: [] },
    { streamIndex: 1, language: 'German', title: 'German', format: 'SRT · embedded', cues: [] },
    { streamIndex: 2, language: 'English (forced)', title: 'English (forced)', format: 'ASS · embedded', cues: [] },
] as any as SubtitleTrackInfo[];

export function Transport() {
    const p = usePlayer();
    const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
    const AUDIO_TRACKS = p.audioTracks //?? FALLBACK_AUDIO_TRACKS;
    const SUB_TRACKS = p.subtitleTracks //?? FALLBACK_SUB_TRACKS;
    const dur = p.media?.dur ?? 0;
    const [windowWidth, setWindowWidth] = useState<number>()
    const toggle = (name: Exclude<OpenMenu, null>) =>
        setOpenMenu(prev => (prev === name ? null : name));

    useEffect(() => {
        setWindowWidth(window.innerWidth)
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div className="shrink-0 bg-surface border-t border-border relative z-50">
            {p.advanced && <AdvancedRow />}

            <div className="flex items-center gap-4 h-[66px] px-[18px]">
                <div className="flex items-center gap-0.5 shrink-0">
                    <IconButton onClick={() => p.prevItem()} icon="prev" size={18} big disabled={!p.hasMedia} title="Previous" />
                    <IconButton onClick={() => p.seekBy(-10)} icon="back10" size={18} big disabled={!p.hasMedia} title="Back 10 seconds" />
                    <button
                        type="button"
                        disabled={!p.hasMedia}
                        onClick={() => p.setPlayingAnnounced(!p.playing)}
                        aria-label={p.playing ? 'Pause' : 'Play'}
                        className="w-10 h-10 rounded-full bg-accent text-[#1a0f08] flex items-center justify-center mx-1.5 transition-[background,transform] shadow-[0_2px_12px_rgba(232,135,90,.28)] hover:bg-accent-hi active:scale-[.94] disabled:bg-surface-3 disabled:text-text-3 disabled:shadow-none disabled:pointer-events-none"
                    >
                        <Icon name={p.playing ? 'pause' : 'play'} size={19} />
                    </button>
                    <IconButton onClick={() => p.seekBy(10)} icon="fwd10" size={18} big disabled={!p.hasMedia} title="Forward 10 seconds" />
                    <IconButton onClick={() => p.nextItem()} icon="next" size={18} big disabled={!p.hasMedia} title="Next" />
                </div>

                <div className="flex-1 min-w-[180px] flex items-center gap-3">
                    <span className="text-[11.5px] text-text-2 font-[550] tabular-nums min-w-[38px]">
                        {fmt(p.pos * dur)}
                    </span>
                    <Bar value={p.pos} onChange={p.seekTo} buffered={p.buffered} />
                    <span className="text-[11.5px] text-text-3 font-[550] tabular-nums min-w-[38px] text-right">
                        {p.media ? fmt(dur) : '0:00'}
                    </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                    <div className="flex items-center gap-1 pr-1.5">
                        <IconButton
                            icon={p.muted ? 'volMute' : 'vol'}
                            onClick={() => p.setMutedAnnounced(!p.muted)}
                            title={p.muted ? 'Unmute' : 'Mute'}
                        />
                        <Bar mini value={p.muted ? 0 : p.vol} onChange={v => { p.setVol(v); p.setMutedAnnounced(false); }} style={{ width: 66, flex: 'none' }} />
                    </div>

                    {/* Speed */}
                    <div className="relative inline-flex">
                        <button
                            type="button"
                            onClick={() => toggle('speed')}
                            className="h-7 px-2.5 rounded-sm border border-border-2 bg-surface text-[11.5px] text-text-2 transition-colors hover:bg-hover hover:text-text hover:border-border-3"
                        >
                            {p.speed === 1 ? '1×' : p.speed + '×'}
                        </button>
                        <Menu open={openMenu === 'speed'} onClose={() => setOpenMenu(null)}>
                            <MenuHead>Playback speed</MenuHead>
                            {[0.5, 0.75, 1, 1.25, 1.5, 2].map(s => (
                                <MenuItem
                                    key={s}
                                    tick={p.speed === s}
                                    onClick={() => { p.setSpeedAnnounced(s); setOpenMenu(null); p.toast(`Speed ${s}× — Undo`); }}
                                >
                                    {s}×
                                </MenuItem>
                            ))}
                            <MenuSep />
                            <MenuItem onClick={() => { p.setSpeedAnnounced(1); setOpenMenu(null); }} sub="Backspace">
                                Reset to normal
                            </MenuItem>
                        </Menu>
                    </div>

                    {/* Audio track */}
                    <div className="relative inline-flex">
                        <IconButton
                            icon="audio"
                            active={openMenu === 'audio'}
                            disabled={!p.hasMedia}
                            title="Audio track"
                            onClick={() => toggle('audio')}
                        />
                        <Menu className='h-fit max-h-80 overflow-y-auto' open={openMenu === 'audio'} onClose={() => setOpenMenu(null)}>
                            <MenuHead>Audio track</MenuHead>
                            {AUDIO_TRACKS && AUDIO_TRACKS?.map(t => (
                                <MenuItem
                                    key={t.streamIndex}
                                    tick={p.audioTrack === t.streamIndex}
                                    sub={t.title as string}
                                    onClick={() => {
                                        p.setAudioTrackAnnounced(t.streamIndex);
                                        setOpenMenu(null);
                                        p.toast(`Audio: ${t.language} — Undo`);
                                    }}
                                >
                                    {t.language}
                                </MenuItem>
                            ))}
                        </Menu>
                    </div>

                    {/* Subtitles */}
                    <div className="relative inline-flex">
                        <IconButton
                            icon="cc"
                            active={openMenu === 'subs' || p.subTrack >= 0}
                            disabled={!p.hasMedia}
                            title="Subtitles"
                            onClick={() => toggle('subs')}
                        />
                        <Menu className='h-fit max-h-80 overflow-y-auto' open={openMenu === 'subs'} onClose={() => setOpenMenu(null)}>
                            <MenuHead>Subtitles</MenuHead>
                            <MenuItem tick={p.subTrack === -1} onClick={() => { p.setSubTrackAnnounced(-1); setOpenMenu(null); }}>
                                Off
                            </MenuItem>
                            <MenuSep />
                            {SUB_TRACKS && SUB_TRACKS?.map(t => (
                                <MenuItem
                                    key={t.streamIndex}
                                    tick={p.subTrack === t.streamIndex}
                                    sub={t.title as string}
                                    onClick={() => {
                                        p.setAudioTrackAnnounced(t.streamIndex);
                                        setOpenMenu(null);
                                        p.toast(`Audio: ${t.language} — Undo`);
                                    }}
                                >
                                    {t.language}
                                </MenuItem>
                            ))}
                            <MenuSep />
                            <MenuItem onClick={() => setOpenMenu(null)}>Load subtitle file…</MenuItem>
                            <MenuItem disabled sub="Plugin required">Search online…</MenuItem>
                        </Menu>
                    </div>

                    <IconButton
                        icon="queue"
                        active={p.queueOpen}
                        title="Queue"
                        onClick={() => p.setQueueOpen(!p.queueOpen)}
                    />
                    <IconButton
                        icon="full"
                        disabled={!p.hasMedia}
                        title={p.fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                        onClick={p.toggleFullscreen}
                    />
                    <IconButton
                        icon={p.advanced ? 'chevDown' : 'chevUp'}
                        active={p.advanced}
                        title="More controls"
                        onClick={() => p.setAdvanced(!p.advanced)}
                    />
                    <Pill
                        label={(windowWidth && windowWidth > 900) ? "Media info" : 'Info'}
                        onClick={() => p.setMediaInfoOpen(!p.mediaInfoOpen)}
                        active={p.mediaInfoOpen}
                    />
                </div>
            </div>
        </div>
    );
}
