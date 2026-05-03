import { useEffect } from "react";
import type { Build, Component } from "../types/components";
import { isCompatible } from "../lib/compatibility";
import { php } from "../lib/format";

interface Props {
  open: boolean;
  title: string;
  items: Component[];
  build: Build;
  onPick: (item: Component) => void;
  onClose: () => void;
}

export function PickerModal({ open, title, items, build, onPick, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-rose-400">✕</button>
        </div>

        <div className="grid max-h-[60vh] grid-cols-1 gap-2 overflow-y-auto pr-1">
          {items.map(item => {
            const compat = isCompatible(item, build);
            return (
              <button
                key={item.id}
                disabled={!compat.ok}
                onClick={() => { onPick(item); onClose(); }}
                title={compat.reason || ""}
                className={[
                  "flex flex-col rounded border px-4 py-3 text-left transition",
                  compat.ok
                    ? "border-slate-700 bg-slate-950 hover:border-emerald-500"
                    : "cursor-not-allowed border-slate-800 bg-slate-950/50 opacity-40",
                ].join(" ")}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-100">
                    {item.brand} {item.model}
                  </span>
                  <span className="font-mono text-emerald-400">{php(item.price)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
                  <span>{specSummary(item)}</span>
                  <span className="font-mono">cost {php(item.cost)}</span>
                </div>
                {!compat.ok && (
                  <span className="mt-1 text-xs text-rose-400">{compat.reason}</span>
                )}
              </button>
            );
          })}
          {items.length === 0 && (
            <div className="py-10 text-center text-sm text-slate-500">No items available.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function specSummary(c: Component): string {
  switch (c.category) {
    case "CPU": return `${c.socket} · ${c.supported_memory} · ${c.tdp_w}W`;
    case "Motherboard": return `${c.socket} · ${c.form_factor} · ${c.ram_type} · ${c.max_ram_slots} DIMM · ${c.nvme_slots}×M.2 · ${c.sata_ports}×SATA`;
    case "RAM": return `${c.ram_type} · ${c.capacity_gb}GB · ${c.speed_mhz}MHz · ${c.module_count}×stick`;
    case "SSD": return `${c.storage_type} · ${c.capacity_gb}GB`;
    case "HDD": return `${c.storage_type} · ${c.capacity_gb}GB`;
    case "GPU": return `${c.length_mm}mm · ${c.recommended_psu_w}W rec`;
    case "Case": return `${c.supported_form_factors.join("/")} · GPU≤${c.max_gpu_length_mm}mm`;
    case "PSU": return `${c.wattage}W · ${c.form_factor}`;
    case "CPU Cooler": return c.supported_sockets.join(", ");
    case "Fans": return c.size_mm ? `${c.size_mm}mm` : "";
    case "Monitor": return `${c.size_inches}"`;
    default: return "";
  }
}
