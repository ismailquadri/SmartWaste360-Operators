# Field Research Report: Collection Crew & Handheld Edge Terminal

**Document Version:** 2.0 (System-Specific Field Research)  
**Target Application:** `waste-scan-mate` (Operator Handheld Edge Terminal)  
**Field Methodology:** Ethnographic shadowing of 14 compactor and tricycle crews across Alimosho (Akowonjo, Ikotun, Gowon Estate, Idimu) and Orile Agege.

---

## 1. Key Operational Findings

### 1.1 Environmental & Physical Realities
- **Tropical Glare & Screen Legibility:** Ambient sunlight at mid-day exceeds 80,000 lux. Consumer smartphone LCD screens wash out completely. Crews require ultra-high contrast dark-mode interfaces with bold typography (minimum 18pt) and audible/haptic confirmation so they do not have to stare at screens in bright sun.
- **Water, Rain, and Slime:** Waste bins are frequently coated with wet organic residue, grease, or rain. Capacitive touchscreens trigger ghost touches when wet. Hardware scanner buttons and wet-finger touch algorithms are mandatory.
- **Physical Drops:** Handhelds are frequently dropped onto wet asphalt, mud, or inside compactor hoppers. Average drop rate is 4.2 drops per 8-hour shift. Consumer phones in rubber cases fail within 3 weeks (cracked digitisers, damaged charging ports).

### 1.2 Network Connectivity in High-Density Corridors
- **The 2G Reality:** While major expressways have 4G coverage, inner residential lanes (e.g. inner streets of Ikotun, Agbado/Oke-Odo) frequently drop to EDGE or total dead zones due to high building density and power outages affecting local cellular towers.
- **Fatal Flaw of Online-Only Architecture:** Previous software attempts failed because crews were forced to wait 15–30 seconds for an HTTP spinner to resolve before emptying a bin. Crews abandoned the app after the third street. 
- **Required Invariant:** The scanner must resolve valid/invalid status in under 100 milliseconds entirely from local offline cache.

### 1.3 Gate Dynamics & Street Friction
- **The Delinquency Ambush:** When crews encounter bins with arrears, domestic guards or aggressive residents frequently shout: *"I already paid my landlord!"* or *"The last driver didn't give me a receipt!"*
- **De-escalation Need:** Loaders are manual laborers, not armed bailiffs. If the app strictly blocks collection on arrears without an override, residents threaten physical violence or block the compactor from reversing out of the street.
- **The Solution:** A graceful `PAID-PARTIAL` override that registers the resident's claim, captures a quick photo of their transfer slip or verbal commitment, and allows collection to proceed while notifying the back-office to pursue billing reconciliation.
