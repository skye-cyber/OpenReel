import { Group, Row } from "./Shared";
import { Button } from "../Button";
import { useState } from "react";
import { Seg } from "../Segment";

export function AdvancedPanel() {
    const [level, setLevel] = useState<'error' | 'warn' | 'info' | 'debug'>('info');

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
                control={<Button size="sm" icon="folder">Open folder</Button>}
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
                control={<Button size="sm" icon="trash">Reset…</Button>}
            />
            <Row
                title="Show welcome screen again"
                desc="Shows the first-launch screen the next time OpenReel starts."
                control={<Button size="sm">Show</Button>}
            />
        </>
    );
}
