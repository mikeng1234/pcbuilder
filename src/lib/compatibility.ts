import type {
  Build,
  Component,
  CPU,
  Case,
  CPUCooler,
  GPU,
  HDD,
  Motherboard,
  PSU,
  RAM,
  SSD,
} from "../types/components";

export interface CompatibilityResult {
  ok: boolean;
  reason?: string;
}

const OK: CompatibilityResult = { ok: true };
const fail = (reason: string): CompatibilityResult => ({ ok: false, reason });

// ---------- Per-component compatibility against current build ----------

export function checkCPU(cpu: CPU, build: Build): CompatibilityResult {
  if (build.motherboard && build.motherboard.socket !== cpu.socket) {
    return fail(`CPU socket ${cpu.socket} ≠ motherboard socket ${build.motherboard.socket}`);
  }
  if (build.cpuCooler && !build.cpuCooler.supported_sockets.includes(cpu.socket)) {
    return fail(`Selected cooler doesn't support ${cpu.socket}`);
  }
  return OK;
}

export function checkMotherboard(mb: Motherboard, build: Build): CompatibilityResult {
  if (build.cpu && build.cpu.socket !== mb.socket) {
    return fail(`Motherboard socket ${mb.socket} ≠ CPU socket ${build.cpu.socket}`);
  }
  if (build.ramKits.length && build.ramKits.some(r => r.ram_type !== mb.ram_type)) {
    return fail(`Motherboard uses ${mb.ram_type}; selected RAM differs`);
  }
  const usedSticks = totalRamSticks(build);
  if (usedSticks > mb.max_ram_slots) {
    return fail(`RAM sticks (${usedSticks}) exceed ${mb.max_ram_slots} slots`);
  }
  if (build.case && !build.case.supported_form_factors.includes(mb.form_factor)) {
    return fail(`Case doesn't support ${mb.form_factor}`);
  }
  if (countNvme(build) > mb.nvme_slots) {
    return fail(`NVMe drives exceed ${mb.nvme_slots} M.2 slots`);
  }
  if (countSata(build) > mb.sata_ports) {
    return fail(`SATA devices exceed ${mb.sata_ports} ports`);
  }
  return OK;
}

export function checkRam(ram: RAM, build: Build): CompatibilityResult {
  if (build.motherboard && build.motherboard.ram_type !== ram.ram_type) {
    return fail(`RAM is ${ram.ram_type}; motherboard requires ${build.motherboard.ram_type}`);
  }
  if (build.cpu && build.cpu.supported_memory !== ram.ram_type) {
    return fail(`RAM is ${ram.ram_type}; CPU supports ${build.cpu.supported_memory}`);
  }
  if (build.motherboard) {
    const usedSticks = totalRamSticks(build);
    if (usedSticks + ram.module_count > build.motherboard.max_ram_slots) {
      return fail(
        `Adding ${ram.module_count} sticks exceeds ${build.motherboard.max_ram_slots} slots`
      );
    }
  }
  return OK;
}

export function checkSsd(ssd: SSD, build: Build): CompatibilityResult {
  if (!build.motherboard) return OK;
  if (ssd.storage_type === "NVMe") {
    if (countNvme(build) + 1 > build.motherboard.nvme_slots) {
      return fail(`No free NVMe slots (max ${build.motherboard.nvme_slots})`);
    }
  } else {
    if (countSata(build) + 1 > build.motherboard.sata_ports) {
      return fail(`No free SATA ports (max ${build.motherboard.sata_ports})`);
    }
  }
  return OK;
}

export function checkHdd(_hdd: HDD, build: Build): CompatibilityResult {
  if (!build.motherboard) return OK;
  if (countSata(build) + 1 > build.motherboard.sata_ports) {
    return fail(`No free SATA ports (max ${build.motherboard.sata_ports})`);
  }
  return OK;
}

export function checkGpu(gpu: GPU, build: Build): CompatibilityResult {
  if (build.case && gpu.length_mm > build.case.max_gpu_length_mm) {
    return fail(`GPU ${gpu.length_mm}mm exceeds case max ${build.case.max_gpu_length_mm}mm`);
  }
  if (build.psu && gpu.recommended_psu_w > build.psu.wattage) {
    return fail(`PSU ${build.psu.wattage}W below GPU recommended ${gpu.recommended_psu_w}W`);
  }
  return OK;
}

export function checkCase(c: Case, build: Build): CompatibilityResult {
  if (build.motherboard && !c.supported_form_factors.includes(build.motherboard.form_factor)) {
    return fail(`Case doesn't support ${build.motherboard.form_factor}`);
  }
  if (build.gpu && build.gpu.length_mm > c.max_gpu_length_mm) {
    return fail(`Selected GPU ${build.gpu.length_mm}mm exceeds case max ${c.max_gpu_length_mm}mm`);
  }
  return OK;
}

export function checkPsu(psu: PSU, build: Build): CompatibilityResult {
  if (build.gpu && build.gpu.recommended_psu_w > psu.wattage) {
    return fail(`PSU ${psu.wattage}W below GPU recommended ${build.gpu.recommended_psu_w}W`);
  }
  return OK;
}

