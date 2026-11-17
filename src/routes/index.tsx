import { createFileRoute } from "@tanstack/react-router";
import { SupervisorDashboard } from "@/components/SupervisorDashboard";
import { IPhone17Mockup } from "@/components/IPhone17Mockup";
import {
  computeChainHash,
  evaluateWeighbridgeTicket,
  getScenario,
  OUTCOME_LABEL,
  sortQueueByPriority,
  STREET_SCENARIOS,
  verifyTruckLink,
  type AuditDecision,
  type AuditEntry,
  type Flash,
  type Network,
  type PropertyType,
  type QueueEntry,
  type ScanOutcome,
  type Screen,
  type StreetScenario,
} from "@/lib/crew-ops";
import {
  AlertTriangle,
  BatteryFull,
  Biohazard,
  Building2,
  Camera,
  Check,
  ChevronRight,
  CloudUpload,
  Crosshair,
  Gauge,
  Home,
  Lock,
  MapPin,
  Nfc,
  QrCode,
  Radio,
  Recycle,
  Route as RouteIcon,
  Scale,
  ScanLine,
  ShieldAlert,
  ShieldCheck,
  Signal,
  SignalLow,
  Smartphone,
  Store,
  Tag,
  Truck,
  Users,
  Wifi,
  WifiOff,
  X,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LAWMA 360 — Crew Field Terminal & Supervisor App" },
      {
        name: "description",
        content:
          "Rugged crew field terminal, Supervisor Fleet Command, and Resident Mobile App on iPhone 17 for LAWMA SmartWaste360.",
      },
      { property: "og:title", content: "LAWMA 360 — Crew Field Terminal & Supervisor App" },
      {
        property: "og:description",
        content:
          "Zero-touch RFID/NFC scanning, anti-ghost-pickup PTO link, offline cryptographic queue, biohazard rejection, and weighbridge SLA reconciliation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CrewFieldPrototype,
});

function playTone(kind: "success" | "danger" | "camera") {
  const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioContextClass) return;
  try {
    const audio = new AudioContextClass();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.type = kind === "danger" ? "sawtooth" : "sine";
    oscillator.frequency.setValueAtTime(kind === "danger" ? 145 : kind === "camera" ? 760 : 880, audio.currentTime);
    if (kind === "success") oscillator.frequency.setValueAtTime(1175, audio.currentTime + 0.09);
    gain.gain.setValueAtTime(0.18, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + (kind === "danger" ? 0.32 : 0.2));
    oscillator.start();
    oscillator.stop(audio.currentTime + (kind === "danger" ? 0.34 : 0.22));
  } catch {
    // ignore audio autoplay constraints
  }
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

