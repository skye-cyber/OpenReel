import { PluginsList } from "../components/Plugins/PluginList";
import { usePlayer } from "../state/PlayerContext";
import { PluginDetail } from "../components/Plugins/Details";

export default function Plugins() {
    const { selectedPluginId } = usePlayer();
    if (selectedPluginId) return <PluginDetail id={selectedPluginId} />;
    return <PluginsList />;
}


