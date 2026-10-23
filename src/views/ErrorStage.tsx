import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { usePlayer } from '../hooks/player';
import type { ErrorMedia, ErrorReason } from '../types';

interface ReasonConfig {
    icon: 'warn' | 'alert' | 'wifiOff' | 'lock' | 'volume' | 'film' | 'plug';
    heading: string;
    body: (media: ErrorMedia) => string;
    primary?: { label: string; action: 'plugin' | 'locate' | 'play-anyway' | 'sound-settings' | 'try-software' | 'disable-plugin' };
    secondary?: { label: string; action: 'system-player' | 'copy-details' | 'cancel' };
}

const CONFIG: Record<ErrorReason, ReasonConfig> = {
    'unsupported-codec': {
        icon: 'warn',
        heading: "OpenReel can't play this file",
        body: m => `${m.title} — the video codec ${m.detail ?? 'vc1'} isn't supported by the core player.`,
        primary: { label: 'Find a plugin', action: 'plugin' },
        secondary: { label: 'Open with system player', action: 'system-player' },
    },
    'file-missing': {
        icon: 'warn',
        heading: 'File not found',
        body: m => `${m.title} is no longer at the location OpenReel remembers.`,
        primary: { label: 'Locate…', action: 'locate' },
        secondary: { label: 'Copy details', action: 'copy-details' },
    },
    'permission-denied': {
        icon: 'lock',
        heading: "OpenReel doesn't have permission",
        body: m => `The operating system refused access to ${m.title}.`,
        primary: { label: 'Locate…', action: 'locate' },
        secondary: { label: 'Copy details', action: 'copy-details' },
    },
    'corrupt-file': {
        icon: 'alert',
        heading: 'This file looks incomplete',
        body: m => `${m.title} — playback may stop early.`,
        primary: { label: 'Play anyway', action: 'play-anyway' },
        secondary: { label: 'Cancel', action: 'cancel' },
    },
    'no-audio-device': {
        icon: 'volume',
        heading: 'No audio output device',
        body: () => 'Playback continues without sound. Connect an output device or check your system sound settings.',
        primary: { label: 'Open sound settings', action: 'sound-settings' },
        secondary: { label: 'Cancel', action: 'cancel' },
    },
    'video-output-failure': {
        icon: 'film',
        heading: 'Video output failed',
        body: () => 'OpenReel switched to software rendering for this file.',
        primary: { label: 'Try hardware again', action: 'try-software' },
        secondary: { label: 'Cancel', action: 'cancel' },
    },
    'plugin-crashed': {
        icon: 'plug',
        heading: 'A plugin stopped responding',
        body: m => `${m.pluginName ?? 'A plugin'} caused an error. Playback continues without it.`,
        primary: { label: 'Disable plugin', action: 'disable-plugin' },
        secondary: { label: 'Copy details', action: 'copy-details' },
    },
};

export default function ErrorStage({ media }: { media: ErrorMedia }) {
    const { setView, toast, setMedia, setPluginEnabled } = usePlayer();

    const cfg = CONFIG[media.reason] ?? CONFIG['unsupported-codec'];

    const runPrimary = () => {
        switch (cfg.primary?.action) {
            case 'plugin':
                setView('plugins');
                toast('Filtered by codec plugins');
                break;
            case 'locate':
                toast('File chooser is not implemented yet');
                break;
            case 'play-anyway':
                toast('Playing anyway — some content may be missing');
                break;
            case 'sound-settings':
                toast('Opened system sound settings');
                break;
            case 'try-software':
                toast('Retrying with software rendering');
                break;
            case 'disable-plugin':
                if (media.pluginName) {
                    setPluginEnabled(media.pluginName, false);
                    toast(`Disabled ${media.pluginName}`);
                }
                setMedia(null);
                break;
        }
    };

    const runSecondary = () => {
        switch (cfg.secondary?.action) {
            case 'system-player':
                toast('Opened with system player');
                break;
            case 'copy-details':
                navigator.clipboard?.writeText(
                    `${media.reason}\n${media.title}\n${media.detail ?? ''}\n${media.codec}`
                ).catch(() => { });
                toast('Details copied');
                break;
            case 'cancel':
                setMedia(null);
                break;
        }
    };

    return (
        <div className="p-3.5 flex flex-col gap-3.5 h-full min-h-0 select-none">
            <div className="flex-1 min-h-0 rounded-lg relative overflow-hidden bg-video border border-border
        shadow-[0_20px_50px_rgba(0,0,0,.45)]">
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-5
        bg-[rgba(8,9,11,.9)] p-7.5 text-center">
                    <Chip tone="err" icon={cfg.icon === 'warn' ? 'warn' : 'alert'} style={{ height: 20, fontSize: 10.5 }}>
                        Can't play
                    </Chip>
                    <h3 className="text-[15px] font-[650] text-[#e9ebee] m-0">{cfg.heading}</h3>
                    <p className="text-[12.5px] text-[rgba(233,235,238,.55)] m-0 max-w-[46ch] leading-relaxed">
                        {cfg.body(media)}
                    </p>
                    {media.codec && (
                        <div className="font-mono text-[11.5px] text-[rgba(233,235,238,.42)]">{media.codec}</div>
                    )}
                    <div className="flex gap-2.5 mt-2.5 flex-wrap justify-center">
                        {cfg.primary && (
                            <Button variant="primary" size="sm" onClick={runPrimary}>
                                {cfg.primary.label}
                            </Button>
                        )}
                        {cfg.secondary && (
                            <Button size="sm" onClick={runSecondary}>
                                {cfg.secondary.label}
                            </Button>
                        )}
                        <Button size="sm" onClick={() => setMedia(null)}>
                            Close
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
