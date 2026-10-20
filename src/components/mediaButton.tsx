import Icon from '../lib/Icons';
import { usePlayer } from '../hooks/player';

export function CloseMediaButton({ className = '' }: { className?: string }) {
    const p = usePlayer();

    const handleClose = () => {
        p.setMedia(null);
        p.setView('now');
        p.toast('Media closed');
    };

    return (
        <button
            type="button"
            onClick={handleClose}
            aria-label="Close media"
            title="Close media (Ctrl+W)"
            className={`w-7 h-7 rounded-md flex items-center justify-center
                       text-white/70 hover:text-white hover:bg-white/10
                       transition-colors pointer-events-auto ${className}`}
        >
            <Icon name="x" size={15} />
        </button>
    );
}
