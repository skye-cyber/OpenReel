import { PlayerProvider } from './state/PlayerContext';
import { usePlayer } from './hooks/player';
import { Sidebar } from './components/Sidebar';
import { StatusStrip } from './components/StatusStrip';
import { TitleBar } from './components/TitleBar';
import { Transport } from './components/Transport/Default';
import { QueuePanel } from './components/QueuePanel';
import { ToastStack } from './components/Toast';
import { ModalRoot } from './components/Modal';
import ViewSwitch from './views';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LiveRegion } from './components/Live';
import { UrlDialog } from './components/UrlDialog';
import { MediaInfo } from './components/MediaInfo';
import { CrashRecoveryModal } from './components/CrashRecoveryModal';
import type { SafeModeReason } from './lib/platform/system';

function Shell() {
    const { queueOpen, urlDialogOpen, setUrlDialogOpen, mediaInfoOpen } = usePlayer();
    useKeyboardShortcuts();

    return (
        <div className="relative h-screen flex flex-col bg-app">
            <TitleBar />

            <div className="flex-1 flex min-h-0 relative">
                <Sidebar />

                <div className="flex-1 min-w-0 flex flex-col bg-app">
                    <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
                        <ErrorBoundary label="view">
                            <ViewSwitch />
                        </ErrorBoundary>
                    </div>
                </div>

                {queueOpen && <QueuePanel />}
                {mediaInfoOpen && <MediaInfo />}
            </div>

            <StatusStrip />
            <Transport />
            <ToastStack />
            <LiveRegion />
            {urlDialogOpen && <UrlDialog onClose={() => setUrlDialogOpen(false)} />}
            <CrashRecoveryModal />
            <ModalRoot />
        </div>
    );
}

interface AppProps {
    initialSafeMode: boolean;
    initialSafeModeReason: SafeModeReason | null;
}

export default function App({ initialSafeMode, initialSafeModeReason }: AppProps) {
    return (
        <PlayerProvider
            initialSafeMode={initialSafeMode}
            initialSafeModeReason={initialSafeModeReason}
        >
            <Shell />
        </PlayerProvider>
    );
}
