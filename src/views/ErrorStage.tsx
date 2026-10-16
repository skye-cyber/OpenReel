import { ERROR_MEDIA } from '../data/mock';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { usePlayer } from '../state/PlayerContext';

export function ErrorState() {
    const { setView, toast } = usePlayer();
    return (
        <div className="p-3.5 flex flex-col gap-3.5 h-full min-h-0">
            <div className="flex-1 min-h-0 rounded-lg relative overflow-hidden bg-video border border-border
        shadow-[0_20px_50px_rgba(0,0,0,.45)]">
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-5
        bg-[rgba(8,9,11,.9)] p-7.5 text-center">
                    <Chip tone="err" icon="warn" style={{ height: 20, fontSize: 10.5 }}>Can't play</Chip>
                    <h3 className="text-[15px] font-[650] text-[#e9ebee] m-0">OpenReel can't play this file</h3>
                    <p className="text-[12.5px] text-[rgba(233,235,238,.55)] m-0 max-w-[46ch] leading-relaxed">
                        <b className="text-[#c8cdd3]">{ERROR_MEDIA.title}</b> — the video codec{' '}
                        <b className="text-[#c8cdd3]">vc1</b> isn't supported by the core player.
                    </p>
                    <div className="font-mono text-[11.5px] text-[rgba(233,235,238,.42)]">{ERROR_MEDIA.codec}</div>
                    <div className="flex gap-2.5 mt-2.5">
                        <Button variant="primary" size="sm" onClick={() => { setView('plugins'); toast('Filtered by codec plugins'); }}>
                            Find a plugin
                        </Button>
                        <Button size="sm">Open with system player</Button>
                        <Button size="sm">Copy details</Button>
                    </div>
                    <div className="font-mono text-[11.5px] text-[rgba(233,235,238,.42)] mt-3.5 max-w-[52ch] leading-relaxed">
                        Core supports MP4, MKV, WebM, MPEG-TS · H.264, VP9, AV1 (hardware-dependent) · MP3, AAC, FLAC, Vorbis, Opus
                    </div>
                </div>
            </div>
        </div>
    );
}
