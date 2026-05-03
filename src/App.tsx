import { useEffect, useMemo, useState } from "react";
import type {
  Build, Case, Component, CPU, CPUCooler, ExtenderCable, Fans,
  GPU, HDD, Monitor, Motherboard, PeripheralsCombo, PSU, RAM, SavedBuild, SSD,
} from "./types/components";
import { Slot, MultiSlot } from "./components/Slot";
import { PickerModal } from "./components/PickerModal";
import { SummaryPanel } from "./components/SummaryPanel";
import { Inventory } from "./components/Inventory";
import { emptyBuild } from "./lib/compatibility";
import {
  deleteSavedBuild, exportBuildAsJson, listSavedBuilds, saveBuild,
} from "./lib/storage";
import { loadInventory, saveInventory, type StorageMode } from "./lib/inventory";

type PickerKey =
  | "Case" | "Motherboard" | "CPU" | "CPU Cooler" | "GPU" | "PSU"
  | "RAM" | "SSD" | "HDD" | "Fans" | "ExtenderCable" | "PeripheralsCombo" | "Monitor";

type Tab = "build" | "inventory";

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
  const [picker, setPicker] = useState<PickerKey | null>(null);

  useEffect(() => { setSavedBuilds(listSavedBuilds()); }, []);

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

  const pickerItems: Component[] = picker ? inv[picker] : [];
  const pickerTitle = picker ? `Choose ${picker}` : "";

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
                        <MultiSlot
                          label="RAM (DIMM Slots)"
                          items={build.ramKits}
                          capacity={build.motherboard?.max_ram_slots}
                          onAdd={() => setPicker("RAM")}
                          onRemove={id => setBuild(b => ({ ...b, ramKits: b.ramKits.filter(r => r.id !== id) }))}
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
                        <MultiSlot
                          label="NVMe (M.2)"
                          items={ssdNvme}
                          capacity={build.motherboard?.nvme_slots}
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
