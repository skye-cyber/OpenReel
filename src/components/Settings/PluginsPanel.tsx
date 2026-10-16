import { Group, Row } from "./Shared";
import { Switch } from "../Switch";
import { useState } from "react";
import { Button } from "../Button";

export function PluginsPanel() {
    const [enabled, setEnabled] = useState(true);
    const [updates, setUpdates] = useState(true);

    return (
        <>
            <Group>Plugins</Group>
            <Row
                title="Enable plugins"
                desc="Master switch. Turning this off keeps installed plugins on disk but does not load them."
                control={<Switch on={enabled} onChange={setEnabled} label="Enable plugins" />}
            />
            <Row
                title="Check for updates automatically"
                desc="Queries configured repositories at most once per day."
                control={<Switch on={updates} onChange={setUpdates} label="Check for updates" />}
            />

            <Group>Repositories</Group>
            <Row
                title="Plugin sources"
                desc="No repositories configured. Plugins can be installed from files without one."
                control={<Button size="sm" icon="plus">Add repository…</Button>}
            />

            <Group>Recovery</Group>
            <Row
                title="Safe mode"
                desc="Starts OpenReel with all plugins disabled. Useful when a plugin prevents startup."
                control={
                    <>
                        <Button size="sm" icon="refresh">Restart in safe mode</Button>
                    </>
                }
            />
        </>
    );
}
