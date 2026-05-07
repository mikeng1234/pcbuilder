import { useEffect, useMemo, useRef, useState } from "react";
import type { Category, Component } from "../types/components";
import { ALL_CATEGORIES, exportInventory, templateFor } from "../lib/inventory";
import { php } from "../lib/format";

interface Props {
  inventory: Component[];
  setInventory: (items: Component[]) => void | Promise<void>;
}

export function Inventory({ inventory, setInventory }: Props) {
  const [filter, setFilter] = useState<Category | "All">("All");
  const [editing, setEditing] = useState<Component | null>(null);
  const [isNew, setIsNew] = useState(false);

  // Categories to render as sections (always shows even if empty so the Add button is visible)
  const visibleCategories: Category[] = useMemo(
    () => filter === "All" ? ALL_CATEGORIES : [filter],
    [filter]
  );

  const itemsByCategory = useMemo(() => {
    const m: Record<string, Component[]> = {};
    for (const it of inventory) {
      (m[it.category] ||= []).push(it);
    }
    return m;
  }, [inventory]);

  const onSave = (item: Component) => {
    if (isNew) {
      setInventory([...inventory, item]);
    } else {
      setInventory(inventory.map(i => i.id === item.id ? item : i));
    }
    setEditing(null);
    setIsNew(false);
  };

  const onDelete = (id: string) => {
    if (!confirm("Delete this item from inventory?")) return;
    setInventory(inventory.filter(i => i.id !== id));
  };

  const onAddNew = (cat: Category) => {
    setEditing(templateFor(cat, inventory));
    setIsNew(true);
  };

  const patchItem = (id: string, patch: Partial<Component>) => {
    setInventory(inventory.map(i => i.id === id ? ({ ...i, ...patch } as Component) : i));
  };

  const onDuplicate = (item: Component) => {
    const copy: Component = {
      ...item,
      id: `${item.category.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
      model: `${item.model} (copy)`,
    } as Component;
    setInventory([...inventory, copy]);
  };

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-5">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-bold">Inventory Management</h2>
        <span className="text-xs text-slate-500">
          Source of truth: <code className="text-slate-400">src/data/database.json</code>
        </span>
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => exportInventory(inventory)}
            className="rounded bg-slate-700 px-3 py-1.5 text-xs font-semibold hover:bg-slate-600"
          >Export Backup</button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-1">
        <FilterChip active={filter === "All"} onClick={() => setFilter("All")}>All ({inventory.length})</FilterChip>
        {ALL_CATEGORIES.map(c => {
          const n = inventory.filter(i => i.category === c).length;
          return (
            <FilterChip key={c} active={filter === c} onClick={() => setFilter(c)}>
              {c} ({n})
            </FilterChip>
          );
        })}
      </div>

      {visibleCategories.map(cat => {
        const items = itemsByCategory[cat] ?? [];
        return (
          <div key={cat} className="mb-5">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                {cat} <span className="text-slate-500">({items.length})</span>
              </h3>
              <button
                onClick={() => onAddNew(cat)}
                className="rounded bg-emerald-700 px-2 py-1 text-[10px] font-semibold hover:bg-emerald-600"
              >+ Add {cat}</button>
            </div>
            <div className="overflow-hidden rounded border border-slate-800">
              <table className="w-full text-xs">
                <thead className="bg-slate-800 text-slate-400">
                  <tr>
                    <th className="px-3 py-1.5 text-left">Brand / Model</th>
                    <th className="px-3 py-1.5 text-left">Specs</th>
                    <th className="px-3 py-1.5 text-right">Cost</th>
                    <th className="px-3 py-1.5 text-right">Price</th>
                    <th className="px-3 py-1.5 text-right">Margin</th>
                    <th className="px-3 py-1.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr className="border-t border-slate-800">
                      <td colSpan={6} className="px-3 py-3 text-center text-slate-500">
                        No {cat} in inventory yet — click <span className="text-emerald-400">+ Add {cat}</span> above.
                      </td>
                    </tr>
                  ) : (
                    items.map(it => {
                      const margin = it.price > 0 ? ((it.price - it.cost) / it.price * 100).toFixed(0) : "—";
                      return (
                        <tr key={it.id} className="border-t border-slate-800 hover:bg-slate-800/50">
                          <td className="px-3 py-1.5">
                            <div className="flex flex-wrap items-center gap-1">
                              <InlineText
                                value={it.brand}
                                placeholder="brand"
                                onSave={v => patchItem(it.id, { brand: v } as Partial<Component>)}
                                className="font-semibold"
                              />
                              <InlineText
                                value={it.model}
                                placeholder="model"
                                onSave={v => patchItem(it.id, { model: v } as Partial<Component>)}
                                className="text-slate-300"
                              />
                            </div>
                          </td>
                          <td className="px-3 py-1.5 text-slate-400">{specSummary(it)}</td>
                          <td className="px-3 py-1.5 text-right font-mono">
                            <InlineNumber
                              value={it.cost}
                              onSave={v => patchItem(it.id, { cost: v } as Partial<Component>)}
                              format={php}
                              align="right"
                            />
                          </td>
                          <td className="px-3 py-1.5 text-right font-mono text-emerald-400">
                            <InlineNumber
                              value={it.price}
                              onSave={v => patchItem(it.id, { price: v } as Partial<Component>)}
                              format={php}
                              align="right"
                            />
                          </td>
                          <td className="px-3 py-1.5 text-right font-mono text-amber-400">{margin}%</td>
                          <td className="px-3 py-1.5 text-right">
                            <button
                              onClick={() => { setEditing(it); setIsNew(false); }}
                              className="text-emerald-400 hover:text-emerald-300"
                            >edit</button>
                            <span className="mx-1.5 text-slate-700">|</span>
                            <button
                              onClick={() => onDuplicate(it)}
                              className="text-sky-400 hover:text-sky-300"
                              title="Duplicate this item"
                            >dup</button>
                            <span className="mx-1.5 text-slate-700">|</span>
                            <button
                              onClick={() => onDelete(it.id)}
                              className="text-rose-400 hover:text-rose-300"
                            >del</button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {editing && (
        <EditModal
          item={editing}
          isNew={isNew}
          onSave={onSave}
          onClose={() => { setEditing(null); setIsNew(false); }}
        />
      )}
    </div>
  );
}

// ---------- Inline editable cells ----------
function InlineText({
  value, onSave, placeholder, className = "",
}: { value: string; onSave: (v: string) => void; placeholder?: string; className?: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (!editing) setDraft(value); }, [value, editing]);
  useEffect(() => { if (editing) inputRef.current?.select(); }, [editing]);

  const commit = () => {
    setEditing(false);
    if (draft !== value) onSave(draft);
  };
  const cancel = () => { setEditing(false); setDraft(value); };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); }
          else if (e.key === "Escape") { e.preventDefault(); cancel(); }
        }}
        className="rounded border border-emerald-600 bg-slate-950 px-1 py-0.5 text-xs outline-none"
      />
    );
  }
  return (
    <span
      onClick={() => setEditing(true)}
      className={`cursor-text rounded px-1 hover:bg-slate-800 ${className} ${value ? "" : "italic text-slate-500"}`}
      title="Click to edit"
    >
      {value || placeholder || "—"}
    </span>
  );
}

function InlineNumber({
  value, onSave, format, align = "left",
}: {
  value: number; onSave: (v: number) => void;
  format?: (n: number) => string;
  align?: "left" | "right";
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (!editing) setDraft(String(value)); }, [value, editing]);
  useEffect(() => { if (editing) inputRef.current?.select(); }, [editing]);

  const commit = () => {
    setEditing(false);
    const n = Number(draft);
    if (!Number.isNaN(n) && n !== value) onSave(n);
    else setDraft(String(value));
  };
  const cancel = () => { setEditing(false); setDraft(String(value)); };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        step="any"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); }
          else if (e.key === "Escape") { e.preventDefault(); cancel(); }
        }}
        className={`w-24 rounded border border-emerald-600 bg-slate-950 px-1 py-0.5 text-xs outline-none ${align === "right" ? "text-right" : ""}`}
      />
    );
  }
  return (
    <span
      onClick={() => setEditing(true)}
      className="cursor-text rounded px-1 hover:bg-slate-800"
      title="Click to edit"
    >
      {format ? format(value) : value}
    </span>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={[
        "rounded-full px-3 py-1 text-xs",
        active ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function specSummary(c: Component): string {
  switch (c.category) {
    case "CPU": return `${c.socket} · ${c.supported_memory} · ${c.tdp_w}W`;
    case "Motherboard": return `${c.socket} · ${c.form_factor} · ${c.ram_type} · ${c.max_ram_slots}DIMM · ${c.nvme_slots}M.2 · ${c.sata_ports}SATA`;
    case "RAM": return `${c.ram_type} · ${c.capacity_gb}GB · ${c.speed_mhz}MHz · ${c.module_count}-stick`;
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

// ---------- Edit Modal ----------
function EditModal({
  item, isNew, onSave, onClose,
}: { item: Component; isNew: boolean; onSave: (i: Component) => void; onClose: () => void }) {
  const [draft, setDraft] = useState<any>({ ...item });

  const setField = (k: string, v: any) => setDraft((d: any) => ({ ...d, [k]: v }));

  const fields = Object.keys(draft).filter(k => k !== "category");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-xl rounded-xl border border-slate-700 bg-slate-900 p-5" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold">
            {isNew ? "Add" : "Edit"} {item.category}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-rose-400">✕</button>
        </div>

        <div className="grid max-h-[60vh] grid-cols-2 gap-3 overflow-y-auto pr-2">
          {fields.map(k => {
            const v = draft[k];
            const readOnly = k === "id" && !isNew;
            if (Array.isArray(v)) {
              return (
                <Field key={k} label={k} span2>
                  <input
                    type="text"
                    value={v.join(", ")}
                    onChange={e => setField(k, e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
                    className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm"
                  />
                </Field>
              );
            }
            if (typeof v === "number") {
              return (
                <Field key={k} label={k}>
                  <input
                    type="number"
                    value={v}
                    onChange={e => setField(k, Number(e.target.value))}
                    className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm font-mono"
                  />
                </Field>
              );
            }
            return (
              <Field key={k} label={k}>
                <input
                  type="text"
                  value={v ?? ""}
                  readOnly={readOnly}
                  onChange={e => setField(k, e.target.value)}
                  className={`w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm ${readOnly ? "opacity-50" : ""}`}
                />
              </Field>
            );
          })}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded bg-slate-700 px-4 py-1.5 text-sm hover:bg-slate-600">Cancel</button>
          <button
            onClick={() => onSave(draft)}
            className="rounded bg-emerald-600 px-4 py-1.5 text-sm font-semibold hover:bg-emerald-500"
          >Save</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, span2 }: { label: string; children: React.ReactNode; span2?: boolean }) {
  return (
    <label className={`flex flex-col gap-1 ${span2 ? "col-span-2" : ""}`}>
      <span className="text-[10px] uppercase tracking-wider text-slate-400">{label}</span>
      {children}
    </label>
  );
}
