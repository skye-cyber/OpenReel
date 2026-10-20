import { Group, Row } from "./Shared";
import { Button } from "../Button";
import { useCallback, useEffect, useState } from "react";
import { Seg } from "../Segment";
import { PlatformTools } from "../../lib/platform/system/tools";
import { isTauri } from "../../lib/platform/system/shared";
import { usePlayer } from "../../hooks/player";
import { clearPrefs } from "../../state/persistSettings";

export function AdvancedPanel() {
    const [level, setLevel] = useState<'error' | 'warn' | 'info' | 'debug'>('info');
    const [configFolder, setConficFolder] = useState<string | null>(null);
    const p = usePlayer()

    const getFolder = useCallback(async () => {
        const folder = await PlatformTools.getSettingsFolder()
        setConficFolder(folder)
    }, [])

    useEffect(() => {
        getFolder()
    })
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
                control={<Button size="sm" onClick={async () => {
                    if (isTauri && configFolder) {
                        await PlatformTools.openPath(configFolder);
                    } else {
                        p.toast('Config folder is only available in the desktop build');
                    }
                }} icon="folder">Open folder</Button>}
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
                control={<Button className="bg-red-300/20 border border-red-400 hover:border-2 hover:border-red-400" onClick={() => clearPrefs()} size="sm" icon="trash">Reset…</Button>}
            />
            <Row
                title="Show welcome screen again"
                desc="Shows the first-launch screen the next time OpenReel starts."
                control={<Button onClick={() => p.setView('welcome')} size="sm">Show</Button>}
            />
            <Row
                title="Data location"
                desc={
                    <>
                        Data is stored in{' '}
                        <code onClick={() => configFolder ? PlatformTools.openPath(configFolder) : ''} className="font-mono text-accent">
                            {configFolder ?? '~/.openreel'}
                        </code>
                    </>
                }
                control
            />
        </>
    );
}
