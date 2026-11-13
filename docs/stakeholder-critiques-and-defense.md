# Field Operations: Stakeholder Critiques & Master Defense Playbook

**Target Application:** `waste-scan-mate` (Operator Handheld Edge Terminal)  
**Audience:** Field Crew Engineers, Operations Dispatchers, Fleet Technicians

This document directly pairs every critical operational critique, crew anxiety, and street vulnerability with its verified engineering mitigation, hardware specification, and operational protocol.

---

### Critique 1: The Dirty / Damaged Tag Dilemma
> *"In Lagos markets and tenement houses, bins are beaten by rain, drenched in palm oil, or chewed by goats. Within two weeks, your paper barcodes will be unreadable. How does a loader scan a bin when the tag is completely covered in black sludge?"*  
> — **AWAMN Route Supervisor, Ikotun Zone**

#### Defense & Technical Mitigation: Triple-Redundancy Tag Architecture
1. **Material Spec:** Tags are manufactured from industrial-grade, 200-micron anodized aluminum-foil composite with UV-cured resin laminate, resistant to water, diesel, palm oil, and acid.
2. **Dual Carrier:** Every tag embeds both a high-contrast 1D/2D laser barcode and a passive high-frequency NFC chip (NTAG213). If the barcode surface is covered in mud or oil, the loader taps the NFC chip through the dirt without wiping.
3. **Emergency Manual Override:** In the rare event of total tag destruction, the loader keys in the property's 4-digit street number; the app requires a single photo of the damaged tag to validate the stop and auto-orders a replacement tag.

---

### Critique 2: Hostile Tenement Confrontations
> *"If our truck arrives at a compound on Friday and the app shows red for arrears, the tenants will not let us leave unless we pack their waste. They will say their landlord took their service charge. If we leave the waste, they will fight the boys. How does an app protect my loaders from being beaten up at the gate?"*  
> — **PSP Fleet Manager, Mosan-Okunola**

#### Defense & Technical Mitigation: The 'Zero-Confrontation' Arrears Override
1. **Protocol:** Loaders are never tasked with debt collection. When arrears are flagged, the screen immediately offers a one-tap `Arrears Override (Resident Claims Payment)` button.
2. **Workflow:** The loader enters the resident's mobile number or captures a photo of any presented bank transfer receipt/utility slip.
3. **Outcome:** Waste is loaded immediately. No shouting, no delay. The event is tagged as `PAID-PARTIAL` in the background; customer care handles verification while the crew stays on schedule.

---

### Critique 3: Six-Hour Cellular Blackouts
> *"A compactor works in the trenches of Agbado/Oke-Odo from 6:00 AM to 2:00 PM where there is zero MTN or Airtel signal for hours. If the app crashes, reloads, or loses the queue, will my crew lose proof of 400 stops and get penalized on our Friday payout?"*  
> — **Compactor Driver, Alimosho Central**

#### Defense & Technical Mitigation: Offline IndexedDB with Append-Only Cryptographic Ledger
1. **Architecture:** The terminal maintains a full SQLite/IndexedDB offline transactional store. Scans are committed locally in $< 50\text{ms}$.
2. **Zero Network Dependence:** Route manifests, tag tables, and address caches for the day's route are pre-loaded at the depot over Wi-Fi before departure.
3. **Tamper-Evident Sync:** Offline records form an append-only chain where each record hashes the previous scan ID, device timestamp, and GPS fix. Even across 12 hours of total blackout, zero records are dropped, and records cannot be fabricated.

---

### Critique 4: The 'Ghost Pickup' Fraud Vector
> *"Corrupt crews will park their truck on the corner, walk the street on foot with the handheld scanner, scan 50 compound gates in 10 minutes without picking up a single bag of trash, and drive off to save diesel. How does the system prove the truck actually loaded the waste?"*  
> — **LAWMA Monitoring & Compliance Officer**

#### Defense & Technical Mitigation: Dual-Factor Pickup Proof (Geofence + Hydraulic PTO Sensing)
1. **Validation Rule:** A scan is invalid if the truck's physical telematics unit is not within 25 meters of the handheld at the time of scan.
2. **Hydraulic Blade Cycle Match:** The vehicle telematics unit connects to the compactor's Power Take-Off (PTO) hydraulic sensor. The system cross-references the batch of scans against the physical cycling of the compactor packing blade. Walking the route on foot without cycling the compactor blade flags a "Suspicious Zero-Hydraulic Cycle" fraud alert, freezing the claim.

---

### Critique 5: Telematics Tampering by Local Mechanics
> *"Our trucks break down constantly. When they go to the local mechanics in Ladipo or Berger, the mechanics will rip out GPS antennas, cut OBD cables, or siphon diesel from the tank. Why should we invest in expensive tracking gadgets that will be destroyed in a month?"*  
> — **AWAMN Technical Secretary**

#### Defense & Technical Mitigation: Industrial Armored Telematics & Disconnect Alarms
1. **Hardware Enclosure:** Telematics units are encased in cast aluminum, IP67 waterproof boxes bolted directly into the vehicle chassis beneath armored steel conduits.
2. **Internal Battery & Tamper Alert:** If power is cut or cables are disconnected by a mechanic, the unit's internal LiPo backup battery powers an immediate SMS/MQTT distress packet (`telematics.tampered`) with last known coordinates and fuel level.
3. **Fleet Policy:** Any truck operating with a disconnected telematics unit is barred from entry at Agege TLS and Solous II weighbridges.

---

### Critique 6: Highway Dumping to Bypass Landfill Queues
> *"When queues at Solous II reach 4 hours, tired drivers tip their waste on the roadside along LASU-Igando road at midnight and claim they emptied at the landfill. How does the terminal stop a driver from faking dumpsite arrival?"*  
> — **Host Community Chairman, Igando**

#### Defense & Technical Mitigation: Mandatory Weighbridge Ticket Matching & Turnaround SLA
1. **Weighbridge Handshake:** A route manifest cannot be closed by the driver alone. The driver must scan the digital weighbridge scale ticket (`TCK-AGE-*` or `TCK-SOL-*`) issued by the state scale load-cell indicator.
2. **Mass-Balance Audit:** The net weight recorded on the scale must match the estimated volume of the scanned properties within a $\pm 20\%$ tolerance.
3. **Queue Mitigation:** If queues at Solous II exceed 45 minutes, the terminal automatically presents an authorized detour route to Agege TLS or Olusosun, preventing illegal roadside tipping.
