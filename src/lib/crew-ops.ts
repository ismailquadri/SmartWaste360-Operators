export type Network = "Depot Wi-Fi" | "4G" | "2G / Edge" | "Offline";
export type Screen =
  | "login"
  | "sync"
  | "diagnostics"
  | "route"
  | "camera"
  | "arrears"
  | "exception"
  | "biohazard"
  | "weighbridge"
  | "queue";

export type Flash = "success" | "danger" | null;
export type ScanOutcome =
  | "valid"
  | "arrears"
  | "biohazard"
  | "gate-locked"
  | "already-collected"
  | "wrong-zone"
  | "damaged-tag"
  | "recyclable-handoff"
  | "weighbridge";

export type PropertyType = "Home" | "Flats" | "Shop" | "Office" | "School" | "Clinic" | "Hub";
export type AuditDecision = "requested" | "approved" | "denied" | "biohazard" | "weighbridge" | "sla-shield";

export type AuditEntry = {
  key: number;
  property: string;
  reason: string;
  crew: string;
  decision: AuditDecision;
  time: string;
};

export type StreetScenario = {
  id: string;
  address: string;
  street: string;
  zone: string;
  type: PropertyType;
  service: string;
  distance: number;
  outcome: ScanOutcome;
  arrearsNgn?: number;
  lastPayment?: string;
  grossKg?: number;
  tareKg?: number;
  estimatedStopTonnes?: number;
  queueMinutes?: number;
  recyclableKg?: number;
};

export type SyncPriority = 1 | 2 | 3 | 4;
export type QueueEntry = {
  id: string;
  tagId: string;
  eventType:
    | "pickup.rejected_biohazard"
    | "pickup.arrears_override"
    | "pickup.gate_locked"
    | "pickup.scanned"
    | "pickup.recyclable_handoff"
    | "tls.weighed";
  priority: SyncPriority;
  priorityLabel: string;
  hash: string;
  prevHash: string;
  timestamp: string;
  ptoCycles: number;
  truckDistanceM: number;
  synced: boolean;
  summary: string;
};

export const STREET_SCENARIOS = [
  {
    id: "TAG-HH-ALI-0148",
    address: "Gowon Estate, Block 41",
    street: "41 Road, Mosan-Okunola",
    zone: "ALI-04",
    type: "Flats",
    service: "6 shared compound bins · PTO active",
    distance: 12,
    outcome: "valid",
  },
  {
    id: "TAG-MKT-ALI-0149",
    address: "Ikotun Market Central Skip",
    street: "Ikotun–Idimu Road",
    zone: "ALI-04",
    type: "Shop",
    service: "Central Dino Skip · ₦15,000 arrears",
    distance: 28,
    outcome: "arrears",
    arrearsNgn: 15000,
    lastPayment: "14 Sep 2026",
  },
  {
    id: "TAG-SPL-ALI-0220",
    address: "Ijaiye Diagnostic Clinic Annex",
    street: "Meiran / Alimosho Rd",
    zone: "ALI-04",
    type: "Clinic",
    service: "Syringes & red biohazard bags in domestic bin",
    distance: 21,
    outcome: "biohazard",
  },
  {
    id: "TAG-GTL-ALI-0215",
    address: "24 Akowonjo Industrial Gate",
    street: "Akowonjo Roundabout",
    zone: "ALI-04",
    type: "Office",
    service: "Compound shutter padlocked at 07:40 WAT",
    distance: 19,
    outcome: "gate-locked",
  },
  {
    id: "TAG-HH-ORA-0150",
    address: "Papa Ashafa II (Interim Zone)",
    street: "Orile Agege Corridor",
    zone: "ORA-06",
    type: "Home",
    service: "2 household bins · already scanned 14:32",
    distance: 41,
    outcome: "already-collected",
  },
  {
    id: "TAG-HH-ALI-0221",
    address: "7 Akowonjo Boundary Line",
    street: "Ayobo Boundary Rd",
    zone: "AYB-07",
    type: "Home",
    service: "Zone AYB-07 · outside assigned concession",
    distance: 18,
    outcome: "wrong-zone",
  },
  {
    id: "TAG-HH-ALI-0222",
    address: "Egbe/Idimu Micro-Collector Hub",
    street: "Idimu Inner Lane",
    zone: "ALI-04",
    type: "School",
    service: "Barcode soiled in palm oil · tap NTAG213 NFC",
    distance: 35,
    outcome: "damaged-tag",
  },
  {
    id: "REC-PICK-018",
    address: "Ile-Epo Baba Oja Sorting Pad",
    street: "Lagos–Abeokuta Expwy",
    zone: "ALI-04",
    type: "Hub",
    service: "420 kg PET & Cartons · FAC-ORG-ALI handoff",
    distance: 33,
    outcome: "recyclable-handoff",
    recyclableKg: 420,
  },
  {
    id: "TCK-SOL-0223",
    address: "Solous II Scale Intake Bay 2",
    street: "LASU–Igando Expressway",
    zone: "DS-SOL",
    type: "Hub",
    service: "Weighbridge tip-off · <45m SLA",
    distance: 52,
    outcome: "weighbridge",
    grossKg: 18450,
    tareKg: 8200,
    estimatedStopTonnes: 10.0,
    queueMinutes: 32,
  },
] satisfies readonly [StreetScenario, ...StreetScenario[]];

