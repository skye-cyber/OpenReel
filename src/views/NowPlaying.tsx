import { usePlayer } from "../hooks/player";
import { EmptyState } from '../state/EmptyState';
import { AudioStage } from './AudioStage';
import { VideoStage } from './VideoStage';
import ErrorStage from './ErrorStage';

export default function NowPlaying() {
    const { media } = usePlayer();
    if (!media) return <EmptyState />;
    if (media.kind === 'error') return <ErrorStage media={media} />;
    if (media.kind === 'audio') return <AudioStage media={media} />;
    return <VideoStage media={media} />;
}
