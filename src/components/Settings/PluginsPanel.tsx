import { Group, Row } from './Shared';
import { Button } from '../Button';
import { Switch } from '../Switch';
import { usePlayer } from "../../hooks/player";

export function PluginsPanel() {
    const {
        settings, setSetting,
        isChanged, resetSetting,
        toast, enterSafeMode,
        safeMode, exitSafeModeAndReload
    } = usePlayer();

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
                desc={
                    settings.pluginNetwork
                        ? 'Queries configured repositories at most once per day.'
                        : 'Requires network access. Enable it in Privacy.'
                }
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
            {safeMode ?
                <Row
                    title="Safe mode"
                    desc="Starts OpenReel with all plugins Enabled."
                    control={
                        <Button
                            size="sm"
                            icon="refresh"
                            onClick={() => {
                                exitSafeModeAndReload()
                            }}
                        >
                            Exit safe mode
                        </Button>
                    }
                />
                :
                < Row
                    title="Safe mode"
                    desc="Starts OpenReel with all plugins disabled. Useful when a plugin prevents startup."
                    control={
                        <Button
                            size="sm"
                            icon="refresh"
                            onClick={() => {
                                enterSafeMode('user');
                                window.location.reload();
                            }}
                        >
                            Restart in safe mode
                        </Button>
                    }
                />
            }
        </>
    );
}
