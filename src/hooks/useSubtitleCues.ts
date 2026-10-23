import { useEffect, useState } from 'react';
import { parseVtt, findActiveCue, type VttCue } from '../lib/subtitles/vtt';

/**
 * Cache parsed VTT files by URL so re-selecting a track doesn't refetch.
 * Not persisted — cleared on reload.
 */
const cache = new Map<string, VttCue[]>();

interface UseSubtitleCuesResult {
  activeText: string | null;
  loading: boolean;
  error: string | null;
}

/**
 * Load a VTT file from a URL, parse it, and return the cue active at
 * the given time. Returns null text when no cue is active or the URL
 * is empty.
 */
export function useSubtitleCues(
  src: string | null,
  currentTime: number,
): UseSubtitleCuesResult {
  const [cues, setCues] = useState<VttCue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Fetch and parse when src changes. */
  useEffect(() => {
    if (!src) {
      setCues([]);
      setLoading(false);
      setError(null);
      return;
    }

    const cached = cache.get(src);
    if (cached) {
      setCues(cached);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(src)
      .then(r => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        return r.text();
      })
      .then(text => {
        if (cancelled) return;
        const parsed = parseVtt(text);
        cache.set(src, parsed);
        setCues(parsed);
        setLoading(false);
      })
      .catch(err => {
        if (cancelled) return;
        setError(String(err));
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [src]);

  /* Find the cue active at the current time. Recomputed on every
     timeupdate — the binary search keeps this cheap. */
  const active = findActiveCue(cues, currentTime);

  return {
    activeText: active?.text ?? null,
    loading,
    error,
  };
}
