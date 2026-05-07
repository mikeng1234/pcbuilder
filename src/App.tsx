import { useEffect, useMemo, useState } from "react";
import type {
  Build, Case, Component, CPU, CPUCooler, ExtenderCable, Fans,
  GPU, HDD, Monitor, Motherboard, PeripheralsCombo, PSU, RAM, SavedBuild, SSD,
} from "./types/components";
import { Slot, MultiSlot } from "./components/Slot";
import { PickerModal } from "./components/PickerModal";
import { SummaryPanel } from "./components/SummaryPanel";
import { Inventory } from "./components/Inventory";
import { Sales } from "./components/Sales";
import { emptyBuild } from "./lib/compatibility";
import { listSales, recordSale, deleteSale, type Sale } from "./lib/sales";
import {
  deleteSavedBuild, exportBuildAsJson, listSavedBuilds, saveBuild,
} from "./lib/storage";
import { loadInventory, saveInventory, type StorageMode } from "./lib/inventory";

type PickerKey =
  | "Case" | "Motherboard" | "CPU" | "CPU Cooler" | "GPU" | "PSU"
  | "RAM" | "SSD" | "HDD" | "Fans" | "ExtenderCable" | "PeripheralsCombo" | "Monitor";

type Tab = "build" | "inventory" | "sales";

