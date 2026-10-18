/**
 * Strip ASS/SSA markup from dialogue content. libav-wasm hands us
 * dialogue content in the format declared by the header (usually ASS).
 * The common cases are:
 *   - "{\an8}Text" → alignment override, drop
 *   - "{\i1}italic{\i0}" → style tags, drop the tags keep the text
 *   - "\N" or "\n" → line break
 */
export default function stripSubtitleMarkup(text: string): string {
    return text
        .replace(/\{[^}]*\}/g, '')   // {…} tags
        .replace(/\\N/g, '\n')        // ASS newline
        .replace(/\\n/g, '\n')        // soft newline
        .replace(/\\h/g, ' ')         // hard space
        .trim();
}
