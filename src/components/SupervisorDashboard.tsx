import {
  AlertTriangle,
  BatteryFull,
  Bell,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  CloudUpload,
  Gauge,
  MapPin,
  Route,
  ShieldAlert,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import type { AuditEntry, Network, QueueEntry } from "@/lib/crew-ops";

type Crew = {
  name: string;
  truckPlate: string;
  zone: string;
  done: number;
  total: number;
  battery: number;
  pending: number;
  online: boolean;
  location: string;
  ptoCycles: number;
  tamperAlert?: string;
};

type Override = {
  id: string;
  crew: string;
  address: string;
  arrearsNgn: number;
  claimType: string;
  status: "pending" | "approved" | "denied";
};

type View =
  | { kind: "home" }
  | { kind: "crew"; name: string }
  | { kind: "overrides" }
  | { kind: "alert" }
  | { kind: "corridor" }
  | { kind: "queue" }
  | { kind: "audit" };

export function SupervisorDashboard({
  network,
  completed,
  cached,
  queue,
  audit,
  addAudit,
  onForceSyncAll,
  detourActive,
  onToggleDetour,
}: {
  network: Network;
  completed: number;
  cached: number;
  queue: QueueEntry[];
  audit: AuditEntry[];
  addAudit: (entry: Omit<AuditEntry, "key" | "time">) => void;
  onForceSyncAll: () => void;
  detourActive: boolean;
  onToggleDetour: () => void;
}) {
  const [view, setView] = useState<View>({ kind: "home" });
  const [pinged, setPinged] = useState<string[]>([]);
  const [syncRequested, setSyncRequested] = useState<string[]>([]);
  const [swapSent, setSwapSent] = useState(false);
  const [overrides, setOverrides] = useState<Override[]>([
    {
      id: "OVR-ALI-0149",
      crew: "Babatunde A.",
      address: "Ikotun Market Central Skip",
      arrearsNgn: 15000,
      claimType: "Baba Oja POS slip · ref #9821",
      status: "pending",
    },
    {
      id: "OVR-ORA-0311",
      crew: "Musa K.",
      address: "Kudirat Plaza, Orile Agege",
      arrearsNgn: 12500,
      claimType: "Bank transfer promise by Fri (PAID-PARTIAL)",
      status: "pending",
    },
  ]);
  const [toast, setToast] = useState<string | null>(null);

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  };

  const crew: Crew[] = [
    {
      name: "Babatunde A.",
      truckPlate: "TRK-ALI-012",
      zone: "Zone ALI-04 (Gowon / Ikotun)",
      done: completed,
      total: 150,
      battery: 84,
      pending: cached,
      online: true,
      location: "41 Road, Mosan-Okunola",
      ptoCycles: 48,
    },
    {
      name: "Musa K.",
      truckPlate: "TRK-ORA-008",
      zone: "Zone ORA-06 (Papa Ashafa)",
      done: syncRequested.includes("Musa K.") ? 94 : 87,
      total: 150,
      battery: 61,
      pending: syncRequested.includes("Musa K.") ? 0 : 7,
      online: syncRequested.includes("Musa K."),
      location: "Agege Motor Rd Corridor",
      ptoCycles: 81,
    },
    {
      name: "Adaeze N.",
      truckPlate: "TRK-ALI-019",
      zone: "Zone ALI-05 (Idimu / Ayobo)",
      done: 122,
      total: 150,
      battery: swapSent ? 100 : 43,
      pending: syncRequested.includes("Adaeze N.") ? 0 : 2,
      online: true,
      location: "Idimu Micro-Collector Hub",
      ptoCycles: 0,
      tamperAlert: "Zero hydraulic PTO cycles on last 3 scans — inspect Ladipo cable conduit",
    },
  ];

  const totalDone = crew.reduce((n, c) => n + c.done, 0);
  const totalAll = crew.reduce((n, c) => n + c.total, 0);
  const pct = Math.round((totalDone / totalAll) * 100);
  const pendingSync = crew.reduce((n, c) => n + c.pending, 0);
  const openOverrides = overrides.filter((o) => o.status === "pending").length;
  const queuedRecords = queue.filter((q) => !q.synced);

  const decide = (id: string, status: "approved" | "denied") => {
    const target = overrides.find((o) => o.id === id);
    setOverrides((list) => list.map((o) => (o.id === id ? { ...o, status } : o)));
    if (target) {
      addAudit({
        property: target.address,
        reason: `Arrears override ${status} (${target.claimType})`,
        crew: target.crew,
        decision: status,
      });
    }
    notify(status === "approved" ? "PAID-PARTIAL approved — crew notified" : "Override denied — lock hopper");
  };

  let body: React.ReactNode;
  if (view.kind === "crew") {
    const c = (crew.find((x) => x.name === view.name) ?? crew[0])!;
    body = (
      <div className="sup-detail">
        <button className="sup-back" onClick={() => setView({ kind: "home" })}>
          <ChevronLeft /> Fleet
        </button>
        <p className="screen-kicker">
          {c.zone} · {c.truckPlate}
        </p>
        <h2>{c.name}</h2>
        <div className="sup-stats">
          <div>
            <span>PROGRESS</span>
            <strong>{Math.round((c.done / c.total) * 100)}%</strong>
            <small>
              {c.done}/{c.total}
            </small>
          </div>
          <div>
            <span>BATTERY</span>
            <strong className={c.battery < 50 ? "warn" : ""}>{c.battery}%</strong>
            <small>{c.online ? "Online" : "Offline"}</small>
          </div>
          <div>
            <span>PTO CYCLES</span>
            <strong className={c.ptoCycles === 0 ? "warn" : ""}>{c.ptoCycles}</strong>
            <small>{c.pending} unsynced</small>
          </div>
        </div>
        <div className="sup-location">
          <MapPin /> {c.location}
        </div>
        {c.tamperAlert ? (
          <div className="sup-tamper-box">
            <AlertTriangle />
            <span>
              <strong>TELEMATICS / PTO ALERT</strong>
              <small>{c.tamperAlert}</small>
            </span>
          </div>
        ) : null}
        <button
          className="sup-action"
          disabled={pinged.includes(c.name)}
          onClick={() => {
            setPinged((p) => [...p, c.name]);
            notify(`Priority ping sent to ${c.name} (${c.truckPlate})`);
          }}
        >
          <Bell /> {pinged.includes(c.name) ? "CREW PINGED" : "PING CREW / REQUEST PTO CHECK"}
        </button>
        <button
          className="sup-action secondary"
          disabled={c.pending === 0}
          onClick={() => {
            setSyncRequested((s) => [...s, c.name]);
            if (c.name === "Babatunde A.") onForceSyncAll();
            notify(`Cryptographic sync forced for ${c.name}`);
          }}
        >
          <CloudUpload /> {c.pending === 0 ? "ALL RECORDS SYNCED" : `FORCE SYNC (${c.pending})`}
        </button>
      </div>
    );
  } else if (view.kind === "overrides") {
    body = (
      <div className="sup-detail">
        <button className="sup-back" onClick={() => setView({ kind: "home" })}>
          <ChevronLeft /> Fleet
        </button>
        <p className="screen-kicker">ZERO-CONFRONTATION PROTOCOL</p>
        <h2>Approval queue</h2>
        <div className="override-list">
          {overrides.map((o) => (
            <div className="override-row" key={o.id}>
              <span>
                <strong>{o.address}</strong>
                <small>
                  {o.crew} · {o.id} · ₦{o.arrearsNgn.toLocaleString("en-NG")}
                </small>
                <small className="override-claim">{o.claimType}</small>
              </span>
              {o.status === "pending" ? (
                <div className="override-buttons">
                  <button
                    className="approve"
                    aria-label={`Approve ${o.address}`}
                    onClick={() => decide(o.id, "approved")}
                  >
                    <Check />
                  </button>
                  <button
                    className="deny"
                    aria-label={`Deny ${o.address}`}
                    onClick={() => decide(o.id, "denied")}
                  >
                    <X />
                  </button>
                </div>
              ) : (
                <span className={`override-status ${o.status}`}>{o.status.toUpperCase()}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  } else if (view.kind === "queue") {
    body = (
      <div className="sup-detail">
        <button className="sup-back" onClick={() => setView({ kind: "home" })}>
          <ChevronLeft /> Fleet
        </button>
        <p className="screen-kicker">INDEXEDDB APPEND-ONLY LEDGER</p>
        <h2>Priority sync queue</h2>
        <div className="audit-list">
          {queue.length === 0 ? (
            <p className="audit-empty">No field transactions recorded in this session yet. Scan stops in Crew Scanner to populate.</p>
          ) : (
            queue.map((item) => (
              <div className="audit-row" key={item.id}>
                <span className={`audit-badge ${item.priority === 1 ? "denied" : item.synced ? "approved" : "requested"}`}>
                  P{item.priority}
                </span>
                <span className="audit-main">
                  <strong>
                    {item.tagId} · {item.priorityLabel}
                  </strong>
                  <small>
                    #{item.hash} ← #{item.prevHash} · {item.truckDistanceM}m / PTO {item.ptoCycles}
                  </small>
                </span>
                <time>{item.synced ? "SYNCED" : "QUEUED"}</time>
              </div>
            ))
          )}
        </div>
        <button
          className="sup-action"
          disabled={queuedRecords.length === 0}
          onClick={() => {
            onForceSyncAll();
            notify("Drained queued records in P1→P4 priority order");
          }}
        >
          <CloudUpload /> {queuedRecords.length ? `FLUSH ${queuedRecords.length} QUEUED RECORD(S)` : "ALL RECORDS SYNCED"}
        </button>
      </div>
    );
  } else if (view.kind === "corridor") {
    body = (
      <div className="sup-detail">
        <button className="sup-back" onClick={() => setView({ kind: "home" })}>
          <ChevronLeft /> Fleet
        </button>
        <p className="screen-kicker">SLA & QUEUE DEFENSE</p>
        <h2>Solous II queue alert</h2>
        <div className="sup-tamper-box">
          <Route />
          <span>
            <strong>52 MIN BAY WAIT AT SOLOUS II (DS-SOL)</strong>
            <small>Exceeds 45-min Turnaround SLA. Midnight roadside dumping risk on LASU–Igando Rd.</small>
          </span>
        </div>
        <button
          className="sup-action"
          onClick={() => {
            onToggleDetour();
            addAudit({
              property: "Solous II -> Agege TLS (FAC-AGE)",
              reason: detourActive ? "Cleared corridor detour back to Solous II" : "Auto-detour active (>45m queue SLA breach)",
              crew: "Alimosho Fleet",
              decision: "weighbridge",
            });
            notify(detourActive ? "Solous II corridor restored" : "Rerouted Alimosho fleet to Agege TLS (FAC-AGE)");
          }}
        >
          <Route /> {detourActive ? "RESTORE SOLOUS II ROUTE" : "AUTO-DETOUR FLEET TO AGEGE TLS"}
        </button>
      </div>
    );
  } else if (view.kind === "audit") {
    body = (
      <div className="sup-detail">
        <button className="sup-back" onClick={() => setView({ kind: "home" })}>
          <ChevronLeft /> Fleet
        </button>
        <p className="screen-kicker">CRYPTOGRAPHIC AUDIT TRAIL</p>
        <h2>Field activity log</h2>
        {audit.length === 0 ? (
          <p className="audit-empty">
            No override or biohazard activity yet. Approve/deny an override, reject biohazard waste, or file gate-locked proof in the scanner.
          </p>
        ) : (
          <div className="audit-list">
            {audit.map((entry) => (
              <div className="audit-row" key={entry.key}>
                <span className={`audit-badge ${entry.decision}`}>{entry.decision.toUpperCase()}</span>
                <span className="audit-main">
                  <strong>{entry.property}</strong>
                  <small>
                    {entry.reason} · {entry.crew}
                  </small>
                </span>
                <time>{entry.time}</time>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  } else if (view.kind === "alert") {
    body = (
      <div className="sup-detail">
        <button className="sup-back" onClick={() => setView({ kind: "home" })}>
          <ChevronLeft /> Fleet
        </button>
        <p className="screen-kicker">TELEMATICS & BATTERY ALERT</p>
        <h2>Adaeze N. · TRK-ALI-019</h2>
        <div className="sup-location">
          <Gauge /> {swapSent ? "100% battery + armored PTO conduit verified" : "43% battery · 0 PTO cycles on last 3 scans"}
        </div>
        <button
          className="sup-action"
          disabled={swapSent}
          onClick={() => {
            setSwapSent(true);
            notify("Spare battery & armored PTO sensor inspection dispatched");
          }}
        >
          <BatteryFull /> {swapSent ? "INSPECTION & BATTERY DISPATCHED" : "DISPATCH BATTERY + PTO CHECK"}
        </button>
        <button className="sup-action secondary" onClick={() => setView({ kind: "crew", name: "Adaeze N." })}>
          <Users /> VIEW CREW DETAILS
        </button>
      </div>
    );
  } else {
    body = (
      <>
        <header>
          <div>
            <p className="screen-kicker">ALIMOSHO – ORILE AGEGE FLEET COMMAND</p>
            <h2>Good afternoon, Chidi</h2>
          </div>
          <div className="avatar">CO</div>
        </header>
        <div className="fleet-summary">
          <div>
            <span>CORRIDOR PROGRESS</span>
            <strong>{pct}%</strong>
            <small>
              {totalDone} of {totalAll} properties · {detourActive ? "Detour: Agege TLS" : "Solous II SLA active"}
            </small>
          </div>
          <div className="ring-chart" style={{ background: `conic-gradient(var(--accent) ${pct}%, var(--muted) 0)` }}>
            <span>{pct}</span>
          </div>
        </div>
        <div className="metric-grid">
          <button onClick={() => setView({ kind: "overrides" })}>
            <ShieldAlert />
            <span>
              <strong>{openOverrides}</strong>
              <small>Overrides</small>
            </span>
          </button>
          <button onClick={() => setView({ kind: "queue" })}>
            <CloudUpload />
            <span>
              <strong>{queuedRecords.length + pendingSync}</strong>
              <small>Sync queue</small>
            </span>
          </button>
          <button onClick={() => setView({ kind: "corridor" })}>
            <Route />
            <span>
              <strong>{detourActive ? "DETOUR" : "52m"}</strong>
              <small>Solous SLA</small>
            </span>
          </button>
          <button onClick={() => setView({ kind: "audit" })}>
            <ClipboardList />
            <span>
              <strong>{audit.length}</strong>
              <small>Audit log</small>
            </span>
          </button>
        </div>
        <div className="section-title">
          <span>CREW STATUS · TAP FOR PTO & SYNC</span>
          <small>LIVE · {network}</small>
        </div>
        <div className="crew-list">
          {crew.map((p) => (
            <button className="crew-row" key={p.name} onClick={() => setView({ kind: "crew", name: p.name })}>
              <div className={`crew-dot ${p.online ? "online" : "offline"}`} />
              <span className="crew-name">
                <strong>
                  {p.name} · {p.truckPlate}
                </strong>
                <small>
                  {p.zone} · {Math.round((p.done / p.total) * 100)}% complete · {p.ptoCycles} PTO cycles
                </small>
              </span>
              <span className={p.battery < 50 ? "battery warning" : "battery"}>
                <BatteryFull />
                {p.battery}%
              </span>
              {p.pending > 0 && <span className="pending">{p.pending} pending</span>}
            </button>
          ))}
        </div>
        {!swapSent && (
          <button className="fleet-alert" onClick={() => setView({ kind: "alert" })}>
            <Gauge />
            <span>
              <strong>1 crew needs PTO / battery check</strong>
              <small>Adaeze N. (TRK-ALI-019) · 43% · 0 PTO cycles flagged</small>
            </span>
            <ChevronRight />
          </button>
        )}
      </>
    );
  }

  return (
    <div className="supervisor-screen">
      {body}
      {toast && (
        <div className="sup-toast">
          <Check /> {toast}
        </div>
      )}
    </div>
  );
}
