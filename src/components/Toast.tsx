import Icon from "../lib/Icons";
import { usePlayer } from "../hooks/player";

export function ToastStack() {
    const { toasts, dismissToast } = usePlayer();
    if (toasts.length === 0) return null;
    return (
        <div className="fixed right-5 bottom-[88px] z-400 flex flex-col gap-2.5 items-end" aria-live="polite">
        {toasts.map(t => {
            const isErr = t.kind === 'err';
        return (
            <div
            key={t.id}
            className={`flex items-center gap-3 p-[11px_14px] rounded-md bg-surface border shadow-lg
                text-[12.5px] min-w-[270px] animate-toast-in
                ${isErr ? 'border-[rgba(224,100,92,.35)]' : 'border-border-2'}`}
                >
                <Icon name={isErr ? 'alert' : 'check'} size={15} className={isErr ? 'text-danger' : 'text-success'} />
                <div className="flex-1">{t.msg}</div>
                <button onClick={() => dismissToast(t.id)} className="text-accent font-semibold text-[12px]">
                Undo
                </button>
                </div>
        );
        })}
        </div>
    );
}
