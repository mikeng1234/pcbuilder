import type { Component, Category } from "../types/components";
import bundled from "../data/database.json";
import { supabase, isSupabaseConfigured } from "./supabase";

const SEED: Component[] = (bundled as { components: Component[] }).components;
const TABLE = "components";

export type StorageMode = "supabase" | "seed" | "error";

export interface LoadResult {
  items: Component[];
  mode: StorageMode;
  error?: string;
}

// ---------- Load ----------
export async function loadInventory(): Promise<LoadResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { items: SEED, mode: "seed" };
  }

  const { data, error } = await supabase
    .from(TABLE)
    .select("data")
    .order("category", { ascending: true });

  if (error) {
    return { items: SEED, mode: "error", error: error.message };
  }

  // Empty table → seed from bundled JSON, then return seed items
  if (!data || data.length === 0) {
    try {
      await seedFromBundle();
      return { items: SEED, mode: "supabase" };
    } catch (e: any) {
      return { items: SEED, mode: "error", error: `Seed failed: ${e.message}` };
    }
  }

  return {
    items: data.map(r => r.data as Component),
    mode: "supabase",
  };
}

// ---------- Save (diff: delete removed, upsert all current) ----------
export async function saveInventory(items: Component[]): Promise<StorageMode> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }

  // Find which IDs in DB are no longer in items
  const { data: existing, error: e1 } = await supabase.from(TABLE).select("id");
  if (e1) throw new Error(e1.message);

  const existingIds = new Set((existing ?? []).map(r => r.id));
  const newIds = new Set(items.map(i => i.id));
  const toDelete = [...existingIds].filter(id => !newIds.has(id));

  if (toDelete.length > 0) {
    const { error } = await supabase.from(TABLE).delete().in("id", toDelete);
    if (error) throw new Error(error.message);
  }

  if (items.length > 0) {
    const rows = items.map(i => ({ id: i.id, category: i.category, data: i }));
    const { error } = await supabase.from(TABLE).upsert(rows);
    if (error) throw new Error(error.message);
  }

  return "supabase";
}

// ---------- Seed an empty table ----------
async function seedFromBundle(): Promise<void> {
  if (!supabase) return;
  const rows = SEED.map(i => ({ id: i.id, category: i.category, data: i }));
  if (rows.length === 0) return;
  const { error } = await supabase.from(TABLE).insert(rows);
  if (error) throw new Error(error.message);
}

// ---------- Export for backup ----------
export function exportInventory(items: Component[]): void {
  const blob = new Blob([JSON.stringify({ components: items }, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `database.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---------- Skeletons / new-item template ----------
const SKELETONS: Record<Category, Record<string, any>> = {
  CPU:              { socket: "AM4", supported_memory: "DDR4", tdp_w: 65 },
  Motherboard:      { socket: "AM4", form_factor: "ATX", ram_type: "DDR4", max_ram_slots: 4, nvme_slots: 1, sata_ports: 4 },
  RAM:              { ram_type: "DDR4", capacity_gb: 8, speed_mhz: 2666, module_count: 1 },
  SSD:              { storage_type: "SATA", capacity_gb: 240 },
  HDD:              { storage_type: "SATA", capacity_gb: 1000 },
  GPU:              { length_mm: 200, recommended_psu_w: 300 },
  Case:             { supported_form_factors: ["ATX", "mATX", "ITX"], max_gpu_length_mm: 320 },
  PSU:              { wattage: 500, form_factor: "ATX" },
  "CPU Cooler":     { supported_sockets: ["AM4", "LGA1151", "LGA1200"] },
  Fans:             { size_mm: 120 },
  ExtenderCable:    {},
  PeripheralsCombo: {},
  Monitor:          { size_inches: 24 },
};

export function templateFor(category: Category, items: Component[]): Component {
  const sample = items.find(i => i.category === category) ?? SEED.find(i => i.category === category);
  const base: any = {
    id: `${category.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
    category,
    brand: "",
    model: "",
    cost: 0,
    price: 0,
  };
  if (sample) {
    for (const k of Object.keys(sample)) {
      if (k in base) continue;
      const v = (sample as any)[k];
      if (Array.isArray(v)) base[k] = [...v];
      else if (typeof v === "number") base[k] = 0;
      else if (typeof v === "string") base[k] = v;
      else base[k] = v;
    }
  } else {
    Object.assign(base, SKELETONS[category]);
  }
  return base as Component;
}

export const ALL_CATEGORIES: Category[] = [
  "Case", "Motherboard", "CPU", "CPU Cooler", "GPU", "PSU",
  "RAM", "SSD", "HDD", "Fans", "ExtenderCable", "PeripheralsCombo", "Monitor",
];
