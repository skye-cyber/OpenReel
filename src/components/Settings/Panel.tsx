import { VideoPanel } from "./VideoPanel";
import { SubtitlesPanel } from "./SubtitlePanel";
import { LibraryPanel } from "./LibraryPanel";
import { AdvancedPanel } from "./AdvancedPanel";
import { PrivacyPanel } from "./PrivacyPanel";
import { PluginsPanel } from "./PluginsPanel";
import { AppearancePanel } from "./AppearancePanel";
import { PlaybackPanel } from "./PlaybackPanel";
import { AudioPanel } from "./AudioPanel";
import type { Cat } from "../../types/settings";


export function Panel({ cat }: { cat: Cat }) {
    switch (cat) {
        case 'playback': return <PlaybackPanel />;
        case 'video': return <VideoPanel />;
        case 'audio': return <AudioPanel />;
        case 'subtitles': return <SubtitlesPanel />;
        case 'appearance': return <AppearancePanel />;
        case 'library': return <LibraryPanel />;
        case 'plugins': return <PluginsPanel />;
        case 'advanced': return <AdvancedPanel />;
        case 'privacy': return <PrivacyPanel />;
    }
}
