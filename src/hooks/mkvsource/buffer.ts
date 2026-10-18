/* ============================================================
 *  SourceBuffer append with proper back-pressure
 *  ============================================================ */
export default function appendBuffer(sb: SourceBuffer, data: ArrayBuffer | Uint8Array): Promise<void> {
    const buf = data instanceof Uint8Array ? data : new Uint8Array(data);

    return new Promise<void>((resolve, reject) => {
        const doAppend = () => {
            try {
                sb.appendBuffer(buf as any);
                sb.addEventListener('updateend', () => resolve(), { once: true });
                sb.addEventListener('error', () => reject(new Error('SourceBuffer append failed')), { once: true });
            } catch (e) {
                reject(e instanceof Error ? e : new Error(String(e)));
            }
        };

        if (sb.updating) {
            sb.addEventListener('updateend', doAppend, { once: true });
        } else {
            doAppend();
        }
    });
}
