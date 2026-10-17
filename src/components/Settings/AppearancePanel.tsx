import { Group, Row } from './Shared';
import { Seg } from '../Segment';
import { Button } from '../Button';
import { usePlayer } from "../../hooks/player";
import type { Density, MotionPref } from '../../types/settings';
import { Switch } from '../Switch';

export function AppearancePanel() {
    const { settings, setSetting, isChanged, resetSetting, reducedMotion } = usePlayer();

    return (
        <>
            <Group>Interface</Group>
            <Row
                title="Interface density"
                changed={isChanged('density')}
                onReset={() => resetSetting('density')}
                desc="Compact reduces row height across lists and tables."
                control={
                    <Seg<Density>
                        value={settings.density}
                        onChange={v => setSetting('density', v)}
                        options={[
                            { v: 'comfortable', l: 'Comfortable' },
                            { v: 'compact', l: 'Compact' },
                        ]}
                    />
                }
            />
            <Row
                title="Reduce motion"
                changed={isChanged('reducedMotion')}
                onReset={() => resetSetting('reducedMotion')}
                desc={
                    settings.reducedMotion === 'system'
                        ? `Following the system setting (currently ${reducedMotion ? 'reduced' : 'full'}).`
                        : 'Manually overridden — the system setting is ignored.'
                }
                control={
                    <Seg<MotionPref>
                        value={settings.reducedMotion}
                        onChange={v => setSetting('reducedMotion', v)}
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
                changed={isChanged('showStatusStrip')}
                onReset={() => resetSetting('showStatusStrip')}
                desc="A thin line above the transport bar for buffering, scanning, and plugin errors."
                control={
                    <Switch
                        on={settings.showStatusStrip}
                        onChange={v => setSetting('showStatusStrip', v)}
                        label="Show status strip"
                    />
                }
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
