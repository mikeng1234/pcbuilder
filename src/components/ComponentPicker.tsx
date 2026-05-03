import type { Component, Build } from "../types/components";
import { isCompatible } from "../lib/compatibility";
import { php } from "../lib/format";

interface Props {
  label: string;
  items: Component[];
  build: Build;
  selectedId?: string | null;
  onPick: (item: Component) => void;
  onClear?: () => void;
  multi?: boolean;
  selectedIds?: string[];
  onRemove?: (id: string) => void;
}

export function ComponentPicker({
  label,
  items,
  build,
  selectedId,
  onPick,
  onClear,
  multi,
  selectedIds = [],
  onRemove,
}: Props) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">{label}</h3>
        {!multi && selectedId && onClear && (
          <button onClick={onClear} className="text-xs text-slate-400 hover:text-rose-400">
            clear
          </button>
        )}
      </div>

      {multi && selectedIds.length > 0 && (
        <ul className="mb-3 space-y-1">
          {selectedIds.map(id => {
            const it = items.find(i => i.id === id);
            if (!it) return null;
            return (
              <li
                key={id}
                className="flex items-center justify-between rounded bg-slate-800 px-2 py-1 text-xs"
              >
                <span className="truncate">{it.brand} {it.model}</span>
                {onRemove && (
                  <button onClick={() => onRemove(id)} className="ml-2 text-rose-400 hover:text-rose-300">
                    ×
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="grid max-h-56 grid-cols-1 gap-1 overflow-y-auto pr-1">
        {items.map(item => {
          const compat = isCompatible(item, build);
          const isSelected = !multi && selectedId === item.id;
          const disabled = !compat.ok;
          return (
            <button
              key={item.id}
              onClick={() => onPick(item)}
              disabled={disabled}
              title={compat.reason || ""}
              className={[
                "flex flex-col items-start rounded border px-3 py-2 text-left text-xs transition",
                isSelected
                  ? "border-emerald-500 bg-emerald-950/40"
                  : "border-slate-800 bg-slate-950 hover:border-slate-600",
                disabled ? "cursor-not-allowed opacity-40" : "",
              ].join(" ")}
            >
              <div className="flex w-full items-center justify-between">
                <span className="font-medium text-slate-100">
                  {item.brand} {item.model}
                </span>
                <span className="font-mono text-emerald-400">{php(item.price)}</span>
              </div>
              <div className="mt-0.5 flex w-full items-center justify-between text-[10px] text-slate-500">
                <span>{specSummary(item)}</span>
                <span className="font-mono">cost {php(item.cost)}</span>
              </div>
              {!compat.ok && (
                <span className="mt-1 text-[10px] text-rose-400">{compat.reason}</span>
              )}
            </button>
          );
        })}
        {items.length === 0 && (
          <div className="py-6 text-center text-xs text-slate-500">No items.</div>
        )}
      </div>
    </div>
  );
}

function specSummary(c: Component): string {
  switch (c.category) {
    case "CPU": return `${c.socket} · ${c.supported_memory} · ${c.tdp_w}W`;
    case "Motherboard": return `${c.socket} · ${c.form_factor} · ${c.ram_type} · ${c.max_ram_slots} slots · ${c.nvme_slots}×M.2 · ${c.sata_ports}×SATA`;
    case "RAM": return `${c.ram_type} · ${c.capacity_gb}GB · ${c.speed_mhz}MHz · ${c.module_count}-stick`;
    case "SSD": return `${c.storage_type} · ${c.capacity_gb}GB`;
    case "HDD": return `${c.storage_type} · ${c.capacity_gb}GB`;
    case "GPU": return `${c.length_mm}mm · ${c.recommended_psu_w}W rec.`;
    case "Case": return `${c.supported_form_factors.join("/")} · GPU≤${c.max_gpu_length_mm}mm`;
    case "PSU": return `${c.wattage}W · ${c.form_factor}`;
    case "CPU Cooler": return c.supported_sockets.join(", ");
    case "Fans": return c.size_mm ? `${c.size_mm}mm` : "";
    default: return "";
  }
}
