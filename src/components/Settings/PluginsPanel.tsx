import { Group, Row } from './Shared';
import { Button } from '../Button';
import { Switch } from '../Switch';
import { usePlayer } from '../../state/PlayerContext';

export function PluginsPanel() {
    const { settings, setSetting, isChanged, resetSetting, toast } = usePlayer();

    return (
        <>
            <Group>Plugins</Group>
            <Row
                title="Enable plugins"
                changed={isChanged('pluginsEnabled')}
                onReset={() => resetSetting('pluginsEnabled')}
                desc="Master switch. Turning this off keeps installed plugins on disk but does not load them."
                control={
                    <Switch
                        on={settings.pluginsEnabled}
                        onChange={v => setSetting('pluginsEnabled', v)}
                        label="Enable plugins"
                    />
                }
            />
            <Row
                title="Check for updates automatically"
                changed={isChanged('pluginUpdateChecks')}
                onReset={() => resetSetting('pluginUpdateChecks')}
                desc="Queries configured repositories at most once per day."
                control={
                    <Switch
                        on={settings.pluginUpdateChecks}
                        onChange={v => setSetting('pluginUpdateChecks', v)}
                        label="Check for updates"
                    />
                }
            />

            <Group>Repositories</Group>
            <Row
                title="Plugin sources"
                desc="No repositories configured. Plugins can be installed from files without one."
                control={
                    <Button size="sm" icon="plus" onClick={() => toast('Add repository is not implemented yet')}>
                        Add repository…
                    </Button>
                }
            />

            <Group>Recovery</Group>
            <Row
                title="Safe mode"
                desc="Starts OpenReel with all plugins disabled. Useful when a plugin prevents startup."
                control={
                    <Button size="sm" icon="refresh" onClick={() => toast('Restart in safe mode is not implemented yet')}>
                        Restart in safe mode
                    </Button>
                }
            />
        </>
    );
}
