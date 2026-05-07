import { useMemo } from "react";
import type { Sale } from "../lib/sales";
import { php } from "../lib/format";

interface Props {
  sales: Sale[];
  onDelete: (id: string) => void;
}

export function Sales({ sales, onDelete }: Props) {
  const totals = useMemo(() => {
    const gross = sales.reduce((s, x) => s + Number(x.gross || 0), 0);
    const cost  = sales.reduce((s, x) => s + Number(x.cost  || 0), 0);
    const net   = sales.reduce((s, x) => s + Number(x.net   || 0), 0);
    return { gross, cost, net };
  }, [sales]);

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-5">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-bold">💰 Sales History</h2>
        <span className="text-xs text-slate-500">
          Each row is an archived build with full item snapshot.
        </span>
      </div>

      {/* Aggregate totals */}
      <div className="mb-5 grid grid-cols-3 gap-3">
        <Totals label="Total Gross Income" value={php(totals.gross)} accent="emerald" />
        <Totals label="Total Cost"          value={php(totals.cost)}  />
        <Totals label="Total Net Income"    value={php(totals.net)}   accent="amber" />
      </div>

      {sales.length === 0 ? (
        <div className="rounded border border-slate-800 px-4 py-6 text-center text-sm text-slate-500">
          No sales yet. Build a PC, click <span className="text-emerald-400">Mark as Sold</span> in the Build tab.
        </div>
      ) : (
        <div className="overflow-hidden rounded border border-slate-800">
          <table className="w-full text-xs">
            <thead className="bg-slate-800 text-slate-400">
              <tr>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Build</th>
                <th className="px-3 py-2 text-right">Items</th>
                <th className="px-3 py-2 text-right">Gross</th>
                <th className="px-3 py-2 text-right">Cost</th>
                <th className="px-3 py-2 text-right">Net</th>
                <th className="px-3 py-2 text-right">Margin</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {sales.map(s => {
                const margin = s.gross > 0 ? ((Number(s.net) / Number(s.gross)) * 100).toFixed(0) : "—";
                return (
                  <tr key={s.id} className="border-t border-slate-800 hover:bg-slate-800/40 align-top">
                    <td className="px-3 py-2 text-slate-300">{formatDate(s.sold_at)}</td>
                    <td className="px-3 py-2">
                      <div className="font-semibold">{s.name || "Untitled build"}</div>
                      <details className="mt-1">
                        <summary className="cursor-pointer text-[10px] text-slate-500 hover:text-slate-300">
                          show items
                        </summary>
                        <ul className="mt-1 space-y-0.5 text-[10px] text-slate-400">
                          {s.items.map(it => (
                            <li key={it.id}>
                              <span className="text-slate-500">[{it.category}]</span>{" "}
                              {it.brand} {it.model}{" "}
                              <span className="text-emerald-400">{php(it.price)}</span>
                            </li>
                          ))}
                        </ul>
                      </details>
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{s.items.length}</td>
                    <td className="px-3 py-2 text-right font-mono text-emerald-400">{php(Number(s.gross))}</td>
                    <td className="px-3 py-2 text-right font-mono">{php(Number(s.cost))}</td>
                    <td className="px-3 py-2 text-right font-mono text-amber-400">{php(Number(s.net))}</td>
                    <td className="px-3 py-2 text-right font-mono text-amber-400">{margin}%</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => {
                          if (confirm("Delete this sale record? Items will NOT come back to inventory.")) {
                            onDelete(s.id);
                          }
                        }}
                        className="text-rose-400 hover:text-rose-300"
                        title="Delete sale record"
                      >del</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Totals({ label, value, accent }: { label: string; value: string; accent?: "emerald" | "amber" }) {
  const color = accent === "emerald" ? "text-emerald-400" : accent === "amber" ? "text-amber-400" : "text-slate-200";
  return (
    <div className="rounded border border-slate-800 bg-slate-950 p-3">
      <div className="text-[10px] uppercase tracking-wider text-slate-400">{label}</div>
      <div className={`mt-1 font-mono text-lg font-semibold ${color}`}>{value}</div>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
}
