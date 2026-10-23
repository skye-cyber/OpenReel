import Icon from "../lib/Icons";

export function DropOverlay() {
    return (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-[rgba(6,7,9,.68)] backdrop-brightness-[0.8] pointer-events-none">
            <div className="flex flex-col items-center gap-3 p-8 rounded-xl bg-surface border-2 border-dashed border-accent shadow-lg animate-fade-in">
                <Icon name="plus" size={28} className="text-accent" />
                <div className="text-[14px] font-[650]">Drop to add to queue</div>
                <div className="text-[12px] text-text-3">Files will be appended to the current queue.</div>
            </div>
        </div>
    );
}
