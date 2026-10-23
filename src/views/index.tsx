import { usePlayer } from "../hooks/player";
import Welcome from './Welcome';
import NowPlaying from './NowPlaying';
import Library from './Library';
import Settings from './Settings';
import Plugins from './Plugins';
import Shortcuts from './Shortcuts';
import About from './About';

export default function ViewSwitch() {
    const { view } = usePlayer();
    switch (view) {
        case 'welcome': return <Welcome />;
        case 'now': return <NowPlaying />;
        case 'open': return <OpenView />;
        case 'library': return <Library />;
        case 'settings': return <Settings />;
        case 'plugins': return <Plugins />;
        case 'shortcuts': return <Shortcuts />;
        case 'about': return <About />;
        default: return null;
    }
}
