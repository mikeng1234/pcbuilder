import type { Build, SavedBuild } from "../types/components";
import { buildTotals, validateBuild } from "../lib/compatibility";
import { php } from "../lib/format";

interface Props {
  build: Build;
  savedBuilds: SavedBuild[];
  buildName: string;
  onNameChange: (n: string) => void;
  onSave: () => void;
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
  onExport: () => void;
  onReset: () => void;
  onMarkSold: () => void;
  buildItemCount: number;
}

export function SummaryPanel({
  build,
  savedBuilds,
  buildName,
  onNameChange,
  onSave,
  onLoad,
  onDelete,
  onExport,
  onReset,
  onMarkSold,
  buildItemCount,
}: Props) {
  const totals = buildTotals(build);
  const issues = validateBuild(build);

  // Spec roll-ups
  const totalRamGb = build.ramKits.reduce((s, k) => s + k.capacity_gb, 0);
  const ssdSataGb = build.ssds.filter(s => s.storage_type === "SATA").reduce((sum, s) => sum + s.capacity_gb, 0);
  const ssdNvmeGb = build.ssds.filter(s => s.storage_type === "NVMe").reduce((sum, s) => sum + s.capacity_gb, 0);
  const hddGb     = build.hdds.reduce((sum, h) => sum + h.capacity_gb, 0);
  const cpuLabel  = build.cpu ? `${build.cpu.brand} ${build.cpu.model}` : "—";

  return (
    <aside className="sticky top-4 flex h-[calc(100vh-2rem)] flex-col rounded-lg border border-slate-800 bg-slate-900/80 p-5">
      <h2 className="mb-4 text-lg font-bold tracking-wide">Build Summary</h2>

      <div className="space-y-3">
        <Row label="Total Price" value={php(totals.price)} accent="emerald" />
        <Row label="Total Cost" value={php(totals.cost)} />
        <Row label="Profit" value={php(totals.profit)} accent="amber" />
        <Row label="Margin" value={`${totals.margin.toFixed(1)}%`} accent="amber" />
      </div>

      <div className="my-4 h-px bg-slate-800" />

      <div className="mb-3">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Specs</h3>
        <div className="space-y-1.5 text-xs">
          <SpecRow label="Processor" value={cpuLabel} truncate />
          <SpecRow label="Total RAM" value={totalRamGb > 0 ? `${totalRamGb} GB` : "—"} />
          <SpecRow label="NVMe" value={fmtCapacity(ssdNvmeGb)} />
          <SpecRow label="SSD (SATA)" value={fmtCapacity(ssdSataGb)} />
          <SpecRow label="HDD" value={fmtCapacity(hddGb)} />
        </div>
      </div>

      <div className="my-4 h-px bg-slate-800" />

      <div className="mb-3">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Compatibility ({issues.length})
        </h3>
        {issues.length === 0 ? (
          <p className="text-xs text-emerald-400">All compatible ✓</p>
        ) : (
          <ul className="space-y-1">
            {issues.map((i, idx) => (
              <li
                key={idx}
                className={`text-xs ${i.severity === "error" ? "text-rose-400" : "text-amber-400"}`}
              >
                • {i.message}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="my-4 h-px bg-slate-800" />

      <div className="space-y-2">
        <input
          value={buildName}
          onChange={e => onNameChange(e.target.value)}
          placeholder="Build name…"
          className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm focus:border-emerald-500 focus:outline-none"
        />
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onSave}
            className="rounded bg-emerald-600 px-2 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
          >
            Save
          </button>
          <button
            onClick={onExport}
            className="rounded bg-slate-700 px-2 py-1.5 text-xs font-semibold hover:bg-slate-600"
          >
            Export JSON
          </button>
          <button
            onClick={onReset}
            className="col-span-2 rounded border border-slate-700 px-2 py-1.5 text-xs hover:border-rose-500 hover:text-rose-400"
          >
            Reset Build
          </button>
          <button
            onClick={onMarkSold}
            disabled={buildItemCount === 0}
            className="col-span-2 rounded bg-amber-600 px-2 py-2 text-xs font-bold text-white hover:bg-amber-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
            title={buildItemCount === 0 ? "Add items first" : "Archive this build, remove items from inventory, record the sale"}
          >
            💰 Mark as Sold ({buildItemCount} items)
          </button>
        </div>
      </div>

      <div className="mt-4 flex-1 overflow-y-auto">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Saved Builds ({savedBuilds.length})
        </h3>
        <ul className="space-y-1">
          {savedBuilds.map(b => (
            <li key={b.id} className="flex items-center justify-between rounded bg-slate-950 px-2 py-1.5 text-xs">
              <button onClick={() => onLoad(b.id)} className="flex-1 truncate text-left hover:text-emerald-400">
                {b.name}
              </button>
              <button onClick={() => onDelete(b.id)} className="ml-2 text-rose-400 hover:text-rose-300">
                ×
              </button>
            </li>
          ))}
          {savedBuilds.length === 0 && (
            <li className="text-xs text-slate-500">No saved builds yet.</li>
          )}
        </ul>
      </div>
    </aside>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: "emerald" | "amber" }) {
  const color =
    accent === "emerald" ? "text-emerald-400" : accent === "amber" ? "text-amber-400" : "text-slate-200";
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs uppercase tracking-wider text-slate-400">{label}</span>
      <span className={`font-mono text-base font-semibold ${color}`}>{value}</span>
    </div>
  );
}

function SpecRow({ label, value, truncate }: { label: string; value: string; truncate?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="shrink-0 text-[10px] uppercase tracking-wider text-slate-500">{label}</span>
      <span className={`font-mono text-xs text-slate-200 ${truncate ? "truncate" : ""}`} title={value}>
        {value}
      </span>
    </div>
  );
}

function fmtCapacity(gb: number): string {
  if (gb <= 0) return "—";
  if (gb >= 1000) return `${(gb / 1000).toFixed(gb % 1000 === 0 ? 0 : 1)} TB`;
  return `${gb} GB`;
}
