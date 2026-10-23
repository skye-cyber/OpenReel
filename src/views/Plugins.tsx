import { PluginsList } from "../components/Plugins/PluginList";
import { usePlayer } from "../hooks/player";
import { PluginDetail } from "../components/Plugins/Details";

export default function Plugins() {
    const { settings, selectedPluginId, safeMode } = usePlayer();
    // short-circuits when a selectedPluginId is set but plugins are off.
    if (!settings.pluginsEnabled || safeMode) return <PluginsList />;
    if (selectedPluginId) return <PluginDetail id={selectedPluginId} />;
    return <PluginsList />;
}


