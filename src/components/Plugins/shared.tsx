import type { PluginPermissionId } from "../../types";
import { Chip } from "../Chip";

export function StatusChip({ status, on }: { status: PluginStatus; on: boolean }) {
    if (status === 'ok') {
        return on
            ? <Chip tone="ok" style={{ height: 20, fontSize: 10.5 }}>Enabled</Chip>
            : <Chip style={{ height: 20, fontSize: 10.5 }}>Disabled</Chip>;
    }
    if (status === 'conflict') return <Chip tone="warn" icon="warn" style={{ height: 20, fontSize: 10.5 }}>Conflict</Chip>;
    if (status === 'failed') return <Chip tone="err" icon="alert" style={{ height: 20, fontSize: 10.5 }}>Failed</Chip>;
    if (status === 'incompat') return <Chip tone="warn" style={{ height: 20, fontSize: 10.5 }}>Incompatible</Chip>;
    return null;
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <div className="text-[10px] font-bold tracking-[.09em] uppercase text-text-3 mb-2.5">
            {children}
        </div>
    );
}

export function Row2({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
    return (
        <div className="contents">
            <dt className="text-[11.5px] text-text-3 py-2.5 border-b border-border">{label}</dt>
            <dd className={`text-[12.5px] py-2.5 border-b border-border m-0 ${mono ? 'font-mono text-[11.5px]' : 'tabular-nums'}`}>
                {value}
            </dd>
        </div>
    );
}

export function permissionIcon(pid: PluginPermissionId) {
    switch (pid) {
        case 'network': return 'external' as const;
        case 'read-media': return 'eye' as const;
        case 'write-config': return 'layers' as const;
        case 'spawn': return 'zap' as const;
        case 'audio-output': return 'music' as const;
        case 'draw-overlay': return 'film' as const;
    }
}
