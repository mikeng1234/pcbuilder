// PC Builder — component schema definitions

export type Category =
  | "Motherboard"
  | "CPU"
  | "CPU Cooler"
  | "PSU"
  | "GPU"
  | "RAM"
  | "SSD"
  | "HDD"
  | "ExtenderCable"
  | "Case"
  | "Fans"
  | "PeripheralsCombo"
  | "Monitor";

export type Socket = "AM5" | "AM4" | "LGA1700" | "LGA1851" | "TR5" | string;
export type RamType = "DDR4" | "DDR5";
export type FormFactor = "ATX" | "mATX" | "ITX" | "E-ATX" | "SFX" | "SFX-L";
export type StorageType = "NVMe" | "SATA";

// ---------- Base ----------
export interface BaseComponent {
  id: string;
  category: Category;
  brand: string;
  model: string;
  cost: number;   // internal buying price
  price: number;  // customer-facing selling price
}

// ---------- Hardware-specific ----------
export interface CPU extends BaseComponent {
  category: "CPU";
  socket: Socket;
  supported_memory: RamType;
  tdp_w: number;
}

export interface Motherboard extends BaseComponent {
  category: "Motherboard";
  socket: Socket;
  form_factor: FormFactor;
  ram_type: RamType;
  max_ram_slots: number;
  nvme_slots: number;
  sata_ports: number;
}

export interface RAM extends BaseComponent {
  category: "RAM";
  ram_type: RamType;
  capacity_gb: number;
  speed_mhz: number;
  module_count: number; // sticks per kit
}

export interface SSD extends BaseComponent {
  category: "SSD";
  storage_type: StorageType;
  capacity_gb: number;
}

export interface HDD extends BaseComponent {
  category: "HDD";
  storage_type: "SATA";
  capacity_gb: number;
}

export interface GPU extends BaseComponent {
  category: "GPU";
  length_mm: number;
  recommended_psu_w: number;
}

export interface Case extends BaseComponent {
  category: "Case";
  supported_form_factors: FormFactor[];
  max_gpu_length_mm: number;
}

export interface PSU extends BaseComponent {
  category: "PSU";
  wattage: number;
  form_factor: "ATX" | "SFX" | "SFX-L";
}

export interface CPUCooler extends BaseComponent {
  category: "CPU Cooler";
  supported_sockets: Socket[];
}

export interface ExtenderCable extends BaseComponent {
  category: "ExtenderCable";
}

export interface Fans extends BaseComponent {
  category: "Fans";
  size_mm?: number;
}

export interface PeripheralsCombo extends BaseComponent {
  category: "PeripheralsCombo";
}

export interface Monitor extends BaseComponent {
  category: "Monitor";
  size_inches: number;
}

export type Component =
  | CPU
  | Motherboard
  | RAM
  | SSD
  | HDD
  | GPU
  | Case
  | PSU
  | CPUCooler
  | ExtenderCable
  | Fans
  | PeripheralsCombo
  | Monitor;

// ---------- Build state ----------
export interface Build {
  motherboard: Motherboard | null;
  cpu: CPU | null;
  cpuCooler: CPUCooler | null;
  psu: PSU | null;
  gpu: GPU | null;
  ramKits: RAM[];          // multiple kits — limited by mobo.max_ram_slots
  ssds: SSD[];             // NVMe limited by nvme_slots; SATA limited by sata_ports
  hdds: HDD[];             // SATA limited by sata_ports (shared with SATA SSDs)
  case: Case | null;
  fans: Fans[];
  extenderCables: ExtenderCable[];
  peripherals: PeripheralsCombo[];
  monitors: Monitor[];
}

export interface SavedBuild {
  id: string;
  name: string;
  savedAt: string; // ISO
  build: Build;
}
