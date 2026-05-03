import type { Build, SavedBuild } from "../types/components";

const KEY = "pcbuilder.savedBuilds.v1";

export function listSavedBuilds(): SavedBuild[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SavedBuild[]) : [];
  } catch {
    return [];
  }
}

export function saveBuild(name: string, build: Build): SavedBuild {
  const all = listSavedBuilds();
  const entry: SavedBuild = {
    id: `build-${Date.now()}`,
    name: name.trim() || `Build ${new Date().toLocaleString()}`,
    savedAt: new Date().toISOString(),
    build,
  };
  all.unshift(entry);
  localStorage.setItem(KEY, JSON.stringify(all));
  return entry;
}

export function deleteSavedBuild(id: string): void {
  const all = listSavedBuilds().filter(b => b.id !== id);
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function exportBuildAsJson(name: string, build: Build): void {
  const payload = {
    name: name || "PC Build",
    exportedAt: new Date().toISOString(),
    build,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(name || "pc-build").replace(/[^a-z0-9-_]+/gi, "_")}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
