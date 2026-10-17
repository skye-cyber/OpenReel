import { usePlayer } from "../../state/PlayerContext";
import { Pill } from "./Pill";

export function AdvancedRow() {
    const { settings, setSetting, takeSnapshot, toast } = usePlayer();

    return (
        <div className="flex items-center gap-1.5 px-[18px] py-2 flex-wrap bg-surface-2 border-b border-border animate-fade-up">
            <span className="text-[10px] font-bold tracking-[.08em] uppercase text-text-3 mr-1">Advanced</span>

            <Pill
                label={`Aspect: ${settings.defaultAspect === 'fit' ? 'Fit' : settings.defaultAspect === 'fill' ? 'Fill' : 'Stretch'}`}
                active={settings.defaultAspect !== 'fit'}
                onClick={() => {
                    const next = settings.defaultAspect === 'fit' ? 'fill' : settings.defaultAspect === 'fill' ? 'stretch' : 'fit';
                    setSetting('defaultAspect', next);
                    toast(`Aspect: ${next} — Undo`);
                }}
            />

            <Pill label="Zoom 100%" onClick={() => toast('Zoom controls are not implemented yet')} />
            <Pill label="Audio delay 0 ms" onClick={() => toast('Delay controls are not implemented yet')} />
            <Pill label="Sub delay 0 ms" onClick={() => toast('Delay controls are not implemented yet')} />
            <Pill label="Deinterlace: Off" onClick={() => toast('Deinterlace is not implemented yet')} />

            <Pill label="Snapshot" onClick={takeSnapshot} />

            <Pill label="A–B" onClick={() => toast('A–B repeat is not implemented yet')} />
            <Pill label="Loop: Off" onClick={() => toast('Loop is not implemented yet')} />
            <Pill label="Media info" onClick={() => toast('Media info panel is not implemented yet')} />
        </div>
    );
}