function CrewFieldPrototype() {
  const [screen, setScreen] = useState<Screen>("login");
  const [pin, setPin] = useState("");
  const [network, setNetwork] = useState<Network>("Depot Wi-Fi");
  const [manifest, setManifest] = useState(0);
  const [diagnosticStep, setDiagnosticStep] = useState(0);
  const [mode, setMode] = useState<"resident" | "operator" | "supervisor">("operator");
  const [flash, setFlash] = useState<Flash>(null);
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [completed, setCompleted] = useState(47);
  const [synced, setSynced] = useState(47);
  const [cached, setCached] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [photoTaken, setPhotoTaken] = useState(false);
  const [clock, setClock] = useState("16:56");
  const [typeFilter, setTypeFilter] = useState<PropertyType | "All">("All");
  const [outcomeFilter, setOutcomeFilter] = useState<ScanOutcome | "All">("All");
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [audit, setAudit] = useState<AuditEntry[]>([]);

  // Anti-fraud & field telemetry controls
  const [ghostWalkSim, setGhostWalkSim] = useState(false);
  const [solousCongested, setSolousCongested] = useState(false);
  const [ptoAlertMsg, setPtoAlertMsg] = useState<string | null>(null);
  const [showClearanceModal, setShowClearanceModal] = useState(false);
  const [bioPhotos, setBioPhotos] = useState(0);
  const [hopperLocked, setHopperLocked] = useState(false);
  const [arrearsRef, setArrearsRef] = useState("9821");
  const [manualShortcode, setManualShortcode] = useState("");
  const [queue, setQueue] = useState<QueueEntry[]>([
    {
      id: "TX-0047",
      tagId: "TAG-HH-ALI-0147",
      eventType: "pickup.scanned",
      priority: 3,
      priorityLabel: "SCAN / PTO",
      hash: "7e92c40a11",
      prevHash: "0000000000",
      timestamp: "16:48",
      ptoCycles: 47,
      truckDistanceM: 9,
      synced: true,
      summary: "41 Road Block 40 · Verified PTO #47",
    },
  ]);

  const syncTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const truckDistanceM = ghostWalkSim ? 64 : 11;
  const ptoCycles = ghostWalkSim ? 0 : completed + 1;
  const truckLink = verifyTruckLink(truckDistanceM, ptoCycles);

  const addAudit = useCallback((entry: Omit<AuditEntry, "key" | "time">) => {
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
    setAudit((list) => [{ ...entry, key: Date.now() + Math.random(), time }, ...list]);
  }, []);

  const isOffline = network === "Offline" || network === "2G / Edge";
  const networkIcon =
    network === "Depot Wi-Fi" ? Wifi : network === "4G" ? Signal : network === "2G / Edge" ? SignalLow : WifiOff;
  const NetworkIcon = networkIcon;
  const activeScenario = getScenario(scenarioIndex);

  const recordLedgerEvent = useCallback(
    (
      tagId: string,
      eventType: QueueEntry["eventType"],
      priority: QueueEntry["priority"],
      priorityLabel: string,
      summary: string,
    ) => {
      const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
      setQueue((prev) => {
        const prevHash = prev[0]?.hash ?? "0000000000";
        const hash = computeChainHash(prevHash, tagId, timestamp, ptoCycles);
        const entry: QueueEntry = {
          id: `TX-${String(prev.length + 48).padStart(4, "0")}`,
          tagId,
          eventType,
          priority,
          priorityLabel,
          hash,
          prevHash,
          timestamp,
          ptoCycles,
          truckDistanceM,
          synced: !isOffline,
          summary,
        };
        return sortQueueByPriority([entry, ...prev]).slice(0, 20);
      });
    },
    [isOffline, ptoCycles, truckDistanceM],
  );

  useEffect(() => {
    const update = () => setClock(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }));
    update();
    const timer = setInterval(update, 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (screen !== "sync") return;
    const timer = setInterval(() => setManifest((value) => Math.min(150, value + 10)), 80);
    return () => clearInterval(timer);
  }, [screen]);

  useEffect(() => {
    if (manifest === 150 && screen === "sync") {
      const timer = setTimeout(() => setScreen("diagnostics"), 450);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [manifest, screen]);

  useEffect(() => {
    if (screen !== "diagnostics" || diagnosticStep >= 4) return;
    const timer = setTimeout(() => setDiagnosticStep((step) => step + 1), 500);
    return () => clearTimeout(timer);
  }, [diagnosticStep, screen]);

  useEffect(() => {
    if (isOffline || cached === 0) {
      setSyncing(false);
      if (syncTimer.current) clearInterval(syncTimer.current);
      return;
    }
    setSyncing(true);
    syncTimer.current = setInterval(() => {
      setCached((value) => {
        if (value <= 1) {
          setSyncing(false);
          if (syncTimer.current) clearInterval(syncTimer.current);
          return 0;
        }
        return value - 1;
      });
      setSynced((value) => Math.min(completed, value + 1));
      setQueue((prev) => {
        const nextIdx = prev.findIndex((item) => !item.synced);
        if (nextIdx === -1) return prev;
        return prev.map((item, idx) => (idx === nextIdx ? { ...item, synced: true } : item));
      });
    }, 600);
    return () => {
      if (syncTimer.current) clearInterval(syncTimer.current);
    };
  }, [network, cached, completed, isOffline]);

  const forceSyncAll = useCallback(() => {
    setCached(0);
    setSynced(completed);
    setQueue((prev) => prev.map((q) => ({ ...q, synced: true })));
  }, [completed]);

  const flashScreen = useCallback((kind: Exclude<Flash, null>) => {
    setFlash(kind);
    setTimeout(() => setFlash(null), 500);
  }, []);

  const scan = useCallback(() => {
    if (mode !== "operator" || screen !== "route") return;

    // Anti-'Ghost Pickup' Check (except weighbridge & recyclable drop-off)
    if (!truckLink.ok && activeScenario.outcome !== "weighbridge") {
      playTone("danger");
      navigator.vibrate?.([120, 60, 120]);
      flashScreen("danger");
      setPtoAlertMsg(truckLink.reason ?? "Truck >25m or zero PTO cycle");
      addAudit({
        property: activeScenario.address,
        reason: `Anti-ghost block: ${truckLink.reason}`,
        crew: "Babatunde A. · TRK-ALI-012",
        decision: "denied",
      });
      return;
    }

    setPtoAlertMsg(null);

    if (activeScenario.outcome === "biohazard") {
      playTone("danger");
      navigator.vibrate?.([100, 40, 100, 40, 120]);
      flashScreen("danger");
      setBioPhotos(0);
      setHopperLocked(true);
      setTimeout(() => setScreen("biohazard"), 220);
      return;
    }

    if (activeScenario.outcome === "weighbridge") {
      playTone("success");
      flashScreen("success");
      setTimeout(() => setScreen("weighbridge"), 220);
      return;
    }

    if (activeScenario.outcome === "gate-locked") {
      playTone("danger");
      flashScreen("danger");
      setPhotoTaken(false);
      setTimeout(() => setScreen("camera"), 240);
      return;
    }

    if (activeScenario.outcome !== "valid" && activeScenario.outcome !== "recyclable-handoff") {
      playTone("danger");
      navigator.vibrate?.([80, 50, 80, 50, 80]);
      flashScreen("danger");
      setTimeout(() => setScreen(activeScenario.outcome === "arrears" ? "arrears" : "exception"), 240);
      return;
    }

    playTone("success");
    navigator.vibrate?.(110);
    flashScreen("success");
    setPhotoTaken(false);
    setTimeout(() => setScreen("camera"), 260);
  }, [activeScenario, addAudit, flashScreen, mode, screen, truckLink]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== "Space" || event.repeat) return;
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      event.preventDefault();
      scan();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [scan]);

  const capture = () => {
    playTone("camera");
    setPhotoTaken(true);
    setCompleted((value) => value + 1);
    if (isOffline) setCached((value) => value + 1);
    else setSynced((value) => value + 1);

    const isGateLocked = activeScenario.outcome === "gate-locked";
    const isRecyclable = activeScenario.outcome === "recyclable-handoff";
    const statusText = isGateLocked
      ? "GATE_LOCKED SLA Shield"
      : isRecyclable
        ? "MRF Credited (420 kg)"
        : activeScenario.outcome === "arrears"
          ? "PAID-PARTIAL Override"
          : activeScenario.outcome === "damaged-tag"
            ? "NFC / Manual Verified"
            : "Collected + PTO Verified";

    setStatuses((s) => ({ ...s, [activeScenario.id]: statusText }));

    if (isGateLocked) {
      recordLedgerEvent(
        activeScenario.id,
        "pickup.gate_locked",
        2,
        "SLA SHIELD",
        `${activeScenario.address} · Geo-tagged locked gate photo`,
      );
      addAudit({
        property: activeScenario.address,
        reason: "GATE_LOCKED photo logged — PSP Bucket B SLA protected",
        crew: "Babatunde A. · TRK-ALI-012",
        decision: "sla-shield",
      });
    } else if (isRecyclable) {
      recordLedgerEvent(
        activeScenario.id,
        "pickup.recyclable_handoff",
        3,
        "MRF HANDOFF",
        `${activeScenario.address} · 420 kg PET & Cartons to FAC-ORG-ALI`,
      );
    } else {
      recordLedgerEvent(
        activeScenario.id,
        activeScenario.outcome === "arrears" ? "pickup.arrears_override" : "pickup.scanned",
        activeScenario.outcome === "arrears" ? 2 : 3,
        activeScenario.outcome === "arrears" ? "PAID-PARTIAL" : "SCAN / PTO",
        `${activeScenario.address} · ${statusText}`,
      );
    }

    setTimeout(() => {
      setScenarioIndex((value) => (value + 1) % STREET_SCENARIOS.length);
      setScreen("route");
    }, 850);
  };

  const advanceScenario = (customStatus?: string) => {
    const label: Record<ScanOutcome, string> = {
      valid: "Collected",
      arrears: "Skipped",
      biohazard: "Biohazard Locked",
      "gate-locked": "Gate Locked",
      "already-collected": "Duplicate Blocked",
      "wrong-zone": "Boundary Rejected",
      "damaged-tag": "NFC / Manual Proof",
      "recyclable-handoff": "MRF Credited",
      weighbridge: "Scale Reconciled",
    };
    setStatuses((s) => ({ ...s, [activeScenario.id]: customStatus ?? label[activeScenario.outcome] }));
    setScenarioIndex((value) => (value + 1) % STREET_SCENARIOS.length);
    setScreen("route");
  };

  const openScenario = (index: number) => {
    setScenarioIndex(index);
    setMode("operator");
    setPhotoTaken(false);
    setPtoAlertMsg(null);
    setScreen("route");
  };

  const filteredScenarios = STREET_SCENARIOS.map((s, index) => ({ s, index })).filter(
    ({ s }) => (typeFilter === "All" || s.type === typeFilter) && (outcomeFilter === "All" || s.outcome === outcomeFilter),
  );

  const startLogin = () => setScreen("sync");

  const deviceContent = useMemo(() => {
    if (mode === "supervisor") {
      return (
        <SupervisorDashboard
          network={network}
          completed={completed}
          cached={cached}
          queue={queue}
          audit={audit}
          addAudit={addAudit}
          onForceSyncAll={forceSyncAll}
          detourActive={solousCongested}
          onToggleDetour={() => setSolousCongested((v) => !v)}
        />
      );
    }
    if (screen === "login") return <LoginScreen pin={pin} setPin={setPin} onLogin={startLogin} />;
    if (screen === "sync") return <ManifestScreen manifest={manifest} />;
    if (screen === "diagnostics") return <DiagnosticsScreen step={diagnosticStep} onStart={() => setScreen("route")} />;
    if (screen === "queue") {
      return (
        <QueueScreen
          queue={queue}
          isOffline={isOffline}
          onBack={() => setScreen("route")}
          onFlush={() => {
            if (!isOffline) forceSyncAll();
          }}
        />
      );
    }
    if (screen === "camera") {
      return <CameraScreen scenario={activeScenario} taken={photoTaken} ptoCycles={ptoCycles} onCapture={capture} />;
    }
    if (screen === "biohazard") {
      return (
        <BiohazardScreen
          scenario={activeScenario}
          photos={bioPhotos}
          hopperLocked={hopperLocked}
          onSnap={() => {
            playTone("camera");
            setBioPhotos((p) => Math.min(2, p + 1));
          }}
          onSubmit={() => {
            recordLedgerEvent(
              activeScenario.id,
              "pickup.rejected_biohazard",
              1,
              "P1 BIOHAZARD",
              `${activeScenario.address} · 2 clinical proof photos · Hopper locked`,
            );
            addAudit({
              property: activeScenario.address,
              reason: "REJ-MED biohazard rejected · SPL-* notified · hopper locked",
              crew: "Babatunde A. · TRK-ALI-012",
              decision: "biohazard",
            });
            setHopperLocked(false);
            setCompleted((c) => c + 1);
            if (isOffline) setCached((v) => v + 1);
            else setSynced((v) => v + 1);
            advanceScenario("Biohazard P1 Dispatched");
          }}
        />
      );
    }
    if (screen === "weighbridge") {
      return (
        <WeighbridgeScreen
          scenario={activeScenario}
          congested={solousCongested}
          onConfirm={() => {
            recordLedgerEvent(
              activeScenario.id,
              "tls.weighed",
              4,
              solousCongested ? "AGEGE DETOUR" : "SCALE SLA",
              solousCongested
                ? "Detoured to Agege TLS (FAC-AGE) · avoided >45m Solous II queue"
                : "Solous II Ticket #TCK-SOL-0223 · 10.25t net · 32m SLA",
            );
            addAudit({
              property: activeScenario.address,
              reason: solousCongested
                ? "Solous II queue >45m -> Auto-Detoured to Agege TLS (FAC-AGE)"
                : "Solous II Scale Reconciled (10.25t net · +2.5% variance · 32m SLA)",
              crew: "Babatunde A. · TRK-ALI-012",
              decision: "weighbridge",
            });
            advanceScenario(solousCongested ? "Detoured -> Agege TLS" : "Weighed (10.25 t)");
          }}
        />
      );
    }
    if (screen === "arrears") {
      return (
        <ArrearsScreen
          scenario={activeScenario}
          arrearsRef={arrearsRef}
          setArrearsRef={setArrearsRef}
          onBack={() => advanceScenario("Arrears Blocked (Photo)")}
          onOverride={(claimMode) => {
            addAudit({
              property: activeScenario.address,
              reason:
                claimMode === "pos"
                  ? `PAID-PARTIAL transfer slip override (ref #${arrearsRef || "9821"})`
                  : "PAID-PARTIAL resident promise to pay by Friday",
              crew: "Babatunde A. · TRK-ALI-012",
              decision: "requested",
            });
            setScreen("camera");
            setPhotoTaken(false);
          }}
        />
      );
    }
    if (screen === "exception") {
      return (
        <ExceptionScreen
          scenario={activeScenario}
          manualShortcode={manualShortcode}
          setManualShortcode={setManualShortcode}
          onNfcTap={() => {
            playTone("success");
            flashScreen("success");
            setPhotoTaken(false);
            setScreen("camera");
          }}
          onResolve={
            activeScenario.outcome === "damaged-tag"
              ? () => {
                  setPhotoTaken(false);
                  setScreen("camera");
                }
              : () => advanceScenario()
          }
        />
      );
    }
    return (
      <RouteScreen
        scenarioIndex={scenarioIndex}
        completed={completed}
        synced={synced}
        cached={cached}
        ptoAlertMsg={ptoAlertMsg}
        truckLink={truckLink}
        ptoCycles={ptoCycles}
        onScan={scan}
        onOpenQueue={() => setScreen("queue")}
        onOpenClearance={() => setShowClearanceModal(true)}
        onTriggerBiohazard={() => {
          setBioPhotos(0);
          setHopperLocked(true);
          setScreen("biohazard");
        }}
      />
    );
  }, [
    activeScenario,
    addAudit,
    arrearsRef,
    audit,
    bioPhotos,
    cached,
    completed,
    diagnosticStep,
    flashScreen,
    forceSyncAll,
    hopperLocked,
    isOffline,
    manifest,
    manualShortcode,
    mode,
    network,
    photoTaken,
    pin,
    ptoAlertMsg,
    ptoCycles,
    queue,
    recordLedgerEvent,
    scan,
    scenarioIndex,
    screen,
    solousCongested,
    synced,
    truckLink,
  ]);

  return (
    <main className="prototype-stage">
      <section className="presentation-copy" aria-label="Prototype overview">
        {mode === "resident" ? (
          <>
            <div className="brand-mark resident-mark">
              <span>360</span>
            </div>
            <p className="eyebrow">RESIDENT MOBILE APP / IPHONE 17 PRO MOCKUP</p>
            <h1>
              Clean homes.
              <br />
              Verified at your door.
            </h1>
            <p className="intro">
              The citizen-facing application for Lagos households and businesses: request on-demand collections,
              register smart RFID bins, track collection crews in real-time, and manage cashless payments.
            </p>
          </>
        ) : mode === "supervisor" ? (
          <>
            <div className="brand-mark">
              <span>OPS</span>
            </div>
            <p className="eyebrow">DISTRICT FLEET COMMAND / SUPERVISOR DASHBOARD</p>
            <h1>
              Real-time oversight.
              <br />
              Across every zone.
            </h1>
            <p className="intro">
              Monitor compactor PTO cycles, inspect the cryptographic offline sync queue, approve PAID-PARTIAL overrides,
              and auto-detour Solous II congestion to Agege TLS.
            </p>
          </>
        ) : (
          <>
            <div className="brand-mark">
              <span>CF</span>
            </div>
            <p className="eyebrow">PIECE 3 · CREW FIELD APP / RUGGED HANDHELD TERMINAL</p>
            <h1>
              Built for the street.
              <br />
              Not the office.
            </h1>
            <p className="intro">
              Zero-touch RFID/NFC scanning for Alimosho–Orile Agege crews: anti-ghost-pickup PTO lock, offline
              cryptographic queue, biohazard rejection, and weighbridge SLA reconciliation.
            </p>
          </>
        )}

        <div className="control-panel">
          <p className="control-label">SELECT STAKEHOLDER VIEW</p>
          <div className="mode-switch" aria-label="App mode">
            <button className={mode === "operator" ? "selected" : ""} onClick={() => setMode("operator")}>
              <ScanLine /> Crew Scanner (Rugged)
            </button>
            <button className={mode === "supervisor" ? "selected" : ""} onClick={() => setMode("supervisor")}>
              <Users /> Supervisor Dashboard
            </button>
            <button className={mode === "resident" ? "selected" : ""} onClick={() => setMode("resident")}>
              <Smartphone /> Resident (iPhone 17)
            </button>
          </div>

          {mode !== "resident" && (
            <>
              <p className="control-label" style={{ marginTop: "18px" }}>
                SIMULATE NETWORK &amp; FIELD TELEMATICS
              </p>
              <div className="network-grid">
                {(["Depot Wi-Fi", "4G", "2G / Edge", "Offline"] as Network[]).map((item) => (
                  <button
                    key={item}
                    className={network === item ? "control-button active" : "control-button"}
                    onClick={() => setNetwork(item)}
                  >
                    {item === "Depot Wi-Fi" ? (
                      <Wifi />
                    ) : item === "4G" ? (
                      <Signal />
                    ) : item === "2G / Edge" ? (
                      <SignalLow />
                    ) : (
                      <WifiOff />
                    )}
                    <span>{item}</span>
                  </button>
                ))}
              </div>

              <div className="telematics-toggles">
                <button
                  type="button"
                  className={ghostWalkSim ? "toggle-pill danger" : "toggle-pill"}
                  onClick={() => {
                    setGhostWalkSim((v) => !v);
                    setPtoAlertMsg(null);
                  }}
                >
                  <AlertTriangle />
                  <span>{ghostWalkSim ? "Ghost Walk ON (>25m / 0 PTO)" : "Simulate Ghost Walk (>25m)"}</span>
                </button>
                <button
                  type="button"
                  className={solousCongested ? "toggle-pill active" : "toggle-pill"}
                  onClick={() => setSolousCongested((v) => !v)}
                >
                  <RouteIcon />
                  <span>{solousCongested ? "Solous II >45m Wait (Detour ON)" : "Simulate Solous II Queue (>45m)"}</span>
                </button>
                <button type="button" className="toggle-pill" onClick={() => setShowClearanceModal(true)}>
                  <QrCode />
                  <span>Agbero LG Clearance QR</span>
                </button>
              </div>
            </>
          )}
        </div>

        <div className="control-panel scenario-explorer">
          <p className="control-label">EXPLORE ALIMOSHO–ORILE AGEGE STREET SCENARIOS</p>
          <div className="filter-row" aria-label="Filter by property type">
            {(["All", "Home", "Flats", "Shop", "Office", "Clinic", "Hub"] as const).map((t) => (
              <button key={t} className={typeFilter === t ? "chip active" : "chip"} onClick={() => setTypeFilter(t)}>
                {t}
              </button>
            ))}
          </div>
          <div className="filter-row" aria-label="Filter by scan outcome">
            {(
              [
                "All",
                "valid",
                "arrears",
                "biohazard",
                "gate-locked",
                "damaged-tag",
                "recyclable-handoff",
                "weighbridge",
                "wrong-zone",
              ] as const
            ).map((o) => (
              <button
                key={o}
                className={outcomeFilter === o ? "chip active" : "chip"}
                onClick={() => setOutcomeFilter(o)}
              >
                {o === "All" ? "All outcomes" : OUTCOME_LABEL[o]}
              </button>
            ))}
          </div>
          <ul className="street-overview">
            {filteredScenarios.length === 0 && <li className="overview-empty">No properties match these filters.</li>}
            {filteredScenarios.map(({ s, index }) => (
              <li key={s.id} className={index === scenarioIndex ? "current" : ""}>
                <PropertyTypeIcon type={s.type} />
                <span className="ov-main">
                  <strong>{s.address}</strong>
                  <small>
                    {s.id} · {s.zone} · {s.street}
                  </small>
                </span>
                <span className={`ov-outcome ${s.outcome}`}>{OUTCOME_LABEL[s.outcome]}</span>
                <span className="ov-status">{statuses[s.id] ?? (index === scenarioIndex ? "Current" : "Pending")}</span>
                <button onClick={() => openScenario(index)} aria-label={`Open scenario ${s.address}`}>
                  Open
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="prototype-notes">
          {mode === "resident" ? (
            <>
              <div>
                <Smartphone />
                <span>
                  <strong>iPhone 17 Form Factor</strong>Ultra-slim titanium frame with interactive Dynamic Island
                </span>
              </div>
              <div>
                <Zap />
                <span>
                  <strong>Live &amp; Offline Ready</strong>Embedded production web app with deterministic fallback
                </span>
              </div>
            </>
          ) : (
            <>
              <div>
                <ScanLine />
                <span>
                  <strong>Physical trigger &amp; NTAG213 NFC</strong>Click device trigger, press Spacebar, or tap NFC
                  through mud
                </span>
              </div>
              <div>
                <ShieldCheck />
                <span>
                  <strong>PTO + Hash Chain Proof</strong>Requires truck within 25m + blade cycle + SHA-like local
                  chain
                </span>
              </div>
            </>
          )}
        </div>
      </section>

      {mode === "resident" ? (
        <section className="device-zone device-zone-iphone" aria-label="iPhone 17 Resident App Simulator">
          <div className="device-shadow" style={{ width: "360px", height: "40px", bottom: "10px" }} />
          <IPhone17Mockup initialRoute="/" />
        </section>
      ) : (
        <section className="device-zone" aria-label="Rugged handheld simulator">
          <div className="device-shadow" />
          <div className="scanner-head">
            <div className="scanner-window">
              <span />
            </div>
            <div className="indicator-strip">
              <i className="ready" />
              <i />
              <i />
            </div>
          </div>
          <div className="device-body">
            <div className="speaker">
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
            <button className="side-key left-key" onClick={scan} aria-label="Side scan key" />
            <div className={`device-screen ${flash ? `flash-${flash}` : ""}`}>
              <header className="status-bar">
                <span className="status-network">
                  <NetworkIcon /> {network}
                </span>
                <span>
                  OBD {truckDistanceM}m <Crosshair />
                </span>
                <span>
                  <BatteryFull /> 84%
                </span>
                <time>{clock}</time>
              </header>
              {isOffline && screen !== "login" && mode === "operator" && (
                <div className="offline-banner">
                  <WifiOff /> <strong>OFFLINE CRYPTO-QUEUE ACTIVE</strong>
                  <span>
                    {cached} {cached === 1 ? "record" : "records"} chained in IndexedDB
                  </span>
                </div>
              )}
              {syncing && (
                <div className="sync-banner">
                  <CloudUpload /> <strong>PRIORITY SYNCING P1→P4…</strong>
                  <span>
                    {synced}/{completed} synced
                  </span>
                </div>
              )}
              <div className="screen-content">{deviceContent}</div>
              <nav className="device-nav" aria-label="Device navigation">
                <button aria-label="Back" onClick={() => screen !== "login" && setScreen("route")}>
                  <ChevronRight className="back-icon" />
                </button>
                <span />
                <button aria-label="Home" onClick={() => setScreen(screen === "login" ? "login" : "route")}>
                  <i />
                </button>
              </nav>
            </div>
            <div className="device-badge">
              <ShieldAlert /> IP67 · MIL-810H
            </div>
            <div className="brand-plate">
              FIELDCORE <span>R6</span>
            </div>
            <button className="physical-trigger" onClick={scan} aria-label="Pull physical scanner trigger">
              <span className="trigger-ridges">
                <i />
                <i />
                <i />
              </span>
              <strong>SCAN</strong>
            </button>
          </div>
          <div className="pistol-grip">
            <span />
            <i />
          </div>
          <p className="trigger-hint">
            <kbd>SPACE</kbd> hardware trigger
          </p>
        </section>
      )}

      {showClearanceModal && (
        <div
          className="clearance-modal-back"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowClearanceModal(false);
          }}
        >
          <section className="clearance-modal" role="dialog" aria-modal="true" aria-label="Lagos LG & LAWMA Clearance Pass">
            <header>
              <div>
                <p className="screen-kicker">STATUTORY FIELD CREDENTIAL · SEC. 71 EMPL</p>
                <h2>Lagos LG &amp; Agbero Clearance Pass</h2>
              </div>
              <button onClick={() => setShowClearanceModal(false)} aria-label="Close clearance pass">
                <X />
              </button>
            </header>
            <div className="clearance-qr">
              <QrCode />
              <div>
                <strong>CLR-ALI-2026-012</strong>
                <small>TRUCK TRK-ALI-012 · ALIMOSHO &amp; ORILE AGEGE CONCESSION</small>
                <span>Verified MOU: Zero Informal Loading Levy (Agbero / Omo-Onile Exempt)</span>
              </div>
            </div>
            <div className="clearance-details">
              <div>
                <span>Crew Lead</span>
                <strong>Babatunde A. · Badge #CREW-ALI-04</strong>
              </div>
              <div>
                <span>Paired Feeder</span>
                <strong>KEKE-ALI-04 (Idimu Inner Lane)</strong>
              </div>
              <div>
                <span>Authorized Dumpsite</span>
                <strong>{solousCongested ? "Agege TLS (FAC-AGE · Detour)" : "Solous II (DS-SOL · Bay 2)"}</strong>
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function LoginScreen({ pin, setPin, onLogin }: { pin: string; setPin: (value: string) => void; onLogin: () => void }) {
  const add = (number: string) => {
    const next = (pin + number).slice(0, 4);
    setPin(next);
    if (next.length === 4) setTimeout(onLogin, 160);
  };
  return (
    <div className="login-screen">
      <div className="app-emblem">
        <RecycleMark />
      </div>
      <div>
        <p className="screen-kicker">DEPOT ACCESS · TRK-ALI-012</p>
        <h2>Start your shift</h2>
        <p>Enter 4-digit crew PIN or tap NFC badge</p>
      </div>
      <div className="pin-dots">
        {[0, 1, 2, 3].map((n) => (
          <span className={pin.length > n ? "filled" : ""} key={n} />
        ))}
      </div>
      <div className="keypad">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((n) => (
          <button key={n} onClick={() => add(n)}>
            {n}
          </button>
        ))}
        <button
          className="nfc-key"
          aria-label="NFC login"
          onClick={() => {
            setPin("1234");
            setTimeout(onLogin, 160);
          }}
        >
          <Nfc />
        </button>
        <button onClick={() => add("0")}>0</button>
        <button aria-label="Backspace" onClick={() => setPin(pin.slice(0, -1))}>
          <X />
        </button>
      </div>
      <button
        className="badge-login"
        onClick={() => {
          setPin("1234");
          setTimeout(onLogin, 160);
        }}
      >
        <Nfc /> TAP NFC CREW BADGE
      </button>
    </div>
  );
}

function ManifestScreen({ manifest }: { manifest: number }) {
  return (
    <div className="center-screen">
      <div className="sync-rings">
        <CloudUpload />
      </div>
      <p className="screen-kicker">DEPOT WI-FI CONNECTED · ALI-04</p>
      <h2>Loading today’s route</h2>
      <div className="manifest-number">
        {manifest}
        <span>/150</span>
      </div>
      <p>properties &amp; RFID keys cached offline</p>
      <div className="progress-track">
        <span style={{ width: `${manifest / 1.5}%` }} />
      </div>
      <div className="secure-note">
        <Check /> SQLite / IndexedDB SHA-chain initialized
      </div>
    </div>
  );
}

function DiagnosticsScreen({ step, onStart }: { step: number; onStart: () => void }) {
  const checks = [
    { icon: BatteryFull, label: "Hot-Swap Battery", detail: "84% · 9h 20m remaining" },
    { icon: ScanLine, label: "Laser + NTAG213 NFC", detail: "Ready · Dual-carrier <100ms decode" },
    { icon: Crosshair, label: "GNSS / GPS Lock", detail: "± 3 metres accuracy" },
    { icon: Truck, label: "OBD-II & PTO Blade Link", detail: "TRK-ALI-012 · Armored conduit OK" },
  ];
  return (
    <div className="diagnostics-screen">
      <p className="screen-kicker">PRE-SHIFT CHECK</p>
      <h2>Hardware diagnostics</h2>
      <p className="muted-copy">Verify handheld &amp; truck PTO pairing.</p>
      <div className="diagnostic-list">
        {checks.map(({ icon: Icon, label, detail }, index) => (
          <div className={step > index ? "diagnostic-row passed" : "diagnostic-row"} key={label}>
            <Icon />
            <span>
              <strong>{label}</strong>
              <small>{step > index ? detail : "Checking…"}</small>
            </span>
            {step > index && <Check />}
          </div>
        ))}
      </div>
      <button className="primary-action" disabled={step < 4} onClick={onStart}>
        {step < 4 ? "PAIRING TELEMATICS…" : "START ROUTE"}
        <ChevronRight />
      </button>
    </div>
  );
}

function PropertyTypeIcon({ type }: { type: PropertyType }) {
  const Icon =
    type === "Home"
      ? Home
      : type === "Shop"
        ? Store
        : type === "Clinic"
          ? Biohazard
          : type === "Hub"
            ? Recycle
            : Building2;
  return <Icon aria-hidden="true" />;
}

function RouteScreen({
  scenarioIndex,
  completed,
  synced,
  cached,
  ptoAlertMsg,
  truckLink,
  ptoCycles,
  onScan,
  onOpenQueue,
  onOpenClearance,
  onTriggerBiohazard,
}: {
  scenarioIndex: number;
  completed: number;
  synced: number;
  cached: number;
  ptoAlertMsg: string | null;
  truckLink: { ok: boolean; reason?: string };
  ptoCycles: number;
  onScan: () => void;
  onOpenQueue: () => void;
  onOpenClearance: () => void;
  onTriggerBiohazard: () => void;
}) {
  const visibleScenarios = [0, 1, 2].map((offset) => getScenario(scenarioIndex + offset));
  const current = getScenario(scenarioIndex);
  return (
    <div className="route-screen">
      <header className="route-header">
        <div>
          <p className="screen-kicker">
            ZONE {current.zone} · STOP {completed + 1}
          </p>
          <h2>{current.street}</h2>
        </div>
        <div className="route-right-meta">
          <button className="lg-pass-btn" onClick={onOpenClearance} title="Show Agbero / LGA Clearance Pass">
            <QrCode /> LG PASS
          </button>
          <div className="route-count">
            <strong>{completed}</strong>
            <span>/150</span>
          </div>
        </div>
      </header>
      <div className="route-progress">
        <span style={{ width: `${(completed / 150) * 100}%` }} />
      </div>

      <div className={`pto-strip ${truckLink.ok ? "ok" : "blocked"}`}>
        <Truck />
        <span>
          {truckLink.ok
            ? `TRK-ALI-012 LINKED · PTO #${ptoCycles} READY`
            : `FRAUD GUARD: ${ptoAlertMsg ?? truckLink.reason}`}
        </span>
      </div>

      <div className="street-strip">
        <div className="route-line">
          <i className="done-dot" />
          <i className="current-dot" />
          <i />
          <i />
        </div>
        <MapPin />
        <span>
          <strong>{current.address}</strong>
          <small>
            Next stop · {current.distance} m ahead · {OUTCOME_LABEL[current.outcome]}
          </small>
        </span>
      </div>

      <div className="scan-callout">
        <div className="laser">
          <ScanLine />
        </div>
        <span>
          <strong>READY TO SCAN ({current.id})</strong>
          <small>Pull trigger, Spacebar, or tap Manual Scan</small>
        </span>
      </div>

      <div className="property-list">
        {visibleScenarios.map((property, i) => (
          <div className={i === 0 ? "property active" : "property"} key={property.id}>
            <span className="property-index">
              <PropertyTypeIcon type={property.type} />
            </span>
            <span>
              <strong>{property.address}</strong>
              <small>
                <b>{property.type}</b> · {property.service}
              </small>
              <small>{property.id}</small>
            </span>
            {i === 0 ? <Radio /> : <ChevronRight />}
          </div>
        ))}
      </div>

      <footer className="route-footer">
        <button type="button" className="queue-pill" onClick={onOpenQueue}>
          <CloudUpload />{" "}
          <strong>
            {synced}/150{cached > 0 ? ` (+${cached})` : ""}
          </strong>
        </button>
        <button type="button" className="bio-mini-btn" onClick={onTriggerBiohazard} title="Reject clinical / hazardous waste">
          <Biohazard />
        </button>
        <button type="button" className="scan-main-btn" onClick={onScan}>
          <ScanLine /> SCAN
        </button>
      </footer>
    </div>
  );
}

function CameraScreen({
  scenario,
  taken,
  ptoCycles,
  onCapture,
}: {
  scenario: StreetScenario;
  taken: boolean;
  ptoCycles: number;
  onCapture: () => void;
}) {
  const isGateLocked = scenario.outcome === "gate-locked";
  return (
    <div className={`camera-screen ${taken ? "captured" : ""}`}>
      <div className="camera-scene">
        <div className="wall-texture" />
        <div className="wheelie-bin">
          <span className="bin-lid" />
          <span className="bin-body">
            <i />
          </span>
          <b />
          <b />
        </div>
        <div className="focus-frame">
          <i />
          <i />
          <i />
          <i />
        </div>
        {taken && (
          <div className="capture-confirm">
            <Check />
            <strong>{isGateLocked ? "GATE_LOCKED SAVED" : "PROOF SAVED"}</strong>
            <span>Local IndexedDB write · 34ms · PTO #{ptoCycles}</span>
          </div>
        )}
        <div className="geo-stamp">
          <span>
            <MapPin /> 6.6018° N, 3.2841° E · PTO #{ptoCycles}
          </span>
          <span>17 NOV 2026 · 16:56:42 WAT</span>
          <strong>
            {scenario.id} · {isGateLocked ? "GATE LOCKED SLA PROOF" : scenario.type.toUpperCase()}
          </strong>
        </div>
      </div>
      <div className="camera-controls">
        <span>{isGateLocked ? "Capture padlocked shutter" : scenario.service}</span>
        <button onClick={onCapture} disabled={taken} aria-label="Take proof photo">
          <i />
        </button>
        <Camera />
      </div>
    </div>
  );
}

function BiohazardScreen({
  scenario,
  photos,
  hopperLocked,
  onSnap,
  onSubmit,
}: {
  scenario: StreetScenario;
  photos: number;
  hopperLocked: boolean;
  onSnap: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="arrears-screen biohazard-mode">
      <div className="alert-icon">
        <Biohazard />
      </div>
      <p className="screen-kicker">REJ-MED · BIOHAZARD CONTAMINATION</p>
      <h2>
        REJECT
        <br />
        BIOHAZARD
      </h2>
      <div className="do-not">
        <Lock style={{ width: 18, height: 18, display: "inline", marginRight: 6 }} />
        {hopperLocked ? "HOPPER CYCLE LOCKED" : "LOCKED"}
      </div>
      <div className="account-detail">
        <span>PROPERTY</span>
        <strong>{scenario.address}</strong>
        <span>CONTAMINANT</span>
        <strong>Clinical syringes / blood bags</strong>
        <span>DISPATCH TO</span>
        <strong>LAWMA Specialized (SPL-*)</strong>
      </div>
      <div className="bio-photo-steps">
        <button type="button" className="override" onClick={onSnap} disabled={photos >= 2}>
          <Camera /> {photos === 0 ? "1. CAPTURE WIDE CONTEXT PHOTO" : photos === 1 ? "2. CAPTURE CLOSE-UP CONTAMINANT" : "2/2 MANDATORY PHOTOS SAVED"}
        </button>
      </div>
      <button className="danger-back" disabled={photos < 2} onClick={onSubmit}>
        <ShieldAlert /> {photos < 2 ? `TAKE ${2 - photos} PHOTO(S) TO DISPATCH` : "SEND P1 BIOHAZARD ALERT"}
      </button>
    </div>
  );
}

function WeighbridgeScreen({
  scenario,
  congested,
  onConfirm,
}: {
  scenario: StreetScenario;
  congested: boolean;
  onConfirm: () => void;
}) {
  const gross = scenario.grossKg ?? 18450;
  const tare = scenario.tareKg ?? 8200;
  const queueMin = congested ? 52 : (scenario.queueMinutes ?? 32);
  const evalRes = evaluateWeighbridgeTicket(gross, tare, scenario.estimatedStopTonnes ?? 10.0, queueMin);

  return (
    <div className="exception-screen weighbridge">
      <div className="exception-icon">
        <Scale />
      </div>
      <p className="screen-kicker">{congested ? "QUEUE > 45 MIN SLA BREACH" : "LOAD-CELL RECONCILIATION"}</p>
      <h2>
        <span>{congested ? "AUTO-DETOUR" : "WEIGHBRIDGE"}</span>
        <span>{congested ? "AGEGE TLS" : `${evalRes.netTonnes} TONNES`}</span>
      </h2>
      <div className="exception-message">
        {congested
          ? `Solous II queue is ${queueMin} min (>45m SLA). Bypassing LASU-Igando congestion to ${evalRes.detourFacility}.`
          : `Ticket ${scenario.id} · Mass-balance variance ${evalRes.variancePct > 0 ? "+" : ""}${evalRes.variancePct}% (within ±20%)`}
      </div>
      <div className="account-detail">
        <span>GROSS / TARE</span>
        <strong>
          {gross.toLocaleString()} / {tare.toLocaleString()} kg
        </strong>
        <span>NET TONNAGE</span>
        <strong>{evalRes.netTonnes} t (Load-cell locked)</strong>
        <span>SLA TIMER</span>
        <strong>{queueMin} / 45 min</strong>
      </div>
      <button className="exception-action" onClick={onConfirm}>
        <ChevronRight /> {congested ? "CONFIRM DETOUR TO AGEGE TLS" : "CLOSE ROUTE MANIFEST"}
      </button>
    </div>
  );
}

const nextSteps: Record<Exclude<ScanOutcome, "valid" | "biohazard" | "gate-locked" | "recyclable-handoff" | "weighbridge">, string[]> = {
  arrears: ["Never argue at compound gates", "Log POS / transfer ref for PAID-PARTIAL override"],
  "already-collected": ["Prevent double-billing", "Move to next property"],
  "wrong-zone": ["Sec. 71 Ward Exclusivity", "Reject tag — Zone AYB-07 crew notified"],
  "damaged-tag": ["Tap passive NTAG213 NFC through oil/mud", "Or key 4-digit street shortcode + photo"],
};

function NextSteps({
  outcome,
}: {
  outcome: Exclude<ScanOutcome, "valid" | "biohazard" | "gate-locked" | "recyclable-handoff" | "weighbridge">;
}) {
  return (
    <ol className="next-steps" aria-label="Next steps">
      {nextSteps[outcome].map((step, i) => (
        <li key={step}>
          <b>{i + 1}</b>
          {step}
        </li>
      ))}
    </ol>
  );
}

function ArrearsScreen({
  scenario,
  arrearsRef,
  setArrearsRef,
  onBack,
  onOverride,
}: {
  scenario: StreetScenario;
  arrearsRef: string;
  setArrearsRef: (v: string) => void;
  onBack: () => void;
  onOverride: (claimMode: "pos" | "friday") => void;
}) {
  return (
    <div className="arrears-screen">
      <div className="alert-icon">
        <ShieldAlert />
      </div>
      <p className="screen-kicker">ZERO-CONFRONTATION PROTOCOL</p>
      <h2>
        ACCOUNT
        <br />
        ARREARS
      </h2>
      <div className="do-not">₦{(scenario.arrearsNgn ?? 15000).toLocaleString("en-NG")} DUE</div>
      <div className="account-detail">
        <span>PROPERTY</span>
        <strong>{scenario.address}</strong>
        <span>LAST PAID</span>
        <strong>{scenario.lastPayment ?? "14 Sep 2026"}</strong>
        <span>TRANSFER REF</span>
        <strong>
          <input
            aria-label="Last 4 digits of payment slip"
            value={arrearsRef}
            onChange={(e) => setArrearsRef(e.target.value.slice(0, 6))}
            className="terminal-input"
            placeholder="Last 4 digits"
          />
        </strong>
      </div>
      <NextSteps outcome="arrears" />
      <button className="override primary-override" onClick={() => onOverride("pos")}>
        <ShieldCheck /> PAID-PARTIAL: LOG SLIP #{arrearsRef || "9821"} &amp; COLLECT
      </button>
      <button className="override" onClick={() => onOverride("friday")}>
        <Check /> RESIDENT PROMISE BY FRIDAY (NO GATE FIGHT)
      </button>
      <button className="danger-back" onClick={onBack}>
        <X /> SKIP / PERSISTENT REFUSAL
      </button>
    </div>
  );
}

function ExceptionScreen({
  scenario,
  manualShortcode,
  setManualShortcode,
  onNfcTap,
  onResolve,
}: {
  scenario: StreetScenario;
  manualShortcode: string;
  setManualShortcode: (v: string) => void;
  onNfcTap: () => void;
  onResolve: () => void;
}) {
  const details =
    scenario.outcome === "already-collected"
      ? {
          kicker: "DUPLICATE SCAN",
          lines: ["ALREADY", "COLLECTED"],
          message: "Proof recorded today at 14:32 · double-billing blocked",
          action: "NEXT PROPERTY",
          icon: Check,
        }
      : scenario.outcome === "wrong-zone"
        ? {
            kicker: "TAG MISMATCH · SEC. 71",
            lines: ["WRONG", "ZONE"],
            message: "Assigned to Zone AYB-07 · outside concession",
            action: "REJECT TAG",
            icon: MapPin,
          }
        : {
            kicker: "BARCODE COVERED IN PALM OIL / MUD",
            lines: ["TAP NFC", "OR CODE"],
            message: "NTAG213 NFC chip active through sludge — replacement tag auto-ordered",
            action: "PHOTO WITH SHORTCODE",
            icon: Nfc,
          };
  const Icon = details.icon;
  const outcome: Exclude<
    ScanOutcome,
    "valid" | "biohazard" | "gate-locked" | "recyclable-handoff" | "weighbridge"
  > =
    scenario.outcome === "already-collected" || scenario.outcome === "wrong-zone" || scenario.outcome === "damaged-tag"
      ? scenario.outcome
      : "damaged-tag";

  return (
    <div className={`exception-screen ${scenario.outcome}`}>
      <div className="exception-icon">
        <Icon />
      </div>
      <p className="screen-kicker">{details.kicker}</p>
      <h2>
        {details.lines.map((line) => (
          <span key={line}>{line}</span>
        ))}
      </h2>
      <div className="exception-message">{details.message}</div>
      <div className="account-detail">
        <span>PROPERTY</span>
        <strong>{scenario.address}</strong>
        <span>TAG / ZONE</span>
        <strong>
          {scenario.id} · {scenario.zone}
        </strong>
        {scenario.outcome === "damaged-tag" && (
          <>
            <span>STREET #</span>
            <strong>
              <input
                aria-label="4-digit street shortcode"
                value={manualShortcode}
                onChange={(e) => setManualShortcode(e.target.value.slice(0, 6))}
                placeholder="e.g. 0222"
                className="terminal-input"
              />
            </strong>
          </>
        )}
      </div>
      <NextSteps outcome={outcome} />
      {scenario.outcome === "damaged-tag" && (
        <button className="nfc-tap-btn" onClick={onNfcTap}>
          <Nfc /> TAP PASSIVE NTAG213 NFC CHIP
        </button>
      )}
      <button className="exception-action" onClick={onResolve}>
        <ChevronRight /> {details.action}
      </button>
    </div>
  );
}

function QueueScreen({
  queue,
  isOffline,
  onBack,
  onFlush,
}: {
  queue: QueueEntry[];
  isOffline: boolean;
  onBack: () => void;
  onFlush: () => void;
}) {
  const pendingCount = queue.filter((q) => !q.synced).length;
  return (
    <div className="supervisor-screen">
      <div className="sup-detail">
        <button className="sup-back" onClick={onBack}>
          <ChevronRight className="back-icon" /> Route
        </button>
        <p className="screen-kicker">INDEXEDDB APPEND-ONLY LEDGER</p>
        <h2>Offline sync queue</h2>
        <div className="audit-list">
          {queue.map((item) => (
            <div className="audit-row" key={item.id}>
              <span className={`audit-badge ${item.priority === 1 ? "denied" : item.synced ? "approved" : "requested"}`}>
                P{item.priority}
              </span>
              <span className="audit-main">
                <strong>
                  {item.tagId} · {item.priorityLabel}
                </strong>
                <small>
                  #{item.hash} ← #{item.prevHash} · PTO #{item.ptoCycles} ({item.truckDistanceM}m)
                </small>
              </span>
              <time>{item.synced ? "SYNCED" : "QUEUED"}</time>
            </div>
          ))}
        </div>
        <button className="sup-action" disabled={isOffline || pendingCount === 0} onClick={onFlush}>
          <CloudUpload />{" "}
          {isOffline
            ? `OFFLINE (${pendingCount} SAVED LOCALLY)`
            : pendingCount === 0
              ? "ALL RECORDS SYNCED"
              : `FLUSH ${pendingCount} QUEUED RECORD(S)`}
        </button>
      </div>
    </div>
  );
}

function RecycleMark() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M24 5 31 17H17L24 5ZM10 21l7 4-7 12V21Zm28 0v16L31 25l7-4ZM15 39h18l-4-7H19l-4 7Z" fill="currentColor" />
    </svg>
  );
}
