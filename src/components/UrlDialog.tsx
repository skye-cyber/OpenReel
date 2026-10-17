import { useEffect, useState } from 'react';
import { Button } from './Button';
import Icon from '../lib/Icons';
import { usePlayer } from '../hooks/player';
import type { UrlDialogProps } from '../types/urldg';
import { displayNameFor, forgetUrl, loadRecents, parseUrl, rememberUrl } from '../helpers/url';
import { SCHEME_HINTS, SCHEME_LABELS } from '../types/urldg';


export function UrlDialog({ onClose }: UrlDialogProps) {
    const { playMedia, pushEscapeHandler, popEscapeHandler } = usePlayer();

    const [input, setInput] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [remember, setRemember] = useState(true);
    const [recents, setRecents] = useState<string[]>(() => loadRecents());
    const [hoveredScheme, setHoveredScheme] = useState<string | null>(null);

    useEffect(() => {
        pushEscapeHandler('url-dialog', onClose);
        return () => popEscapeHandler('url-dialog');
    }, [onClose, pushEscapeHandler, popEscapeHandler]);

    const submit = () => {
        setError(null);
        const parsed = parseUrl(input);
        if (!parsed.ok) {
            setError(parsed.message);
            return;
        }
        if (remember) {
            rememberUrl(input.trim());
        }
        playMedia(parsed.media);
        onClose();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        submit();
    };

    const useRecent = (url: string) => {
        setInput(url);
        setError(null);
        setHoveredScheme(null);
    };

    const removeRecent = (url: string, e: React.MouseEvent) => {
        e.stopPropagation();
        forgetUrl(url);
        setRecents(loadRecents());
    };

    const canSubmit = input.trim().length > 0;

    return (
        <div className="backdrop-brightness-[0.5] absolute z-[50] h-full w-full transition duration-300" onMouseDown={onClose}>
            <div
                className="fixed top-12 left-[30%] right-[30%]  w-full max-w-[40%] bg-surface border border-border-2 rounded-xl shadow-lg overflow-hidden animate-modal-in"
                onMouseDown={e => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="url-dialog-title"
            >
                {/* Header */}
                <div className="px-6 pt-5 pb-4 flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-lg bg-accent-dim border border-border-2 flex items-center justify-center text-accent shrink-0">
                        <Icon name="link" size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 id="url-dialog-title" className="text-[16px] font-[650] tracking-[-.015em] mb-1">
                            Open URL
                        </h3>
                        <p className="text-[12px] text-text-3 m-0 leading-relaxed">
                            Paste a stream, download, or file address.
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Input area */}
                    <div className="px-6 pb-5">
                        <div
                            className={`flex items-center gap-3 h-11 px-3.5 rounded-md bg-surface-2 border transition-colors
                                ${error
                                    ? 'border-danger focus-within:border-danger'
                                    : 'border-border-2 focus-within:border-accent focus-within:bg-surface'}`}
                        >
                            <Icon name="link" size={16} className={error ? 'text-danger' : 'text-text-3'} />
                            <input
                                type="text"
                                inputMode="url"
                                autoFocus
                                autoComplete="off"
                                autoCapitalize="off"
                                autoCorrect="off"
                                spellCheck={false}
                                value={input}
                                onChange={e => { setInput(e.target.value); if (error) setError(null); }}
                                placeholder="https://example.org/stream.m3u8"
                                className="flex-1 min-w-0 bg-transparent border-0 outline-0 text-text text-[13px] font-mono placeholder:text-text-3 placeholder:font-sans"
                                aria-invalid={!!error}
                                aria-describedby={error ? 'url-error' : undefined}
                            />
                            {input.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => { setInput(''); setError(null); }}
                                    className="w-6 h-6 rounded-sm flex items-center justify-center text-text-3 hover:text-text hover:bg-hover transition-colors shrink-0"
                                    aria-label="Clear address"
                                >
                                    <Icon name="x" size={13} />
                                </button>
                            )}
                        </div>

                        {error && (
                            <div
                                id="url-error"
                                role="alert"
                                className="mt-2.5 flex items-start gap-2 text-[12px] text-danger leading-relaxed"
                            >
                                <Icon name="alert" size={13} className="mt-0.5 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Scheme hints */}
                        <div className="mt-3.5 flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] text-text-3 mr-1">Supported:</span>
                            {SCHEME_LABELS.map(scheme => (
                                <button
                                    key={scheme}
                                    type="button"
                                    onMouseEnter={() => setHoveredScheme(scheme)}
                                    onMouseLeave={() => setHoveredScheme(null)}
                                    onFocus={() => setHoveredScheme(scheme)}
                                    onBlur={() => setHoveredScheme(null)}
                                    onClick={() => {
                                        if (!input.trim()) {
                                            setInput(`${scheme}://`);
                                        }
                                    }}
                                    className="text-[10.5px] font-mono px-1.5 py-0.5 rounded-sm bg-surface-2 border border-border text-text-3 hover:text-text hover:border-border-2 transition-colors"
                                >
                                    {scheme}
                                </button>
                            ))}
                        </div>
                        <div className="mt-2 min-h-[16px] text-[11px] text-text-3 leading-snug">
                            {hoveredScheme ? SCHEME_HINTS[hoveredScheme] : ''}
                        </div>
                    </div>

                    {/* Recents */}
                    {recents.length > 0 && (
                        <div className="px-6 pb-5 border-t border-border pt-4">
                            <div className="text-[10px] font-bold tracking-[.09em] uppercase text-text-3 mb-2">
                                Recent
                            </div>
                            <div className="-mx-1.5">
                                {recents.map(url => (
                                    <div
                                        key={url}
                                        className="group flex items-center gap-2.5 px-1.5 py-1.5 rounded-sm hover:bg-hover transition-colors cursor-pointer"
                                        onClick={() => useRecent(url)}
                                    >
                                        <Icon name="clock" size={13} className="text-text-3 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <div className="text-[12px] text-text truncate">{displayNameFor(url)}</div>
                                            <div className="text-[10.5px] text-text-3 font-mono truncate">{url}</div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={e => removeRecent(url, e)}
                                            className="w-5 h-5 rounded-sm flex items-center justify-center text-text-3 hover:text-danger opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity shrink-0"
                                            aria-label={`Remove ${url} from recent`}
                                        >
                                            <Icon name="x" size={11} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Remember */}
                    <div className="px-6 pb-4">
                        <label className="flex items-center gap-2.5 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={remember}
                                onChange={e => setRemember(e.target.checked)}
                                className="w-3.5 h-3.5 accent-accent"
                            />
                            <span className="text-[12px] text-text-2">Add to recent addresses</span>
                        </label>
                    </div>

                    {/* Footer */}
                    <div className="flex gap-2 justify-end px-6 py-3.5 bg-surface-2 border-t border-border">
                        <Button type="button" onClick={onClose}>Cancel</Button>
                        <Button type="submit" variant="primary" disabled={!canSubmit}>
                            Open
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
