import { PlayerProvider, usePlayer } from './state/PlayerContext';
import { Sidebar } from './components/Sidebar';
import { StatusStrip } from './components/StatusStrip';
import { TitleBar } from './components/TitleBar';
import { Transport } from './components/Transport';
import { QueuePanel } from './components/QueuePanel';
import { ToastStack } from './components/Toast';
import { ModalRoot } from './components/Modal';
import ViewSwitch from './views';
import { useKeyboardShortcuts } from './state/useKeyboardShortcuts';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LiveRegion } from './components/Live';

function Shell() {
    const { queueOpen } = usePlayer();
    useKeyboardShortcuts();

    return (
        <div className="h-screen flex flex-col bg-app">
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
            </div>

            <StatusStrip />
            <Transport />
            <ToastStack />
            <LiveRegion />
            <ModalRoot />
        </div>
    );
}

export default function App() {
    return (
        <PlayerProvider>
            <Shell />
        </PlayerProvider>
    );
}
