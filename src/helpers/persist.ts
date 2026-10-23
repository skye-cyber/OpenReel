export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(Math.max(n, lo), hi);
}
export function clamp01(n: number): number {
  return clamp(n, 0, 1);
}
