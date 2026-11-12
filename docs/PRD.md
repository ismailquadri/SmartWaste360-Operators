# PRD: LAWMA 360 Crew App (`waste-scan-mate`)

**Document Version:** 2.0 (System-Specific Specification)  
**System Role:** Handheld Rugged Edge Terminal & Field Collection Crew Scanner  
**Target Codebase:** `waste-scan-mate` (`src/routes/index.tsx`, `src/components/`)  
**Deployment Target:** Rugged Android Handheld Computers & Field PWA  
**Pilot Corridor:** Alimosho–Orile Agege Pilot Corridor (`TAG-HH-ALI-*`, `TAG-MKT-ALI-*`, `TAG-HH-ORA-*`, `TCK-SOL-*`)

---

## 1. System Vision & Purpose

`waste-scan-mate` is the ruggedized, offline-first edge terminal designed for Lagos waste collection truck drivers, loaders, and tricycle crews. It provides:
1. **Zero-Touch Collection Proof:** Sub-3-second scanning of compound tags (`TAG-HH-*`) with dual audio-haptic feedback.
2. **Offline-First Resilience:** 100% operational autonomy in 2G/EDGE or dead zones; transactions queue in local IndexedDB.
3. **Street Conflict Resolution:** Supervisor override protocols for partial payment arrears (`PAID-PARTIAL`), de-escalating confrontations at compound gates.
4. **Biohazard Rejection:** Instant photo-documented rejection of hazardous/clinical waste (`REJ-MED`), triggering regulatory isolation.
5. **Dumpsite & Scale Verification:** Weighbridge ticket matching at Solous II (`DS-SOL`) and Agege TLS (`FAC-AGE`), enforcing the `< 45 min` turnaround SLA.

---

## 2. Core Functional Modules

### Module 1: Zero-Touch Barcode & RFID Scanner
- **Scan Latency:** $< 100\text{ms}$ laser decode, $< 2\text{s}$ validation against local route cache.
- **Feedback:** 
  - Valid: High-tone beep ($1175\text{Hz}$) + dual short haptic vibration + green screen flash.
  - Arrears / Alert: Low-tone sawtooth buzzer ($145\text{Hz}$) + sustained vibration + amber screen flash.
  - Rejection / Error: Strobe red screen flash + error chime.
- **Physical Fallbacks:** 
  - Dedicated hardware laser scanner key (Zebra/Honeywell Android intent).
  - High-resolution camera viewfinder with low-light torch toggle.
  - Manual 6-character shortcode entry with mandatory bin photo capture.

### Module 2: Offline Transaction Queue & Cryptographic Sync
- **Storage:** Client-side persistent IndexedDB (`crew_tx_queue`) storing encrypted scan events.
- **Sync Priority:**
  1. `pickup.rejected_biohazard` (Immediate priority upon 2G handshake)
  2. `pickup.scanned` & `pickup.arrears_override` (Batched every 5 records or upon 3G/4G connectivity)
  3. Stamped photo evidence uploads (Compressed WebP, deferred to Wi-Fi/4G depot sync if network congested)
- **Data Integrity:** Each offline record carries a SHA-256 hash containing device ID, GPS timestamp, and previous transaction hash, preventing record alteration.

### Module 3: Arrears & Conflict Resolution Protocol
- When a tag is scanned with outstanding arrears:
  - Screen displays: Outstanding balance, last payment date, and tenant contact info.
  - Option A: Resident presents proof of bank transfer / POS slip -> Driver selects `Arrears Override (Supervisor Approved)` -> enters last 4 digits of reference -> scan validates.
  - Option B: Resident promises payment by Friday -> Loader flags `PAID-PARTIAL` -> waste collected without physical altercation -> flag syncs to Partner Hub.
  - Option C: Persistent refusal / vacant unit -> Crew logs `Arrears Blocked` -> mandatory photo of unemptied bin.

