import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/styles.css';
import { CrashHandler } from './lib/platform/system/Crash';
import { loadPrefs } from './state/persistSettings';
import { initStreamPort } from './lib/mediaPath';

async function bootstrap() {
    const previous = await CrashHandler.markSessionStart();

    if (
        !(await CrashHandler.isSafeMode()) &&
        CrashHandler.detectCrashLoop(previous)
    ) {
        await CrashHandler.enterSafeMode('crash');
    }

    const [initialSafeMode, initialSafeModeReason, initialPrefs] = await Promise.all([
        CrashHandler.isSafeMode(),
        CrashHandler.getSafeModeReason(),
        loadPrefs(),
    ]);

    await initStreamPort()

    window.addEventListener('beforeunload', () => {
        void CrashHandler.markCleanExit();
    });

    createRoot(document.getElementById('root')!).render(
        <React.StrictMode>
            <App
                initialPrefs={initialPrefs}
                initialSafeMode={initialSafeMode}
                initialSafeModeReason={initialSafeModeReason}
            />
        </React.StrictMode>,
    );
}

void bootstrap();