export default function App() {
  const [tab, setTab] = useState<Tab>("build");
  const [inventory, setInventoryState] = useState<Component[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [mode, setMode] = useState<StorageMode>("seed");
  const [build, setBuild] = useState<Build>(emptyBuild());
  const [buildName, setBuildName] = useState("");
  const [savedBuilds, setSavedBuilds] = useState<SavedBuild[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [picker, setPicker] = useState<PickerKey | null>(null);

  useEffect(() => { setSavedBuilds(listSavedBuilds()); }, []);
  useEffect(() => {
    listSales().then(setSales).catch(err => console.warn("Failed to load sales:", err.message));
  }, []);

  // Load inventory from Supabase (falls back to bundled seed if not configured)
  useEffect(() => {
    let cancelled = false;
    loadInventory()
      .then(({ items, mode, error }) => {
        if (cancelled) return;
        setInventoryState(items);
        setMode(mode);
        setLoading(false);
        if (error) { setSaveError(error); setSaveStatus("error"); }
      })
      .catch(err => {
        if (!cancelled) {
          setSaveError(`Load failed: ${err.message}`);
          setSaveStatus("error");
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  const setInventory = async (items: Component[]) => {
    setInventoryState(items); // optimistic
    setSaveStatus("saving");
    try {
      const m = await saveInventory(items);
      setMode(m);
      setSaveStatus("saved");
      setSaveError(null);
      setTimeout(() => setSaveStatus(s => s === "saved" ? "idle" : s), 1500);
    } catch (e: any) {
      setSaveStatus("error");
      setSaveError(e.message);
    }
  };

  const byCat = <T extends Component>(cat: T["category"]) =>
    inventory.filter(c => c.category === cat) as T[];

  const inv = useMemo(() => ({
    Case: byCat<Case>("Case"),
    Motherboard: byCat<Motherboard>("Motherboard"),
    CPU: byCat<CPU>("CPU"),
    "CPU Cooler": byCat<CPUCooler>("CPU Cooler"),
    GPU: byCat<GPU>("GPU"),
    PSU: byCat<PSU>("PSU"),
    RAM: byCat<RAM>("RAM"),
    SSD: byCat<SSD>("SSD"),
    HDD: byCat<HDD>("HDD"),
    Fans: byCat<Fans>("Fans"),
    ExtenderCable: byCat<ExtenderCable>("ExtenderCable"),
    PeripheralsCombo: byCat<PeripheralsCombo>("PeripheralsCombo"),
    Monitor: byCat<Monitor>("Monitor"),
  }), [inventory]);

  const onPick = (item: Component) => {
    switch (item.category) {
      case "Case":         setBuild(b => ({ ...b, case: item })); break;
      case "Motherboard":  setBuild(b => ({ ...b, motherboard: item })); break;
      case "CPU":          setBuild(b => ({ ...b, cpu: item })); break;
      case "CPU Cooler":   setBuild(b => ({ ...b, cpuCooler: item })); break;
      case "GPU":          setBuild(b => ({ ...b, gpu: item })); break;
      case "PSU":          setBuild(b => ({ ...b, psu: item })); break;
      case "RAM":          setBuild(b => ({ ...b, ramKits: [...b.ramKits, item] })); break;
      case "SSD":          setBuild(b => ({ ...b, ssds: [...b.ssds, item] })); break;
      case "HDD":          setBuild(b => ({ ...b, hdds: [...b.hdds, item] })); break;
      case "Fans":         setBuild(b => ({ ...b, fans: [...b.fans, item] })); break;
      case "ExtenderCable":setBuild(b => ({ ...b, extenderCables: [...b.extenderCables, item] })); break;
      case "PeripheralsCombo": setBuild(b => ({ ...b, peripherals: [...b.peripherals, item] })); break;
      case "Monitor":      setBuild(b => ({ ...b, monitors: [...b.monitors, item] })); break;
    }
  };

  // Collect every component ID currently used somewhere in the build —
  // these are filtered out of pickers so the same physical item can't be assigned twice.
  const usedIds = useMemo(() => {
    const ids = new Set<string>();
    const add = (c: Component | null | undefined) => { if (c) ids.add(c.id); };
    add(build.motherboard);
    add(build.cpu);
    add(build.cpuCooler);
    add(build.psu);
    add(build.gpu);
    add(build.case);
    build.ramKits.forEach(r => ids.add(r.id));
    build.ssds.forEach(s => ids.add(s.id));
    build.hdds.forEach(h => ids.add(h.id));
    build.fans.forEach(f => ids.add(f.id));
    build.extenderCables.forEach(e => ids.add(e.id));
    build.peripherals.forEach(p => ids.add(p.id));
    build.monitors.forEach(m => ids.add(m.id));
    return ids;
  }, [build]);

  // For single-pick slots we still want the current selection visible (so the user can
  // see "yes that's what's selected" and pick a swap). Multi-pick slots filter strictly.
  const currentSinglePickId: string | null =
    picker === "Motherboard" ? build.motherboard?.id ?? null :
    picker === "CPU"         ? build.cpu?.id ?? null :
    picker === "CPU Cooler"  ? build.cpuCooler?.id ?? null :
    picker === "GPU"         ? build.gpu?.id ?? null :
    picker === "PSU"         ? build.psu?.id ?? null :
    picker === "Case"        ? build.case?.id ?? null :
    null;

  const pickerItems: Component[] = picker
    ? inv[picker].filter(i => !usedIds.has(i.id) || i.id === currentSinglePickId)
    : [];
  const pickerTitle = picker ? `Choose ${picker}` : "";

  // Collect every component currently placed in the build (for sold archiving + count)
  const buildItems = useMemo<Component[]>(() => {
    const out: Component[] = [];
    if (build.motherboard) out.push(build.motherboard);
    if (build.cpu)         out.push(build.cpu);
    if (build.cpuCooler)   out.push(build.cpuCooler);
    if (build.psu)         out.push(build.psu);
    if (build.gpu)         out.push(build.gpu);
    if (build.case)        out.push(build.case);
    out.push(...build.ramKits, ...build.ssds, ...build.hdds, ...build.fans,
             ...build.extenderCables, ...build.peripherals, ...build.monitors);
    return out;
  }, [build]);

  const handleMarkSold = async () => {
    if (buildItems.length === 0) return;
    const gross = buildItems.reduce((s, i) => s + (Number(i.price) || 0), 0);
    const cost  = buildItems.reduce((s, i) => s + (Number(i.cost)  || 0), 0);
    const net   = gross - cost;
    const ok = confirm(
      `Mark this build as SOLD?\n\n` +
      `Items: ${buildItems.length}\n` +
      `Gross: ₱${gross.toFixed(2)}\n` +
      `Cost:  ₱${cost.toFixed(2)}\n` +
      `Net:   ₱${net.toFixed(2)}\n\n` +
      `These ${buildItems.length} items will be removed from inventory and archived in Sales.`
    );
    if (!ok) return;
    try {
      await recordSale({ name: buildName, items: buildItems });
      // Remove sold items from inventory (this saves to Supabase)
      const soldIds = new Set(buildItems.map(i => i.id));
      await setInventory(inventory.filter(i => !soldIds.has(i.id)));
      // Refresh sales list and reset build
      const fresh = await listSales();
      setSales(fresh);
      setBuild(emptyBuild());
      setBuildName("");
    } catch (e: any) {
      setSaveStatus("error");
      setSaveError(e.message);
    }
  };

  const handleDeleteSale = async (id: string) => {
    try {
      await deleteSale(id);
      setSales(await listSales());
    } catch (e: any) {
      setSaveStatus("error");
      setSaveError(e.message);
    }
  };

  const handleRestoreSale = async (sale: Sale) => {
    if (!confirm(`Restore ${sale.items.length} item(s) back to inventory and remove this archive entry?`)) return;
    try {
      // Dedupe by id within the snapshot itself, then drop ones already in inventory
      const merged = new Map<string, Component>();
      for (const i of inventory) merged.set(i.id, i);
      for (const i of sale.items) if (!merged.has(i.id)) merged.set(i.id, i);
      await setInventory(Array.from(merged.values()));
      await deleteSale(sale.id);
      setSales(await listSales());
    } catch (e: any) {
      setSaveStatus("error");
      setSaveError(e.message);
    }
  };

  const handleSave = () => { saveBuild(buildName, build); setSavedBuilds(listSavedBuilds()); };
  const handleLoad = (id: string) => {
    const f = savedBuilds.find(s => s.id === id);
    if (f) { setBuild(f.build); setBuildName(f.name); }
  };
  const handleDelete = (id: string) => { deleteSavedBuild(id); setSavedBuilds(listSavedBuilds()); };
  const handleExport = () => exportBuildAsJson(buildName, build);
  const handleReset = () => { setBuild(emptyBuild()); setBuildName(""); };

  const ssdNvme = build.ssds.filter(s => s.storage_type === "NVMe");
  const ssdSata = build.ssds.filter(s => s.storage_type === "SATA");

  return (
    <div className="mx-auto max-w-[1700px] p-4">
      <header className="mb-4 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">🖥️ PC Builder</h1>
          <p className="text-sm text-slate-400">Click any slot to choose a part — incompatible items are dimmed.</p>
        </div>
        <div className="flex items-center gap-3">
          <ModeBadge mode={mode} />
          <SaveStatus status={saveStatus} error={saveError} />
          <nav className="flex gap-1 rounded-lg bg-slate-800 p-1">
            <TabButton active={tab === "build"} onClick={() => setTab("build")}>🔧 Build</TabButton>
            <TabButton active={tab === "inventory"} onClick={() => setTab("inventory")}>
              📦 Inventory ({inventory.length})
            </TabButton>
            <TabButton active={tab === "sales"} onClick={() => setTab("sales")}>
              📦 Archived ({sales.length})
            </TabButton>
          </nav>
        </div>
      </header>

      {loading && (
        <div className="mb-4 rounded border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-400">
          Loading inventory from file…
        </div>
      )}

      {tab === "inventory" ? (
        <Inventory inventory={inventory} setInventory={setInventory} />
      ) : tab === "sales" ? (
        <Sales sales={sales} onDelete={handleDeleteSale} onRestore={handleRestoreSale} />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
          <main>
            {/* Outside the case */}
            <section className="mb-3 grid grid-cols-2 gap-3">
              <MultiSlot
                label="Monitors"
                items={build.monitors}
                onAdd={() => setPicker("Monitor")}
                onRemove={id => setBuild(b => ({ ...b, monitors: b.monitors.filter(m => m.id !== id) }))}
              />
              <MultiSlot
                label="Peripherals (Keyboard + Mouse)"
                items={build.peripherals}
                onAdd={() => setPicker("PeripheralsCombo")}
                onRemove={id => setBuild(b => ({ ...b, peripherals: b.peripherals.filter(x => x.id !== id) }))}
              />
            </section>

            {/* THE CASE */}
            <section className="relative rounded-xl border-4 border-slate-500 bg-gradient-to-b from-slate-900 to-slate-950 p-4 shadow-2xl" style={{ minHeight: 640 }}>
              <div className="absolute -top-3 left-4 rounded bg-slate-800 px-2 py-0.5 text-xs font-bold uppercase tracking-widest text-slate-200">
                {build.case ? `Case · ${build.case.brand} ${build.case.model}` : "Case"}
              </div>
              <div className="absolute right-4 top-1 flex gap-2">
                {build.case ? (
                  <>
                    <button onClick={() => setPicker("Case")} className="text-[10px] text-slate-400 hover:text-emerald-400">change</button>
                    <button onClick={() => setBuild(b => ({ ...b, case: null }))} className="text-[10px] text-rose-400 hover:text-rose-300">clear</button>
                  </>
                ) : (
                  <button onClick={() => setPicker("Case")} className="rounded bg-emerald-700 px-2 py-0.5 text-[10px] font-semibold hover:bg-emerald-600">+ Choose Case</button>
                )}
              </div>

              <div className="mt-4 grid grid-cols-12 gap-3">
                {/* LEFT */}
                <div className="col-span-3 space-y-3">
                  <MultiSlot
                    label="Case Fans"
                    items={build.fans}
                    onAdd={() => setPicker("Fans")}
                    onRemove={id => setBuild(b => ({ ...b, fans: b.fans.filter(f => f.id !== id) }))}
                  />
                  <MultiSlot
                    label="Extender Cables"
                    items={build.extenderCables}
                    onAdd={() => setPicker("ExtenderCable")}
                    onRemove={id => setBuild(b => ({ ...b, extenderCables: b.extenderCables.filter(e => e.id !== id) }))}
                  />
                </div>

                {/* CENTER — MOTHERBOARD */}
                <div className="col-span-9">
                  <div className="relative rounded-lg border-4 border-emerald-800/60 bg-slate-800/60 p-3">
                    <div className="absolute -top-3 left-3 rounded bg-emerald-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-emerald-300">
                      {build.motherboard
                        ? `MOBO · ${build.motherboard.brand} ${build.motherboard.model}`
                        : "Motherboard"}
                    </div>
                    <div className="absolute right-2 top-1 flex gap-2">
                      {build.motherboard ? (
                        <>
                          <button onClick={() => setPicker("Motherboard")} className="text-[10px] text-slate-400 hover:text-emerald-400">change</button>
                          <button onClick={() => setBuild(b => ({ ...b, motherboard: null }))} className="text-[10px] text-rose-400 hover:text-rose-300">clear</button>
                        </>
                      ) : (
                        <button onClick={() => setPicker("Motherboard")} className="rounded bg-emerald-700 px-2 py-0.5 text-[10px] font-semibold hover:bg-emerald-600">+ Choose Motherboard</button>
                      )}
                    </div>

                    <div className="mt-4 grid grid-cols-6 gap-2">
                      <Slot
                        label="CPU"
                        item={build.cpu}
                        onClick={() => setPicker("CPU")}
                        onClear={() => setBuild(b => ({ ...b, cpu: null }))}
                        className="col-span-3 h-20"
                      />
                      <Slot
                        label="CPU Cooler"
                        item={build.cpuCooler}
                        onClick={() => setPicker("CPU Cooler")}
                        onClear={() => setBuild(b => ({ ...b, cpuCooler: null }))}
                        className="col-span-3 h-20"
                      />

                      <div className="col-span-6">
                        <DimmRow
                          mobo={build.motherboard}
                          kits={build.ramKits}
                          onAdd={() => setPicker("RAM")}
                          onRemoveKit={kitIndex => setBuild(b => ({ ...b, ramKits: b.ramKits.filter((_, i) => i !== kitIndex) }))}
                        />
                      </div>

                      <Slot
                        label="GPU (PCIe x16)"
                        item={build.gpu}
                        onClick={() => setPicker("GPU")}
                        onClear={() => setBuild(b => ({ ...b, gpu: null }))}
                        className="col-span-6 h-16"
                      />

                      <div className="col-span-3">
                        <NvmeRow
                          mobo={build.motherboard}
                          drives={ssdNvme}
                          onAdd={() => setPicker("SSD")}
                          onRemove={id => setBuild(b => ({ ...b, ssds: b.ssds.filter(s => s.id !== id) }))}
                        />
                      </div>
                      <div className="col-span-3 space-y-2">
                        <MultiSlot
                          label="SATA (SSD)"
                          items={ssdSata}
                          capacity={build.motherboard ? build.motherboard.sata_ports - build.hdds.length : undefined}
                          onAdd={() => setPicker("SSD")}
                          onRemove={id => setBuild(b => ({ ...b, ssds: b.ssds.filter(s => s.id !== id) }))}
                        />
                        <MultiSlot
                          label="SATA (HDD)"
                          items={build.hdds}
                          capacity={build.motherboard ? build.motherboard.sata_ports - ssdSata.length : undefined}
                          onAdd={() => setPicker("HDD")}
                          onRemove={id => setBuild(b => ({ ...b, hdds: b.hdds.filter(h => h.id !== id) }))}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <Slot
                  label="PSU Bay"
                  item={build.psu}
                  onClick={() => setPicker("PSU")}
                  onClear={() => setBuild(b => ({ ...b, psu: null }))}
                  className="h-14"
                />
              </div>
            </section>
          </main>

          <SummaryPanel
            build={build}
            savedBuilds={savedBuilds}
            buildName={buildName}
            onNameChange={setBuildName}
            onSave={handleSave}
            onLoad={handleLoad}
            onDelete={handleDelete}
            onExport={handleExport}
            onReset={handleReset}
            onMarkSold={handleMarkSold}
            buildItemCount={buildItems.length}
          />
        </div>
      )}

      <PickerModal
        open={!!picker}
        title={pickerTitle}
        items={pickerItems}
        build={build}
        onPick={onPick}
        onClose={() => setPicker(null)}
      />
    </div>
  );
}

// Discrete DIMM slots tied to motherboard.max_ram_slots.
// Each kit's module_count occupies that many visual positions; clicking × removes the kit.
function DimmRow({
  mobo, kits, onAdd, onRemoveKit,
}: {
  mobo: Motherboard | null;
  kits: RAM[];
  onAdd: () => void;
  onRemoveKit: (kitIndex: number) => void;
}) {
  const total = mobo?.max_ram_slots ?? 0;
  type Cell = { kit: RAM; kitIndex: number; first: boolean } | null;
  const cells: Cell[] = [];
  kits.forEach((kit, kitIndex) => {
    for (let i = 0; i < kit.module_count; i++) {
      cells.push({ kit, kitIndex, first: i === 0 });
    }
  });
  while (cells.length < total) cells.push(null);
  const usedSticks = kits.reduce((s, k) => s + k.module_count, 0);

  return (
    <div className="rounded border-2 border-dashed border-slate-600 bg-slate-900/40 p-2">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          RAM (DIMM Slots){mobo ? ` · ${usedSticks}/${total} sticks` : ""}
        </span>
      </div>
      {!mobo ? (
        <div className="text-xs text-slate-500">Select a motherboard to see DIMM slots.</div>
      ) : total === 0 ? (
        <div className="text-xs text-slate-500">Motherboard has no DIMM slots.</div>
      ) : (
        <div className={`grid gap-1 ${total >= 4 ? "grid-cols-4" : "grid-cols-2"}`}>
          {cells.slice(0, total).map((cell, idx) => {
            if (!cell) {
              return (
                <div
                  key={idx}
                  onClick={onAdd}
                  className="flex h-12 cursor-pointer flex-col justify-center rounded border-2 border-dashed border-slate-600 bg-slate-900/40 px-2 hover:border-emerald-500"
                >
                  <div className="text-[9px] uppercase tracking-wider text-slate-500">DIMM {idx + 1}</div>
                  <div className="text-[10px] text-slate-500">+ Add</div>
                </div>
              );
            }
            return (
              <div
                key={idx}
                className="group relative flex h-12 flex-col justify-center rounded border-2 border-emerald-600/60 bg-emerald-950/30 px-2"
              >
                <div className="text-[9px] uppercase tracking-wider text-emerald-400">DIMM {idx + 1}</div>
                <div className="truncate text-[10px] text-slate-100">
                  {cell.first ? `${cell.kit.brand} ${cell.kit.capacity_gb}GB-${cell.kit.speed_mhz}` : "↑ same kit"}
                </div>
                {cell.first && (
                  <button
                    onClick={() => onRemoveKit(cell.kitIndex)}
                    className="absolute right-1 top-0.5 hidden text-rose-400 hover:text-rose-300 group-hover:block"
                    title="Remove this kit"
                  >×</button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Discrete NVMe (M.2) slots tied to motherboard.nvme_slots.
function NvmeRow({
  mobo, drives, onAdd, onRemove,
}: {
  mobo: Motherboard | null;
  drives: SSD[];
  onAdd: () => void;
  onRemove: (id: string) => void;
}) {
  const total = mobo?.nvme_slots ?? 0;
  return (
    <div className="rounded border-2 border-dashed border-slate-600 bg-slate-900/40 p-2">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        NVMe (M.2){mobo ? ` · ${drives.length}/${total}` : ""}
      </div>
      {!mobo ? (
        <div className="text-xs text-slate-500">Select a motherboard.</div>
      ) : total === 0 ? (
        <div className="text-xs text-slate-500">No M.2 slots on this motherboard.</div>
      ) : (
        <div className="grid grid-cols-1 gap-1">
          {Array.from({ length: total }).map((_, idx) => {
            const item = drives[idx];
            if (!item) {
              return (
                <div
                  key={idx}
                  onClick={onAdd}
                  className="flex cursor-pointer flex-col rounded border-2 border-dashed border-slate-600 bg-slate-900/40 px-2 py-1 hover:border-emerald-500"
                >
                  <div className="text-[9px] uppercase tracking-wider text-slate-500">M.2_{idx + 1}</div>
                  <div className="text-[10px] text-slate-500">+ Add</div>
                </div>
              );
            }
            return (
              <div
                key={idx}
                className="group relative flex flex-col rounded border-2 border-emerald-600/60 bg-emerald-950/30 px-2 py-1"
              >
                <div className="text-[9px] uppercase tracking-wider text-emerald-400">M.2_{idx + 1}</div>
                <div className="truncate text-[10px] text-slate-100">
                  {item.brand} {item.capacity_gb}GB
                </div>
                <button
                  onClick={() => onRemove(item.id)}
                  className="absolute right-1 top-0.5 hidden text-rose-400 hover:text-rose-300 group-hover:block"
                  title="Remove drive"
                >×</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ModeBadge({ mode }: { mode: StorageMode }) {
  const map = {
    supabase: { label: "🟢 Supabase", cls: "bg-emerald-900/40 text-emerald-300" },
    seed:     { label: "🌱 Seed (Supabase not configured)", cls: "bg-amber-900/40 text-amber-300" },
    error:    { label: "✗ DB error", cls: "bg-rose-900/40 text-rose-300" },
  } as const;
  const m = map[mode];
  return <span className={`rounded px-3 py-1 text-xs font-semibold ${m.cls}`} title={modeTooltip(mode)}>{m.label}</span>;
}
function modeTooltip(mode: StorageMode) {
  if (mode === "supabase") return "Reading and writing to Supabase Postgres.";
  if (mode === "error") return "Could not connect to Supabase. Edits won't persist.";
  return "VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are missing. Showing bundled seed.";
}

function SaveStatus({ status, error }: { status: "idle" | "saving" | "saved" | "error"; error: string | null }) {
  if (status === "idle") return null;
  const styles = {
    saving: "bg-amber-900/50 text-amber-300",
    saved:  "bg-emerald-900/50 text-emerald-300",
    error:  "bg-rose-900/50 text-rose-300",
  } as const;
  const label = {
    saving: "💾 Saving to file…",
    saved:  "✓ Saved to database.json",
    error:  `✗ ${error ?? "Save failed"}`,
  } as const;
  return <span className={`rounded px-3 py-1 text-xs font-semibold ${styles[status]}`}>{label[status]}</span>;
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={[
        "rounded-md px-4 py-1.5 text-sm font-semibold transition",
        active ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-slate-100",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
