import { useState } from "react";
import { usePlayer } from "../../hooks/player";
import { Menu, MenuHead, MenuItem } from "../Menu";
import { Pill } from "./Pill";
import { fmt } from "../../lib/format";

type OpenMenu = 'aspect' | null;

export function AdvancedRow() {
    const p = usePlayer();
    const [openMenu, setOpenMenu] = useState<OpenMenu>(null);

    return (
        <div className="flex items-center gap-1.5 px-[18px] py-2 flex-wrap bg-surface-2 border-b border-border animate-fade-up">
            <span className="text-[10px] font-bold tracking-[.08em] uppercase text-text-3 mr-1">
                Advanced
            </span>

            <div className="menu-anchor">
                <Pill
                    label={`Aspect: ${p.currentAspect === 'fit' ? 'Fit'
                        : p.currentAspect === 'fill' ? 'Fill'
                            : 'Stretch'
                        }`}
                    active={p.currentAspect !== 'fit'}
                    onClick={() => setOpenMenu(openMenu === 'aspect' ? null : 'aspect')}
                />
                <Menu
                    open={openMenu === 'aspect'}
                    onClose={() => setOpenMenu(null)}
                    dir="up"
                    align="left"
                >
                    <MenuHead>Aspect ratio</MenuHead>
                    <MenuItem
                        tick={p.currentAspect === 'fit'}
                        onClick={() => { p.setCurrentAspect('fit'); setOpenMenu(null); }}
                    >
                        Fit
                    </MenuItem>
                    <MenuItem
                        tick={p.currentAspect === 'fill'}
                        onClick={() => { p.setCurrentAspect('fill'); setOpenMenu(null); }}
                    >
                        Fill
                    </MenuItem>
                    <MenuItem
                        tick={p.currentAspect === 'stretch'}
                        onClick={() => { p.setCurrentAspect('stretch'); setOpenMenu(null); }}
                    >
                        Stretch
                    </MenuItem>
                </Menu>
            </div>

            <Pill
                label="Zoom 100%"
                onClick={() => p.toast('Zoom controls are not implemented yet')}
            />
            <Pill
                label="Audio delay 0 ms"
                onClick={() => p.toast('Delay controls are not implemented yet')}
            />
            <Pill
                label="Sub delay 0 ms"
                onClick={() => p.toast('Delay controls are not implemented yet')}
            />
            <Pill
                label="Deinterlace: Off"
                onClick={() => p.toast('Deinterlace is not implemented yet')}
            />

            <Pill label="Snapshot" onClick={p.takeSnapshot} />

            <Pill
                label={`Loop: ${p.repeat === 'off' ? 'Off' : p.repeat === 'one' ? 'One' : 'All'}`}
                active={p.repeat !== 'off'}
                onClick={p.cycleRepeat}
            />
            <Pill
                label={
                    p.abRepeat.a === null ? 'A–B'
                        : p.abRepeat.b === null ? `A–B: A ${fmt(p.abRepeat.a)}`
                            : `A–B: ${fmt(p.abRepeat.a)} → ${fmt(p.abRepeat.b)}`
                }
                active={p.abRepeat.a !== null}
                onClick={p.cycleAbRepeat}
            />
            <Pill
                label="Media info"
                onClick={() => p.setMediaInfoOpen(!p.mediaInfoOpen)}
            />
        </div>
    );
}
