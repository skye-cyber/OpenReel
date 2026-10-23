import { useState } from "react";
import Icon from "../lib/Icons";
import { Menu, MenuItem, MenuHead } from "../components/Menu";
import { usePlayer } from "../hooks/player";
import { IconButton } from "../components/Button";
import { SCENES } from "../lib/Scene";

export function TitleBar() {
    const { media, theme, setThemePref, scene, applyScene, safeMode, setView } = usePlayer();
    const [open, setOpen] = useState(false);

    return (
        <div className="h-[42px] shrink-0 flex items-center gap-3.5 px-3.5 bg-surface border-b border-border relative z-60 select-none select-none">
            <div className="flex gap-2 items-center">
                {[0, 1, 2].map(i => (
                    <span
                        key={i}
                        className={`w-[11px] h-[11px] rounded-full bg-jborder-2 transition-colors hover:scale-[1.1]
                            ${i === 0 ? 'bg-[#e0645c] hover:bg-[#ff6e69]' : ''}
                            ${i === 1 ? 'bg-[#d9a13b] hover:bg-[#ffb845]' : ''}
                            ${i === 2 ? 'bg-[#5cba82] hover:bg-[#7dfdb0]' : ''}`}
                    />
                ))}
            </div>

            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <span className="font-[650] tracking-[-.01em] text-[12.5px]">OpenReel</span>
                {media && (
                    <>
                        <span className="w-px h-3.5 bg-border-2" />
                        <span className="text-[12px] text-text-2 truncate select-text">{media.title}</span>
                    </>
                )}
            </div>
            {safeMode && (
                <>
                    <span className="w-px h-3.5 bg-border-2" />
                    <button
                        onClick={() => setView('plugins')}
                        className="flex items-center gap-1.5 h-[22px] px-2 rounded-sm bg-warning-dim border border-[rgba(217,161,59,.3)] text-warning text-[11px] font-semibold hover:bg-[rgba(217,161,59,.2)] transition-colors"
                        title="Plugins are disabled. Click to open plugin settings."
                        aria-label="Safe mode is active. Open plugin settings."
                    >
                        <span className="w-1.5 h-1.5 rounded-full bg-warning" />
                        Safe mode
                    </button>
                </>
            )}
            <div className="flex items-center gap-1.5">
                <div className="relative inline-flex">
                    <button
                        onClick={() => setOpen(o => !o)}
                        className="flex items-center gap-1.5 h-[26px] px-2.5 rounded-full border border-dashed border-border-3 text-[11.5px] text-text-3 transition-all hover:text-text hover:border-solid hover:border-text-3"
                    >
                        <Icon name="layers" size={13} /> Screens
                    </button>
                    <Menu open={open} onClose={() => setOpen(false)} dir="down" className="min-w-[250px] max-h-[60vh] overflow-y-auto">
                        <MenuHead>Preview screens</MenuHead>
                        {SCENES.map(s => (
                            <MenuItem key={s.id} onClick={() => { applyScene(s.id); setOpen(false); }} tick={scene === s.id}>
                                {s.l}
                            </MenuItem>
                        ))}
                    </Menu>
                </div>

                <IconButton
                    icon={theme === 'dark' ? 'sun' : 'moon'}
                    size={15}
                    title="Toggle theme"
                    onClick={() => setThemePref(theme === 'dark' ? 'light' : 'dark')}
                />
            </div>
        </div>
    );
}
