import Icon from '../lib/Icons';
import { Button } from '../components/Button';
import { usePlayer } from '../hooks/player';
import { mediaFromPath } from '../helpers/herpers';
import { PlatformTools } from '../lib/platform/system/tools';

export function EmptyState() {
    const { playMedia, recentIds, clearRecents, toast, setUrlDialogOpen } = usePlayer();

    const handlePlayRecent = async (id: string) => {
        try {
            const media = await mediaFromPath(id);
            playMedia(media);
        } catch {
            toast(`Couldn't open ${id}`, 'err');
        }
    };

    return (
        <div className="min-h-full flex flex-col items-center justify-center p-12 px-6 relative
        before:content-[''] before:absolute before:inset-0 before:pointer-events-none
        before:bg-[radial-gradient(520px_300px_at_50%_32%,var(--color-accent-soft),transparent_72%)]">
            <div className="relative flex flex-col items-center">
                <div className="w-16.5 h-16.5 rounded-[20px] flex items-center justify-center bg-surface border border-border-2 text-text-3 mb-5 shadow-sm">
                    <Icon name="disc" size={28} weight={1.5} />
                </div>
                <h2 className="text-[17px] font-[650] mb-1.5 tracking-[-.01em]">Nothing playing</h2>
                <p className="text-[12.5px] text-text-3 mb-5 max-w-[44ch] text-center">
                    Open a file, drop one here, or paste a stream URL.
                </p>

                <div className="flex gap-2.5 mb-8">
                    <Button variant="primary" icon="folder" onClick={async () => {
                        const path = await PlatformTools.pickFile();
                        if (path) {
                            playMedia(await mediaFromPath(path));
                        }
                    }}
                    >Open File…</Button>
                    <Button icon="link" onClick={() => setUrlDialogOpen(true)}>Open URL…</Button>
                </div>

                {recentIds.length > 0 && (
                    <div className="w-full max-w-[480px]">
                        <div className="flex items-center justify-between mb-2.5">
                            <span className="text-[10px] font-bold tracking-[.09em] uppercase text-text-3">Recent</span>
                            <button
                                onClick={clearRecents}
                                className="text-[11px] text-text-2 hover:text-text"
                            >
                                Clear list
                            </button>
                        </div>
                        {recentIds.map(id => {
                            const filename = id.split(/[\\/]/).pop() ?? id;
                            const folder = id.slice(0, id.length - filename.length - 1);
                            const isAudio = /\.(mp3|flac|wav|m4a|aac|ogg|opus|wma)$/i.test(filename);
                            return (
                                <div
                                    key={id}
                                    onClick={() => void handlePlayRecent(id)}
                                    className="flex items-center gap-2.5 p-[8px_11px] rounded-md cursor-pointer transition-colors hover:bg-surface"
                                >
                                    <div className="w-7.5 h-7.5 rounded-sm bg-surface-2 border border-border flex items-center justify-center text-text-3 shrink-0">
                                        <Icon name={isAudio ? 'music' : 'film'} size={15} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[12.5px] font-[550] truncate">{filename}</div>
                                        <div className="text-[11px] text-text-3 truncate">{folder}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