export function checkCooler(cooler: CPUCooler, build: Build): CompatibilityResult {
  if (build.cpu && !cooler.supported_sockets.includes(build.cpu.socket)) {
    return fail(`Cooler doesn't support ${build.cpu.socket}`);
  }
  if (build.motherboard && !cooler.supported_sockets.includes(build.motherboard.socket)) {
    return fail(`Cooler doesn't support ${build.motherboard.socket}`);
  }
  return OK;
}

// ---------- Helpers ----------

export function totalRamSticks(build: Build): number {
  return build.ramKits.reduce((sum, k) => sum + k.module_count, 0);
}

export function countNvme(build: Build): number {
  return build.ssds.filter(s => s.storage_type === "NVMe").length;
}

export function countSata(build: Build): number {
  return (
    build.ssds.filter(s => s.storage_type === "SATA").length +
    build.hdds.length
  );
}

// ---------- Dispatcher ----------

export function isCompatible(item: Component, build: Build): CompatibilityResult {
  switch (item.category) {
    case "CPU":         return checkCPU(item, build);
    case "Motherboard": return checkMotherboard(item, build);
    case "RAM":         return checkRam(item, build);
    case "SSD":         return checkSsd(item, build);
    case "HDD":         return checkHdd(item, build);
    case "GPU":         return checkGpu(item, build);
    case "Case":        return checkCase(item, build);
    case "PSU":         return checkPsu(item, build);
    case "CPU Cooler":  return checkCooler(item, build);
    default:            return OK;
  }
}

// ---------- Build-wide validation summary ----------

export interface BuildIssue {
  severity: "error" | "warning";
  message: string;
}

export function validateBuild(build: Build): BuildIssue[] {
  const issues: BuildIssue[] = [];
  const { motherboard, cpu, cpuCooler, ramKits, gpu, psu, case: pcCase } = build;

  if (motherboard && cpu && motherboard.socket !== cpu.socket) {
    issues.push({ severity: "error", message: `CPU/MB socket mismatch (${cpu.socket} vs ${motherboard.socket})` });
  }
  if (motherboard && ramKits.some(r => r.ram_type !== motherboard.ram_type)) {
    issues.push({ severity: "error", message: `RAM type doesn't match motherboard (${motherboard.ram_type})` });
  }
  if (cpu && ramKits.some(r => r.ram_type !== cpu.supported_memory)) {
    issues.push({ severity: "error", message: `RAM type doesn't match CPU (${cpu.supported_memory})` });
  }
  if (motherboard && totalRamSticks(build) > motherboard.max_ram_slots) {
    issues.push({ severity: "error", message: `Too many RAM sticks for motherboard (${motherboard.max_ram_slots} slots)` });
  }
  if (motherboard && countNvme(build) > motherboard.nvme_slots) {
    issues.push({ severity: "error", message: `NVMe count exceeds motherboard slots (${motherboard.nvme_slots})` });
  }
  if (motherboard && countSata(build) > motherboard.sata_ports) {
    issues.push({ severity: "error", message: `SATA count exceeds motherboard ports (${motherboard.sata_ports})` });
  }
  if (motherboard && pcCase && !pcCase.supported_form_factors.includes(motherboard.form_factor)) {
    issues.push({ severity: "error", message: `Case doesn't fit ${motherboard.form_factor} motherboard` });
  }
  if (gpu && pcCase && gpu.length_mm > pcCase.max_gpu_length_mm) {
    issues.push({ severity: "error", message: `GPU too long for case (${gpu.length_mm}mm > ${pcCase.max_gpu_length_mm}mm)` });
  }
  if (gpu && psu && gpu.recommended_psu_w > psu.wattage) {
    issues.push({ severity: "warning", message: `PSU below GPU recommended wattage (${psu.wattage}W < ${gpu.recommended_psu_w}W)` });
  }
  if (cpuCooler && cpu && !cpuCooler.supported_sockets.includes(cpu.socket)) {
    issues.push({ severity: "error", message: `Cooler doesn't support ${cpu.socket}` });
  }

  return issues;
}

// ---------- Totals ----------

export function buildTotals(build: Build): { price: number; cost: number; profit: number; margin: number } {
  const items: (Component | null)[] = [
    build.motherboard,
    build.cpu,
    build.cpuCooler,
    build.psu,
    build.gpu,
    build.case,
    ...build.ramKits,
    ...build.ssds,
    ...build.hdds,
    ...build.fans,
    ...build.extenderCables,
    ...build.peripherals,
    ...build.monitors,
  ];
  const present = items.filter((x): x is Component => !!x);
  const price = present.reduce((s, x) => s + x.price, 0);
  const cost = present.reduce((s, x) => s + x.cost, 0);
  const profit = price - cost;
  const margin = price > 0 ? (profit / price) * 100 : 0;
  return { price, cost, profit, margin };
}

export const emptyBuild = (): Build => ({
  motherboard: null,
  cpu: null,
  cpuCooler: null,
  psu: null,
  gpu: null,
  ramKits: [],
  ssds: [],
  hdds: [],
  case: null,
  fans: [],
  extenderCables: [],
  peripherals: [],
  monitors: [],
});
