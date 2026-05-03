import type { Component } from "../types/components";
import { php } from "../lib/format";

interface Props {
  label: string;
  item?: Component | null;
  onClick: () => void;
  onClear?: () => void;
  className?: string;
  compact?: boolean;
}

export function Slot({ label, item, onClick, onClear, className = "", compact }: Props) {
  return (
    <div
      className={[
        "group relative flex cursor-pointer flex-col justify-center rounded border-2 border-dashed transition",
        item
          ? "border-emerald-600/60 bg-emerald-950/30 hover:border-emerald-400"
          : "border-slate-600 bg-slate-900/40 hover:border-slate-400",
        compact ? "px-2 py-1" : "px-3 py-2",
        className,
      ].join(" ")}
      onClick={onClick}
    >
      <div className={`text-[10px] font-semibold uppercase tracking-wider ${item ? "text-emerald-400" : "text-slate-500"}`}>
        {label}
      </div>
      {item ? (
        <div className="mt-0.5">
          <div className={`font-medium text-slate-100 ${compact ? "text-xs" : "text-sm"} truncate`}>
            {item.brand} {item.model}
          </div>
          {!compact && (
            <div className="font-mono text-[10px] text-emerald-300">{php(item.price)}</div>
          )}
        </div>
      ) : (
        <div className={`text-slate-500 ${compact ? "text-xs" : "text-sm"}`}>+ Click to add</div>
      )}
      {item && onClear && (
        <button
          onClick={e => { e.stopPropagation(); onClear(); }}
          className="absolute right-1 top-1 hidden text-rose-400 hover:text-rose-300 group-hover:block"
          title="Remove"
        >
          ×
        </button>
      )}
    </div>
  );
}

interface MultiProps {
  label: string;
  items: Component[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  capacity?: number;
  className?: string;
}

export function MultiSlot({ label, items, onAdd, onRemove, capacity, className = "" }: MultiProps) {
  const full = capacity != null && items.length >= capacity;
  return (
    <div
      className={[
        "rounded border-2 border-dashed transition",
        full
          ? "border-amber-700/60 bg-amber-950/20"
          : "cursor-pointer border-slate-600 bg-slate-900/40 hover:border-emerald-500",
        "p-2",
        className,
      ].join(" ")}
      onClick={() => { if (!full) onAdd(); }}
    >
      <div className="mb-1 flex items-center justify-between">
        <span className={`text-[10px] font-semibold uppercase tracking-wider ${full ? "text-amber-400" : "text-slate-400"}`}>
          {label}{capacity != null ? ` (${items.length}/${capacity})` : ""}
        </span>
        {full && <span className="text-[10px] text-amber-400">FULL</span>}
      </div>
      <div className="space-y-1">
        {items.length === 0 ? (
          <div className="text-xs text-slate-500">+ Click to add</div>
        ) : (
          items.map(it => (
            <div
              key={it.id}
              className="flex items-center justify-between rounded bg-emerald-950/30 px-1.5 py-0.5 text-[10px]"
              onClick={e => e.stopPropagation()}
            >
              <span className="truncate text-emerald-200">{it.brand} {it.model}</span>
              <button
                onClick={() => onRemove(it.id)}
                className="ml-1 text-rose-400 hover:text-rose-300"
                title="Remove"
              >
                ×
              </button>
            </div>
          ))
        )}
        {!full && items.length > 0 && (
          <div className="pt-0.5 text-center text-[10px] text-slate-500">+ click area to add another</div>
        )}
      </div>
    </div>
  );
}
