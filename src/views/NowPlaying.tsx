import { usePlayer } from '../state/PlayerContext';
import { EmptyState } from '../state/EmptyState';
import { AudioStage } from './AudioStage';
import { VideoStage } from './VideoStage';
import { ErrorState } from './ErrorStage';

export default function NowPlaying() {
    const { media } = usePlayer();
    if (!media) return <EmptyState />;
    if (media.kind === 'error') return <ErrorState />;
    if (media.kind === 'audio') return <AudioStage media={media} />;
    return <VideoStage media={media} />;
}
