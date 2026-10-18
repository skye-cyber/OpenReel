import type { CSSProperties, ReactNode } from 'react';

export const paths = {
    play: <path d="M8 5.2v13.6L19.2 12z" fill="currentColor" stroke="none" />,
    pause: <g fill="currentColor" stroke="none"><rect x="7.2" y="5" width="3.4" height="14" rx="1.2" /><rect x="13.4" y="5" width="3.4" height="14" rx="1.2" /></g>,
    prev: <g fill="currentColor" stroke="none"><rect x="5" y="5" width="2.2" height="14" rx="1" /><path d="M19.4 6.2v11.6a1 1 0 0 1-1.55.83L10 13.1a1.2 1.2 0 0 1 0-2.2l7.85-5.53a1 1 0 0 1 1.55.83z" /></g>,
    next: <g fill="currentColor" stroke="none"><rect x="16.8" y="5" width="2.2" height="14" rx="1" /><path d="M4.6 6.2v11.6a1 1 0 0 0 1.55.83L14 13.1a1.2 1.2 0 0 0 0-2.2L6.15 5.37A1 1 0 0 0 4.6 6.2z" /></g>,
    back10: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label="Back 10 seconds"> <path d="M3 11a9 9 0 1 1 2.64 6.36"/> <path d="M3 4v7h7"/> <text x="12" y="14.5" textAnchor="middle" fill="currentColor" stroke="none" fontFamily="sans-serif" fontSize="7" fontWeight="600">10</text> </svg>,
    fwd10: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label="Forward 10 seconds"> <path d="M21 11a9 9 0 1 0-2.64 6.36"/> <path d="M21 4v7h-7"/> <text x="12" y="14.5" textAnchor="middle" fill="currentColor" stroke="none" fontFamily="sans-serif" fontSize="7" fontWeight="600">10</text> </svg>,
    vol: <g><path d="M11.2 5 6.8 8.8H3.4v6.4h3.4L11.2 19z" fill="currentColor" stroke="none" /><path d="M15.2 9.4a3.7 3.7 0 0 1 0 5.2" /><path d="M17.9 6.9a7.2 7.2 0 0 1 0 10.2" /></g>,
    volMute: <g><path d="M11.2 5 6.8 8.8H3.4v6.4h3.4L11.2 19z" fill="currentColor" stroke="none" /><path d="m15.4 9.8 4.6 4.4M20 9.8l-4.6 4.4" /></g>,
    cc: <g><rect x="2.8" y="5.2" width="18.4" height="13.6" rx="2.6" /><path d="M10.4 10.4a2.3 2.3 0 1 0 0 3.2" /><path d="M17.2 10.4a2.3 2.3 0 1 0 0 3.2" /></g>,
    audio: <path d="M4 10v4M8 6.8v10.4M12 4.2v15.6M16 7.6v8.8M20 10.4v3.2" />,
    queue: <path d="M4 7h16M4 12h16M4 17h9" />,
    full: <path d="M4 9.4V5.9A1.9 1.9 0 0 1 5.9 4H9.4M14.6 4h3.5A1.9 1.9 0 0 1 20 5.9v3.5M20 14.6v3.5a1.9 1.9 0 0 1-1.9 1.9h-3.5M9.4 20H5.9A1.9 1.9 0 0 1 4 18.1v-3.5" />,
    chevDown: <path d="m6 9.5 6 6 6-6" />,
    chevUp: <path d="m6 14.5 6-6 6 6" />,
    chevRight: <path d="m9.5 6 6 6-6 6" />,
    gear: <g><circle cx="12" cy="12" r="3.1" /><path d="M19.3 14.6a1.6 1.6 0 0 0 .32 1.77l.06.06a1.94 1.94 0 1 1-2.74 2.74l-.06-.06a1.6 1.6 0 0 0-1.77-.32 1.6 1.6 0 0 0-.97 1.47v.17a1.94 1.94 0 1 1-3.88 0v-.09a1.6 1.6 0 0 0-1.05-1.47 1.6 1.6 0 0 0-1.77.32l-.06.06a1.94 1.94 0 1 1-2.74-2.74l.06-.06a1.6 1.6 0 0 0 .32-1.77 1.6 1.6 0 0 0-1.47-.97h-.17a1.94 1.94 0 1 1 0-3.88h.09a1.6 1.6 0 0 0 1.47-1.05 1.6 1.6 0 0 0-.32-1.77l-.06-.06a1.94 1.94 0 1 1 2.74-2.74l.06.06a1.6 1.6 0 0 0 1.77.32h.08a1.6 1.6 0 0 0 .97-1.47v-.17a1.94 1.94 0 1 1 3.88 0v.09a1.6 1.6 0 0 0 .97 1.47 1.6 1.6 0 0 0 1.77-.32l.06-.06a1.94 1.94 0 1 1 2.74 2.74l-.06.06a1.6 1.6 0 0 0-.32 1.77v.08a1.6 1.6 0 0 0 1.47.97h.17a1.94 1.94 0 1 1 0 3.88h-.09a1.6 1.6 0 0 0-1.47.97z" /></g>,
    grid: <g><rect x="3.4" y="3.4" width="7.2" height="7.2" rx="1.8" /><rect x="13.4" y="3.4" width="7.2" height="7.2" rx="1.8" /><rect x="3.4" y="13.4" width="7.2" height="7.2" rx="1.8" /><rect x="13.4" y="13.4" width="7.2" height="7.2" rx="1.8" /></g>,
    plug: <g><path d="M9 3v5.2M15 3v5.2" /><path d="M6.4 8.2h11.2v2.9a5.6 5.6 0 0 1-5.6 5.6 5.6 5.6 0 0 1-5.6-5.6z" /><path d="M12 16.7V21" /></g>,
    info: <g><circle cx="12" cy="12" r="8.6" /><path d="M12 11.2v5.2M12 7.9h.01" /></g>,
    keyboard: <g><rect x="2.6" y="6" width="18.8" height="12" rx="2.2" /><path d="M6.4 10h.01M9.6 10h.01M12.8 10h.01M16 10h.01M7.4 14h9.2" /></g>,
    sun: <g><circle cx="12" cy="12" r="4.1" /><path d="M12 2.6v2M12 19.4v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.6 12h2M19.4 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" /></g>,
    moon: <path d="M20.4 14.2A8.6 8.6 0 1 1 9.8 3.6a6.9 6.9 0 0 0 10.6 10.6z" />,
    x: <path d="m6.4 6.4 11.2 11.2M17.6 6.4 6.4 17.6" />,
    check: <path d="m5 12.8 4.6 4.6L19 7.4" />,
    warn: <g><path d="M10.3 3.9 2.5 17.4a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><path d="M12 9.2v4.4M12 17.2h.01" /></g>,
    search: <g><circle cx="11" cy="11" r="6.8" /><path d="m20.2 20.2-4.4-4.4" /></g>,
    shuffle: <g><path d="M17 4.4 20.4 7.8 17 11.2" /><path d="M3.6 7.8h3.1c1.5 0 2.9.7 3.8 1.9l3 4.1a4.7 4.7 0 0 0 3.8 1.9h3.1" /><path d="M17 16.2l3.4 3.4L17 23" /><path d="M3.6 19.7h3.1c1.5 0 2.9-.7 3.8-1.9l.7-1" /><path d="M14.4 9.2l.6-.8a4.7 4.7 0 0 1 3.8-1.9h1.6" /></g>,
    repeat: <g><path d="m17 2.8 3.2 3.2L17 9.2" /><path d="M3.8 12.6V10a4 4 0 0 1 4-4h12.4" /><path d="M7 21.2 3.8 18 7 14.8" /><path d="M20.2 11.4V14a4 4 0 0 1-4 4H3.8" /></g>,
    folder: <path d="M3.4 7.2a2 2 0 0 1 2-2h3.5l2 2.4h7.7a2 2 0 0 1 2 2v7.2a2 2 0 0 1-2 2H5.4a2 2 0 0 1-2-2z" />,
    film: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label="Film" > <rect x="3" y="3" width="18" height="18" rx="2" /> <path d="M7 3v18M3 7h4M3 12h4M3 17h4M17 3v18M17 7h4M17 12h4M17 17h4" /> </svg>,
    music: <g><path d="M9.2 18.4V6.2l10-2v12.2" /><circle cx="6.6" cy="18.4" r="2.6" /><circle cx="16.6" cy="16.4" r="2.6" /></g>,
    link: <g><path d="M10.2 13.8a4.5 4.5 0 0 0 6.4 0l2.6-2.6a4.5 4.5 0 0 0-6.4-6.4l-1.5 1.5" /><path d="M13.8 10.2a4.5 4.5 0 0 0-6.4 0l-2.6 2.6a4.5 4.5 0 0 0 6.4 6.4l1.5-1.5" /></g>,
    refresh: <g><path d="M20.4 11.4a8.4 8.4 0 1 0-2.1 6.4" /><path d="M20.8 5.6v5.8h-5.8" /></g>,
    cpu: <g><rect x="6.4" y="6.4" width="11.2" height="11.2" rx="2" /><rect x="9.6" y="9.6" width="4.8" height="4.8" rx="1" /><path d="M9.6 2.8v3.6M14.4 2.8v3.6M9.6 17.6v3.6M14.4 17.6v3.6M2.8 9.6h3.6M2.8 14.4h3.6M17.6 9.6h3.6M17.6 14.4h3.6" /></g>,
    download: <g><path d="M12 3.6v11.6" /><path d="m7.6 10.8 4.4 4.4 4.4-4.4" /><path d="M4.4 19.6h15.2" /></g>,
    plus: <path d="M12 5.2v13.6M5.2 12h13.6" />,
    external: <g><path d="M13.6 4.4h6v6" /><path d="M19.6 4.4 11 13" /><path d="M18 14.2v4.4a2 2 0 0 1-2 2H5.8a2 2 0 0 1-2-2V8.4a2 2 0 0 1 2-2H10" /></g>,
    alert: <g><circle cx="12" cy="12" r="8.6" /><path d="M12 7.6v5.2M12 16.2h.01" /></g>,
    layers: <g><path d="m12 3.2 8.4 4.4L12 12 3.6 7.6z" /><path d="m3.6 12.4 8.4 4.4 8.4-4.4" /></g>,
    wifiOff: <g><path d="M3 4.2 21 19.8" /><path d="M8.6 12.6a5.4 5.4 0 0 1 6.2-.6" /><path d="M5.4 9.2a10.6 10.6 0 0 1 3.1-1.5" /><path d="M15.9 8.2a10.6 10.6 0 0 1 3.2 2" /><path d="M12 18.4h.01" /></g>,
    eye: <g><path d="M2.4 12S5.8 5.6 12 5.6 21.6 12 21.6 12 18.2 18.4 12 18.4 2.4 12 2.4 12z" /><circle cx="12" cy="12" r="2.8" /></g>,
    lock: <g><rect x="4.4" y="10.4" width="15.2" height="9.6" rx="2.2" /><path d="M8 10.4V7.6a4 4 0 0 1 8 0v2.8" /></g>,
    zap: <path d="M13.4 2.6 4.8 13.4h6.2l-.4 8 8.6-10.8h-6.2z" />,
    disc: <g><circle cx="12" cy="12" r="8.6" /><circle cx="12" cy="12" r="2.4" /></g>,
    clock: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6a7 7 0 1 1 2.05 4.95l-1.42 1.42A9 9 0 1 0 13 3zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z" /></svg>,
    trash: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" > <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" /> </svg>,
    shield: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" > <path d="M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" /> </svg>,
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof paths;

interface IconProps {
    name: IconName;
    size?: number;
    weight?: number;
    className?: string;
    style?: CSSProperties;
}

export default function Icon({ name, size = 18, weight = 1.75, className, style }: IconProps) {
    const path = paths[name];
    return (
        <svg
            className={`block shrink-0 ${className ?? ''}`}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={weight}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={style}
            aria-hidden="true"
        >
            {path}
        </svg>
    );
}
