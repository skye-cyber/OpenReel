import { usePlayer } from "../state/PlayerContext";

export function LiveRegion() {
    const { liveMessage } = usePlayer();
    return (
        <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="sr-only z-[50] p-12"
        >
            {liveMessage}
        </div>
    );
}