### Module 4: Biohazard & Specialized Waste Rejection
- If medical waste, clinical sharps, untreated chemicals, or abattoir blood are detected in domestic bins:
  - Loader presses `Reject Biohazard`.
  - App enforces 2 mandatory timestamped photos (wide-angle property context + close-up of contamination).
  - Emits `pickup.rejected_biohazard` alert directly to LAWMA Specialized Waste Directorate (`SPL-*`).
  - Compactor hopper cycle is locked to prevent truck hydraulic contamination.

### Module 5: Tricycle-to-Compactor Handoff Protocol
- For inaccessible inner lanes in Alimosho (e.g. Idimu, Ayobo):
  - Tricycle operator scans inner compound tags (`TAG-HH-*`) and deposits into designated transfer skips.
  - Heavy compactor crew arrives at the hub, scans the skip tag (`TAG-SKIP-*`), and confirms batch transfer.
  - Both driver IDs and GPS points are cross-verified to credit the tricycle micro-collector.

### Module 6: Landfill Scale Ticketing & Turnaround SLA
- Upon reaching Solous II (`DS-SOL`) or Agege TLS (`FAC-AGE`):
  - Crew scans inbound weighbridge terminal barcode.
  - Ingests gross weight, tare weight, and calculates net tonnage.
  - Enforces the **45-minute Turnaround SLA timer**: if weighbridge wait exceeds 45 minutes, terminal sounds an advisory and logs queuing delay against dumpsite management.

---

## 3. Hardware & Telematics Specifications

1. **Rugged Android Handheld Computer ($180/unit):**
   - OS: Android 14 (AOSP / GMS).
   - Display: 5.5-inch IPS, 500+ nits daylight readable, Corning Gorilla Glass with wet-finger and heavy glove touch support.
   - Ingress Protection: IP67 (dustproof, submersible in 1m water for 30 mins).
   - Drop Spec: MIL-STD-810H, withstands 1.5m drops to concrete.
   - Battery: 5,000mAh Lithium-ion, hot-swappable, rated for 14 hours continuous scanning.
   - Barcode Engine: Dedicated 1D/2D zebra-grade imager (<100ms decode).
2. **Compactor OBD-II Vehicle Telematics Unit ($250/unit):**
   - 4G LTE Cat-1 with 2G fallback (EGPRS 900/1800MHz).
   - CAN bus connection reading fuel level, engine RPM, vehicle speed.
   - Hydraulic Power Take-Off (PTO) sensor: logs exact timestamp and location of compactor blade cycling (distinguishing bin collection from idle driving).

---

## 4. Alimosho–Orile Agege Pilot Scenarios (`src/routes/index.tsx`)

The interactive simulator runs the following deterministic field sequence:

| Scenario Code | Property / Location | Type | Service Profile | Expected Scan Outcome |
| :--- | :--- | :--- | :--- | :--- |
| `TAG-HH-ALI-0148` | Gowon Estate, Block 41, Mosan-Okunola | Flats | 6 shared compound bins | `valid` (Clean collection) |
| `TAG-MKT-ALI-0149` | Ikotun Market Central Skip | Shop | Central Dino Skip (Commercial) | `arrears` (Partial override test) |
| `TAG-HH-ORA-0150` | Papa Ashafa II, Orile Agege Corridor | Home | 2 household bins (Guestimate Revoked) | `already-collected` (Interim handover) |
| `TAG-HH-ALI-0221` | 7 Akowonjo Roundabout, Alimosho Core | Home | 1 household bin (Ayobo Boundary) | `wrong-zone` (Boundary alert) |
| `TAG-HH-ALI-0222` | Egbe/Idimu Micro-Collector Hub | School | Tricycle-to-Compactor Handoff | `damaged-tag` (Manual fallback test) |
| `TCK-SOL-0223` | Solous II Scale Intake Bay 2 | Office | Weighbridge Net Tip-Off (SLA < 45m) | `valid` (Scale reconciliation) |
