import { Group, Row } from "./Shared";
import { useState } from "react";
import type { Density } from "../../types/settings";
import { Switch } from "../Switch";
import { Seg } from "../Segment";
import { Button } from "../Button";
import { usePlayer } from "../../state/PlayerContext";


export function AppearancePanel() {
    const { density, setDensity, reducedMotionPref, setReducedMotionPref, reducedMotion } = usePlayer();
    const [status, setStatus] = useState(true);

    return (
        <>
            <Group>Interface</Group>
            <Row
                title="Interface density"
                desc="Compact reduces row height across lists and tables."
                control={
                    <Seg<Density>
                        value={density}
                        onChange={setDensity}
                        options={[
                            { v: 'comfortable', l: 'Comfortable' },
                            { v: 'compact', l: 'Compact' },
                        ]}
                    />
                }
            />
            <Row
                title="Reduce motion"
                desc={
                    reducedMotionPref === 'system'
                        ? `Following the system setting (currently ${reducedMotion ? 'reduced' : 'full'}).`
                        : 'Manually overridden — the system setting is ignored.'
                }
                control={
                    <Seg<'system' | 'on' | 'off'>
                        value={reducedMotionPref}
                        onChange={setReducedMotionPref}
                        options={[
                            { v: 'system', l: 'System' },
                            { v: 'on', l: 'On' },
                            { v: 'off', l: 'Off' },
                        ]}
                    />
                }
            />
            <Row
                title="Show status strip"
                desc="A thin line above the transport bar for buffering, scanning, and plugin errors."
                control={<Switch on={status} onChange={setStatus} label="Show status strip" />}
            />

            <Group>Display</Group>
            <Row
                title="Interface scale"
                desc="Follows the operating system's display scaling (currently 125%)."
                control={<Button size="sm">Open display settings</Button>}
            />
        </>
    );
}
