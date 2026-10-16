export function fmt(seconds: number): string {
    const s = Math.max(0, Math.floor(seconds || 0));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h
    ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    : `${m}:${String(sec).padStart(2, '0')}`;
}

export const clamp01 = (n: number): number => Math.min(Math.max(n, 0), 1);

export const WAVE: readonly number[] = Array.from({ length: 88 }, (_, i) => {
    const v = Math.abs(Math.sin(i * 0.71) * Math.cos(i * 0.29) * Math.sin(i * 0.11 + 1.3));
    return 0.16 + v * 0.84;
});
