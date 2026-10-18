import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/styles.css';
import { SessionCrashManager } from './lib/platform/system';

const previous = SessionCrashManager.markSessionStart();
if (!SessionCrashManager.isSafeMode() && SessionCrashManager.detectCrashLoop(previous)) {
    SessionCrashManager.enterSafeMode('crash');
}
const initialSafeMode = SessionCrashManager.isSafeMode();
const initialSafeModeReason = SessionCrashManager.getSafeModeReason();
window.addEventListener('beforeunload', () => SessionCrashManager.markCleanExit());

createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
        <App
            initialSafeMode={initialSafeMode}
            initialSafeModeReason={initialSafeModeReason}
        />
    </React.StrictMode>
);
