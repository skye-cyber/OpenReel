import type { PlayerState } from "../types/player";
import { useContext } from "react";
import { PlayerCtx } from "../state/PlayerContext";

export function usePlayer(): PlayerState {
    const ctx = useContext(PlayerCtx);
    if (!ctx) throw new Error('usePlayer must be used inside <PlayerProvider>');
    return ctx;
}
