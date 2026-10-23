import Icon from "../../lib/Icons";
import type { IconName } from "../../types";
import type { RowProps } from "../../types/settings";
import type { CatDef } from "../../types/settings";

export const CATS: readonly CatDef[] = [
    { id: 'playback', l: 'Playback', icon: 'play' },
    { id: 'video', l: 'Video', icon: 'film' },
    { id: 'audio', l: 'Audio', icon: 'music' },
    { id: 'subtitles', l: 'Subtitles', icon: 'cc' },
    { id: 'appearance', l: 'Appearance', icon: 'moon' },
    { id: 'library', l: 'Library', icon: 'grid' },
    { id: 'plugins', l: 'Plugins', icon: 'plug' },
    { id: 'advanced', l: 'Advanced', icon: 'cpu' },
    { id: 'privacy', l: 'Privacy', icon: 'lock' },
];

export function Group({ children }: { children: React.ReactNode }) {
    return (
        <div className="text-[10px] font-bold tracking-[.09em] uppercase text-text-3 mt-6.5 mb-1 first:mt-0">
            {children}
        </div>
    );
}



export function Row({ title, desc, control, changed, onReset }: RowProps) {
    return (
        <div className="flex items-center gap-6 py-3.5 border-b border-border last:border-b-0">
            <div className="flex-1 min-w-0">
                <div className="text-[12.5px] font-semibold flex items-center gap-1.5">
                    {changed && <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />}
                    {title}
                </div>
                <div className="text-[11.5px] text-text-3 mt-0.5 leading-normal">{desc as any}</div>
            </div>
            <div className="shrink-0 flex items-center gap-2">
                {control}
                {changed && onReset && (
                    <button
                        type="button"
                        onClick={onReset}
                        title="Reset to default"
                        className="text-[11px] text-text-3 hover:text-text transition-colors"
                    >
                        Reset
                    </button>
                )}
            </div>
        </div>
    );
}

export function EmptyPanel({
    icon, title, body, action,
}: { icon: IconName; title: string; body: string; action?: React.ReactNode }) {
    return (
        <div className="py-14 px-6 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-xl bg-surface-2 border border-border flex items-center justify-center
        text-text-3 mb-4">
                <Icon name={icon} size={22} />
            </div>
            <div className="text-[13.5px] font-[650] mb-1.5">{title}</div>
            <p className="text-[12px] text-text-3 max-w-[42ch] leading-relaxed m-0 mb-4">{body}</p>
            {action}
        </div>
    );
}
