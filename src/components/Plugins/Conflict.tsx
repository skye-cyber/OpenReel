import Icon from "../../lib/Icons";
import { useMemo } from "react";
import { usePlayer } from "../../hooks/player";
import type { Plugin } from "../../types";

export function ConflictPanel({
  plugin, onResolve,
}: { plugin: Plugin; onResolve: (winnerId: string, loserId: string) => void }) {
  const { plugins, toast } = usePlayer();

  // Find the other plugin that shares a hook with this one.
  const other = useMemo(() => {
    if (!plugin.hooks) return undefined;
    return plugins.find(p =>
      p.id !== plugin.id &&
      p.hooks?.some(h => plugin.hooks!.includes(h))
    );
  }, [plugins, plugin]);

  if (!other) return null;

  const otherIsWinner = other.on;
  const pluginIsWinner = plugin.on;

  return (
    <div className="rounded-md p-[14px_16px] mb-6 bg-warning-dim border border-[rgba(217,161,59,.3)]">
      <div className="flex items-start gap-3 mb-3">
        <Icon name="warn" size={16} className="text-warning shrink-0 mt-0.5" />
        <div className="flex-1 text-[12.5px] leading-relaxed text-text">
          <b>Hook conflict.</b> {plugin.name} and {other.name} both provide{' '}
          <code className="font-mono text-[11.5px]">{plugin.hooks?.[0]}</code>.
          Only one can be active at a time.
        </div>
      </div>

      <div className="flex flex-col gap-2 mb-3">
        <ConflictOption
          name={plugin.name}
          active={pluginIsWinner}
          onActivate={() => {
            onResolve(plugin.id, other.id);
            toast(`Activated ${plugin.name}`);
          }}
        />
        <ConflictOption
          name={other.name}
          active={otherIsWinner}
          onActivate={() => {
            onResolve(other.id, plugin.id);
            toast(`Activated ${other.name}`);
          }}
        />
      </div>
    </div>
  );
}

export function ConflictOption({
  name, active, onActivate,
}: { name: string; active: boolean; onActivate: () => void }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-sm bg-surface border border-border">
      <span className={`w-3 h-3 rounded-full border-2 shrink-0 ${
        active ? 'bg-accent border-accent' : 'border-border-3'
      }`} />
      <span className="flex-1 text-[12.5px] font-medium">{name}</span>
      {active ? (
        <span className="text-[11px] text-accent font-semibold uppercase tracking-wider">Active</span>
      ) : (
        <button
          onClick={onActivate}
          className="text-[11.5px] text-accent hover:underline"
        >
          Make active
        </button>
      )}
    </div>
  );
}
