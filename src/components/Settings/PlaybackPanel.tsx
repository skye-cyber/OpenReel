import { useState } from "react";
import { Group, Row } from "./Shared";
import { Seg } from "../Segment";
import { Switch } from "../Switch";

export function PlaybackPanel() {
    const [resume, setResume] = useState(true);
    const [threshold, setThreshold] = useState(30);
    const [autoplay, setAutoplay] = useState(true);
    const [step, setStep] = useState<'5' | '10' | '30'>('10');
    const [restart, setRestart] = useState(true);

    return (
        <>
            <Group>Resuming</Group>
            <Row
                title="Resume where you left off"
                changed
                desc="Remembers the position of each item between sessions."
                control={<Switch on={resume} onChange={setResume} label="Resume playback" />}
            />
            <Row
                title="Resume threshold"
                desc={
                    resume
                        ? 'Positions shorter than this are ignored.'
                        : 'Enable resume to change this.'
                }
                control={
                    <div className={resume ? '' : 'pointer-events-none opacity-40'}>
                        <Seg<'5' | '30' | '120'>
                            value={threshold === 5 ? '5' : threshold === 120 ? '120' : '30'}
                            onChange={v => setThreshold(Number(v))}
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
                changed
                desc="Continues into the queue when the current item ends."
                control={<Switch on={autoplay} onChange={setAutoplay} label="Autoplay next" />}
            />
            <Row
                title="Previous restarts current item"
                desc="If enabled, Previous restarts the current item once playback passes 3 seconds."
                control={<Switch on={restart} onChange={setRestart} label="Previous restarts current" />}
            />

            <Group>Keyboard seeking</Group>
            <Row
                title="Coarse seek step"
                desc="Used by ← and →. Shift uses a 1-second step."
                control={
                    <Seg<'5' | '10' | '30'>
                        value={step}
                        onChange={setStep}
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
