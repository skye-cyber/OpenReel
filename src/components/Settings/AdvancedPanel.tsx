import { Group, Row } from "./Shared";
import { Button } from "../Button";
import { useCallback, useEffect, useState } from "react";
import { Seg } from "../Segment";
import { PlatformTools } from "../../lib/platform/system/tools";
import { isTauri } from "../../lib/platform/system/shared";
import { usePlayer } from "../../hooks/player";
import { resetSettings } from "../../state/persistSettings";

export function AdvancedPanel() {
    const [level, setLevel] = useState<'error' | 'warn' | 'info' | 'debug'>('info');
    const [configFolder, setConfigFolder] = useState<string | null>(null);
    const [confirmReset, setConfirmReset] = useState(false);
    const [resetting, setResetting] = useState(false);
    const p = usePlayer();

    const getFolder = useCallback(async () => {
        const folder = await PlatformTools.getSettingsFolder();
        setConfigFolder(folder);
    }, []);

    useEffect(() => {
        void getFolder();
    }, [getFolder]);

    const handleReset = async () => {
        setResetting(true);
        try {
            await resetSettings();
            p.toast('Settings reset to defaults');
            setConfirmReset(false);
            // Force a reload so every context reads from the fresh file.
            // Without this, in-memory state still holds the old values.
            window.location.reload();
        } catch (err) {
            p.toast(`Reset failed: ${err instanceof Error ? err.message : String(err)}`, 'err');
            setResetting(false);
        }
    };

    return (
        <>
            <Group>Diagnostics</Group>
            <Row
                title="Log level"
                desc="Controls how much detail is written to the log file."
                control={
                    <Seg<'error' | 'warn' | 'info' | 'debug'>
                        value={level}
                        onChange={setLevel}
                        options={[
                            { v: 'error', l: 'Error' },
                            { v: 'warn', l: 'Warn' },
                            { v: 'info', l: 'Info' },
                            { v: 'debug', l: 'Debug' },
                        ]}
                    />
                }
            />
            <Row
                title="Open config folder"
                desc="Contains settings, plugin state, and the library index."
                control={
                    <Button
                        size="sm"
                        icon="folder"
                        onClick={async () => {
                            if (isTauri && configFolder) {
                                await PlatformTools.openPath(configFolder);
                            } else {
                                p.toast('Config folder is only available in the desktop build');
                            }
                        }}
                    >
                        Open folder
                    </Button>
                }
            />

            <Group>Settings</Group>
            <Row
                title="Export settings"
                desc="Writes all settings to a plain-text file you can share or keep as a backup."
                control={<Button size="sm" icon="download">Export…</Button>}
            />
            <Row
                title="Import settings"
                desc="Reads a previously exported settings file."
                control={<Button size="sm">Import…</Button>}
            />

            <Row
                title="Reset all settings"
                desc="Restores every setting to its default. Does not touch your media files or the library index."
                control={
                    <Button
                        size="sm"
                        icon="trash"
                        disabled={resetting}
                        onClick={() => setConfirmReset(true)}
                    >
                        Reset…
                    </Button>
                }
            />

            {confirmReset && (
                <div className="my-3 rounded-md p-3.5 bg-danger-dim border border-[rgba(224,100,92,.3)]">
                    <div className="text-[12.5px] font-semibold mb-1 text-danger">
                        Reset all settings?
                    </div>
                    <div className="text-[11.5px] text-text-2 leading-relaxed mb-3">
                        Every preference will return to its default: theme, volume, speed,
                        plugin state, subtitle style, library folders, and plugin repositories.
                        Your media files and the library index are not affected.
                        Default media folders will be re-seeded.
                    </div>
                    <div className="flex gap-2 justify-end">
                        <Button
                            size="sm"
                            onClick={() => setConfirmReset(false)}
                            disabled={resetting}
                        >
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            variant="primary"
                            onClick={handleReset}
                            disabled={resetting}
                        >
                            {resetting ? 'Resetting…' : 'Reset'}
                        </Button>
                    </div>
                </div>
            )}

            <Row
                title="Show welcome screen again"
                desc="Shows the first-launch screen the next time OpenReel starts."
                control={
                    <Button size="sm" onClick={() => p.setView('welcome')}>
                        Show
                    </Button>
                }
            />

            <Row
                title="Data location"
                desc={
                    <>
                        Data is stored in{' '}
                        <code
                            onClick={() => {
                                if (configFolder) void PlatformTools.openPath(configFolder);
                            }}
                            className="font-mono text-accent cursor-pointer hover:underline"
                        >
                            {configFolder ?? '~/.openreel'}
                        </code>
                    </>
                }
                control={<span />}
            />
        </>
    );
}