export function getScenario(index: number): StreetScenario {
  return STREET_SCENARIOS[index % STREET_SCENARIOS.length] ?? STREET_SCENARIOS[0];
}

export const OUTCOME_LABEL: Record<ScanOutcome, string> = {
  valid: "Valid",
  arrears: "Arrears",
  biohazard: "Biohazard",
  "gate-locked": "Gate locked",
  "already-collected": "Duplicate",
  "wrong-zone": "Wrong zone",
  "damaged-tag": "Damaged tag",
  "recyclable-handoff": "Baba Oja MRF",
  weighbridge: "Weighbridge",
};

/** Deterministic FNV-1a / SHA-like 8-char chain hash for tamper-evident offline ledger. */
export function computeChainHash(prevHash: string, tagId: string, timestamp: string, ptoCycles: number): string {
  const input = `${prevHash}|${tagId}|${timestamp}|${ptoCycles}`;
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ ch, 0x85ebca6b) >>> 0;
  }
  return (h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(4, "0")).slice(0, 10);
}

export function sortQueueByPriority(entries: QueueEntry[]): QueueEntry[] {
  return [...entries].sort((a, b) => a.priority - b.priority);
}

/** Anti-'Ghost Pickup' validator: truck telematics must be <= 25m and PTO hydraulic blade must have cycled. */
export function verifyTruckLink(truckDistanceM: number, ptoCycles: number): { ok: boolean; reason?: string } {
  if (truckDistanceM > 25) {
    return { ok: false, reason: `Truck is ${truckDistanceM}m away (limit 25m)` };
  }
  if (ptoCycles <= 0) {
    return { ok: false, reason: "Zero hydraulic PTO packing blade cycle detected" };
  }
  return { ok: true };
}

/** Module 6: Solous II / Agege TLS weighbridge scale & 45-minute SLA evaluator. */
export function evaluateWeighbridgeTicket(
  grossKg: number,
  tareKg: number,
  estimatedStopTonnes: number,
  queueMinutes: number,
) {
  const netKg = Math.max(0, grossKg - tareKg);
  const netTonnes = Number((netKg / 1000).toFixed(2));
  const variancePct =
    estimatedStopTonnes > 0
      ? Number((((netTonnes - estimatedStopTonnes) / estimatedStopTonnes) * 100).toFixed(1))
      : 0;
  const massBalanceOk = Math.abs(variancePct) <= 20;
  const slaCompliant = queueMinutes <= 45;
  return {
    netKg,
    netTonnes,
    variancePct,
    massBalanceOk,
    slaCompliant,
    detourRecommended: !slaCompliant,
    detourFacility: "Agege TLS (FAC-AGE)",
  };
}
