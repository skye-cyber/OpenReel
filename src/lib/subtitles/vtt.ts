/**
 * Minimal WebVTT parser.
 *
 * Parses the parts we use: cue timestamps, cue text, newlines within
 * cue text, and basic HTML entities. Skips metadata, cue settings,
 * and NOTE blocks. Rejects malformed cues silently rather than
 * throwing — a broken cue shouldn't take down subtitle rendering for
 * the whole file.
 *
 * The output is a flat array of cues sorted by start time. The consumer
 * finds the active cue by binary search or linear scan on each timeupdate.
 */
export interface VttCue {
  start: number;    // seconds
  end: number;      // seconds
  text: string;     // may contain newlines
}

const TIMESTAMP_RE = /^(\d+):(\d{2}):(\d{2})\.(\d{3})$/;

function parseTimestamp(raw: string): number | null {
  const m = TIMESTAMP_RE.exec(raw.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  const s = Number(m[3]);
  const ms = Number(m[4]);
  return h * 3600 + min * 60 + s + ms / 1000;
}

function decodeEntities(s: string): string {
  // Handle the four HTML entities VTT commonly contains. Full HTML
  // entity decoding would pull in a dependency; these cover the cases
  // that appear in practice.
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, '\u00a0')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

export function parseVtt(raw: string): VttCue[] {
  // Normalize line endings.
  const text = raw.replace(/\r\n?/g, '\n');

  // Must start with WEBVTT (allow BOM and whitespace).
  const firstLine = text.split('\n')[0] ?? '';
  if (!firstLine.replace(/^\uFEFF/, '').trim().startsWith('WEBVTT')) {
    return [];
  }

  // Strip NOTE blocks and the header, then split on blank lines.
  const blocks = text
    .split(/\n\s*\n/)
    .map(b => b.trim())
    .filter(Boolean)
    .filter(b => !b.startsWith('NOTE') && !b.startsWith('STYLE') && !b.startsWith('REGION'));

  const cues: VttCue[] = [];

  for (const block of blocks) {
    const lines = block.split('\n');
    if (lines.length === 0) continue;

    // Skip a cue identifier line if present — it's the first line
    // when the second line contains "-->".
    let timeLineIndex = 0;
    if (lines.length > 1 && lines[1]?.includes('-->')) {
      timeLineIndex = 1;
    }

    const timeLine = lines[timeLineIndex];
    if (!timeLine || !timeLine.includes('-->')) continue;

    // Split on "-->". Anything after the end timestamp is cue settings
    // (position, align) which we currently ignore.
    const [startRaw, endRawWithSettings] = timeLine.split('-->');
    if (!startRaw || !endRawWithSettings) continue;

    const start = parseTimestamp(startRaw);
    const endRaw = endRawWithSettings.trim().split(/\s+/)[0] ?? '';
    const end = parseTimestamp(endRaw);
    if (start === null || end === null || end <= start) continue;

    const textLines = lines.slice(timeLineIndex + 1);
    const text = decodeEntities(textLines.join('\n')).trim();
    if (!text) continue;

    cues.push({ start, end, text });
  }

  cues.sort((a, b) => a.start - b.start);
  return cues;
}

/**
 * Find the cue active at a given time. Returns null if no cue is
 * active. Uses binary search since cues are sorted by start time,
 * which keeps this O(log n) on every timeupdate — important at 4–8
 * timeupdates per second on long subtitle tracks.
 */
export function findActiveCue(cues: VttCue[], time: number): VttCue | null {
  if (cues.length === 0) return null;

  let lo = 0;
  let hi = cues.length - 1;
  let candidate = -1;

  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    const cue = cues[mid];
    if (!cue) return null;
    if (cue.start <= time) {
      candidate = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  if (candidate < 0) return null;
  const active = cues[candidate];
  if (!active) return null;
  return time < active.end ? active : null;
}
