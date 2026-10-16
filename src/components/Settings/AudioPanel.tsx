import { EmptyPanel } from "./Shared";
import { Button } from "../Button";


export function AudioPanel() {
    return (
        <EmptyPanel
            icon="music"
            title="Audio settings are not implemented yet"
            body="Playback works with the system default output device and automatic normalisation. Per-device selection and gain controls will land here."
            action={<Button size="sm">Open system sound settings</Button>}
        />
    );
}
