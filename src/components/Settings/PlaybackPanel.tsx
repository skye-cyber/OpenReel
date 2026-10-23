import { Group, Row } from './Shared';
import { Seg } from '../Segment';
import { Switch } from '../Switch';
import { usePlayer } from "../../hooks/player";
import type { ResumeThreshold, SeekStep } from '../../types/settings';

export function PlaybackPanel() {
    const { settings, setSetting, isChanged, resetSetting } = usePlayer();

    const thresholdValue: ResumeThreshold = settings.resumeThreshold;
    const thresholdStr = String(thresholdValue) as '5' | '30' | '120';

    const stepStr = String(settings.coarseSeekStep) as '5' | '10' | '30';

    return (
        <>
            <Group>Resuming</Group>
            <Row
                title="Resume where you left off"
                changed={isChanged('resumeEnabled')}
                onReset={() => resetSetting('resumeEnabled')}
                desc="Remembers the position of each item between sessions."
                control={
                    <Switch
                        on={settings.resumeEnabled}
                        onChange={v => setSetting('resumeEnabled', v)}
                        label="Resume playback"
                    />
                }
            />
            <Row
                title="Resume threshold"
                changed={isChanged('resumeThreshold')}
                onReset={() => resetSetting('resumeThreshold')}
                desc={
                    settings.resumeEnabled
                        ? 'Positions shorter than this are ignored.'
                        : 'Enable resume to change this.'
                }
                control={
                    <div className={settings.resumeEnabled ? '' : 'pointer-events-none opacity-40'}>
                        <Seg<'5' | '30' | '120'>
                            value={thresholdStr}
                            onChange={v => setSetting('resumeThreshold', Number(v) as ResumeThreshold)}
                            options={[
                                { v: '5', l: '5 s' },
                                { v: '30', l: '30 s' },
                                { v: '120', l: '2 min' },
                            ]}
                        />
                    </div>
                }
            />

            <Group>Queue behaviour</Group>
            <Row
                title="Autoplay next item"
                changed={isChanged('autoplayNext')}
                onReset={() => resetSetting('autoplayNext')}
                desc="Continues into the queue when the current item ends."
                control={
                    <Switch
                        on={settings.autoplayNext}
                        onChange={v => setSetting('autoplayNext', v)}
                        label="Autoplay next"
                    />
                }
            />
            <Row
                title="Previous restarts current item"
                changed={isChanged('previousRestartsCurrent')}
                onReset={() => resetSetting('previousRestartsCurrent')}
                desc="If enabled, Previous restarts the current item once playback passes 3 seconds."
                control={
                    <Switch
                        on={settings.previousRestartsCurrent}
                        onChange={v => setSetting('previousRestartsCurrent', v)}
                        label="Previous restarts current"
                    />
                }
            />

            <Group>Keyboard seeking</Group>
            <Row
                title="Coarse seek step"
                changed={isChanged('coarseSeekStep')}
                onReset={() => resetSetting('coarseSeekStep')}
                desc="Used by ← and →. Shift uses a 1-second step."
                control={
                    <Seg<'5' | '10' | '30'>
                        value={stepStr}
                        onChange={v => setSetting('coarseSeekStep', Number(v) as SeekStep)}
                        options={[
                            { v: '5', l: '5 s' },
                            { v: '10', l: '10 s' },
                            { v: '30', l: '30 s' },
                        ]}
                    />
                }
            />
        </>
    );
}
