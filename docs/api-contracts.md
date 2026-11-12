# Operator App API & Message Contract

**Target Application:** `waste-scan-mate`  
**Endpoint:** `/api/public/messages`  
**Authentication Header:** `x-app-key: OPERATOR_APP_KEY`

---

## Inbound Messages (Partner / LAWMA -> Operator)

| Type | Source | Payload | Description |
| :--- | :--- | :--- | :--- |
| `route.assigned` | `partner` | `{ routeId, wardCode, stopsCount, manifestHash }` | Dispatches daily street route to terminal. |
| `supervisor.override` | `partner` | `{ tagId, approved: boolean, reason, supervisorId }` | Authorizes collection for disputed arrears. |
| `corridor.alert` | `lawma` | `{ alertType, facilityId, recommendation }` | Live notification of dumpsite congestion or flood reroute. |

---

## Outbound Messages (Operator -> Partner / LAWMA / Customer)

### 1. `pickup.scanned`
Dispatched upon successful tag scan and bin collection:
```json
{
  "to": ["customer", "partner", "lawma"],
  "type": "pickup.scanned",
  "customerId": "CUS-ALI-0148",
  "ref": "PU-2026-11-12-004",
  "payload": {
    "tagId": "TAG-HH-ALI-0148",
    "routeId": "ROU-ALI-001",
    "timestamp": "2026-11-12T08:14:22Z",
    "gps": { "lat": 6.5982, "lng": 3.2841 },
    "serviceTier": "6 shared bins",
    "photoProofUri": "https://storage.lawma.gov.ng/proof/PR-98234.webp"
  }
}
```

### 2. `pickup.arrears_override`
Dispatched when crew overrides an arrears block at the gate:
```json
{
  "to": ["partner", "lawma"],
  "type": "pickup.arrears_override",
  "customerId": "CUS-ALI-0149",
  "ref": "OVR-2026-0081",
  "payload": {
    "tagId": "TAG-MKT-ALI-0149",
    "arrearsAmount": 15000,
    "paymentClaimType": "resident_transfer_slip",
    "referenceDigits": "9821",
    "crewId": "CREW-ALI-04"
  }
}
```

### 3. `pickup.rejected_biohazard`
Dispatched when hazardous clinical/industrial waste is discovered:
```json
{
  "to": ["customer", "partner", "lawma"],
  "type": "pickup.rejected_biohazard",
  "customerId": "CUS-ALI-0220",
  "ref": "INC-BIO-902",
  "payload": {
    "tagId": "TAG-HH-ALI-0220",
    "reason": "Unsegregated syringes and clinical blood bags",
    "photoEvidenceUri": "https://storage.lawma.gov.ng/incidents/BIO-902.webp",
    "crewId": "CREW-ALI-04",
    "hopperLockEngaged": true
  }
}
```

### 4. `tls.weighed`
Dispatched upon weighbridge ticket confirmation:
```json
{
  "to": ["partner", "lawma"],
  "type": "tls.weighed",
  "ref": "TCK-SOL-0223",
  "payload": {
    "scaleId": "SCALE-SOL-02",
    "truckId": "TRK-ALI-012",
    "grossKg": 18450,
    "tareKg": 8200,
    "netKg": 10250,
    "turnaroundMinutes": 32,
    "slaCompliant": true
  }
}
```
