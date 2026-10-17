import { Group, Row } from './Shared';
import { Switch } from '../Switch';
import { usePlayer } from '../../state/PlayerContext';

export function PrivacyPanel() {
    const { settings, setSetting, isChanged, resetSetting } = usePlayer();

    return (
        <>
            <Group>Network</Group>
            <Row
                title="Check for application updates"
                changed={isChanged('updateCheck')}
                onReset={() => resetSetting('updateCheck')}
                desc="Contacts the release server at most once per day. No identifier is sent."
                control={
                    <Switch
                        on={settings.updateCheck}
                        onChange={v => setSetting('updateCheck', v)}
                        label="Check for updates"
                    />
                }
            />
            <Row
                title="Allow plugins to use the network"
                changed={isChanged('pluginNetwork')}
                onReset={() => resetSetting('pluginNetwork')}
                desc="Individual plugins still declare their own network permission. Turning this off overrides all of them."
                control={
                    <Switch
                        on={settings.pluginNetwork}
                        onChange={v => setSetting('pluginNetwork', v)}
                        label="Allow plugin network access"
                    />
                }
            />

            <Group>What OpenReel stores</Group>
            <div className="rounded-md p-[12px_16px] bg-surface-2 border border-border text-[12px] leading-relaxed text-text-2">
                Settings, plugin state, the library index, thumbnails, and the log file — all on this
                computer, under your config folder. OpenReel does not collect usage data, does not create
                an account, and does not send anything to a server unless you enable a feature that needs it.
            </div>
        </>
    );
}
