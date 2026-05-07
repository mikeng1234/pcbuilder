import type { Component } from "../types/components";
import { supabase, isSupabaseConfigured } from "./supabase";

export interface Sale {
  id: string;
  name: string | null;
  items: Component[];
  gross: number;
  cost: number;
  net: number;
  sold_at: string;
}

export async function recordSale(opts: {
  name: string;
  items: Component[];
}): Promise<Sale> {
  if (!isSupabaseConfigured || !supabase) throw new Error("Supabase not configured.");
  const gross = opts.items.reduce((s, i) => s + (Number(i.price) || 0), 0);
  const cost  = opts.items.reduce((s, i) => s + (Number(i.cost) || 0), 0);
  const net   = gross - cost;
  const { data, error } = await supabase
    .from("sales")
    .insert({ name: opts.name?.trim() || null, items: opts.items, gross, cost, net })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Sale;
}

export async function listSales(): Promise<Sale[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await supabase
    .from("sales")
    .select("*")
    .order("sold_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Sale[];
}

export async function deleteSale(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) throw new Error("Supabase not configured.");
  const { error } = await supabase.from("sales").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
