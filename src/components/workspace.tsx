"use client";
import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useDemo } from "./demo-provider";
import { Brand } from "./public-shell";
import { StatusBadge } from "./status-badge";
import {
  Sprout,
  LayoutDashboard,
  Network,
  Fingerprint,
  ChartNoAxesCombined,
  ArrowUpRight,
  FileCheck2,
  Search,
  Plus,
  LogOut,
} from "lucide-react";
import {
  type Batch,
  type Role,
  type Actor,
  type Action,
  roles,
  soilSafe,
  detectConflicts,
  createSchema,
} from "@/lib/domain";
import { applyAction } from "@/lib/workflow";
import { appendEvent, sha256, verifyChain } from "@/lib/proof";
type Plot = { id: string; display_name: string; approximate_region: string };
export function Workspace({
  initial,
  initialActor,
  demo,
  plots = [],
}: {
  initial: Batch[];
  initialActor: Actor;
  demo: boolean;
  plots?: Plot[];
}) {
  const path = usePathname(),
    base = demo ? "/demo" : "/dashboard";
  const shared = useDemo(),
    router = useRouter();
  const [localBatches, setLocalBatches] = useState(initial),
    [localActor, setLocalActor] = useState(initialActor);
  const batches = demo && shared ? shared.batches : localBatches,
    setBatches = demo && shared ? shared.setBatches : setLocalBatches,
    actor = demo && shared ? shared.actor : localActor,
    setActor = demo && shared ? shared.setActor : setLocalActor;
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState("ALL"),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [graphSelection, setGraphSelection] = useState(""),
    [labKg, setLabKg] = useState("601"),
    [labResult, setLabResult] = useState(""),
    [plotList, setPlotList] = useState(plots);
  const [newPlot, setNewPlot] = useState(false);
  const selected = batches.find((b) => path.endsWith("/" + b.id));
  const section = path.includes("/conflicts")
    ? "conflicts"
    : path.includes("/lab")
      ? "lab"
      : path.includes("/analytics")
        ? "analytics"
        : path.endsWith("/new")
          ? "new"
          : path.includes("/review")
            ? "review"
            : selected
              ? "detail"
              : "overview";
  const all = batches.map((b) => ({
    ...b,
    findings: detectConflicts(b, batches),
  }));
  const current = selected ? all.find((b) => b.id === selected.id) : undefined;
  const findings = all.flatMap((b) => b.findings);
  const visibleBatches = all.filter(
    (b) =>
      (section !== "review" ||
        ["UNDER_REVIEW", "RECEIVED", "DISPUTED"].includes(b.status)) &&
      (filter === "ALL" || b.status === filter) &&
      `${b.id} ${b.region}`.toLowerCase().includes(query.toLowerCase()),
  );
  const unresolved = findings.filter((f) => !f.resolution);
  async function request(url: string, body: unknown) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": crypto.randomUUID(),
      },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    return result;
  }
  async function act(b: Batch, action: Action) {
    setBusy(true);
    setMessage("");
    try {
      const result = demo
        ? await applyAction(b, actor, action, all)
        : await request("/api/batches/" + b.id, action);
      setBatches((prev) => prev.map((x) => (x.id === b.id ? result : x)));
      setMessage(
        demo
          ? "Recorded in this isolated demo session. Refresh resets the demo."
          : "Recorded with an append-only audit event.",
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }
  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    setBusy(true);
    try {
      const data = createSchema.parse({
        plotId: String(f.get("plotId")),
        region: String(f.get("region")),
        residue: String(f.get("residue")),
        declared: { kg: Number(f.get("kg")), basis: String(f.get("basis")) },
        ...(f.get("total") ? { totalResidue: Number(f.get("total")) } : {}),
      });
      let b: Batch;
      if (demo) {
        const id = "BP-" + crypto.randomUUID().slice(0, 8).toUpperCase();
        b = {
          ...data,
          declared: {
            kg: data.declared.kg,
            basis: data.declared.basis as "wet" | "dry" | "unknown",
          },
          id,
          farmerId: actor.id,
          status: "DRAFT",
          evidence: [],
          events: [],
          findings: [],
          anchor: { status: "NOT_REQUESTED" },
          synthetic: true,
        };
        b.events = await appendEvent([], {
          id: crypto.randomUUID(),
          batchId: id,
          type: "CREATE",
          actor,
          timestamp: new Date().toISOString(),
          evidenceIds: [],
          payload: data,
        });
      } else b = await request("/api/workspace", data);
      setBatches((p) => [b, ...p]);
      setMessage(`Created ${b.id}. Open All batches to declare it.`);
    } catch (e) {
      setMessage(String(e));
    } finally {
      setBusy(false);
    }
  }
  async function upload(b: Batch, file: File, type: string) {
    setBusy(true);
    try {
      if (
        file.size > 5242880 ||
        !["image/png", "image/jpeg", "application/pdf"].includes(file.type)
      )
        throw new Error("Use PNG, JPEG or PDF up to 5 MB.");
      if (demo) {
        const e = {
          id: crypto.randomUUID(),
          name: file.name,
          sha256: await sha256(new Uint8Array(await file.arrayBuffer())),
          type,
          uploadedBy: actor.id,
        };
        const next = { ...b, evidence: [...b.evidence, e] };
        next.events = await appendEvent(b.events, {
          id: crypto.randomUUID(),
          batchId: b.id,
          type: "EVIDENCE_ADDED",
          actor,
          timestamp: new Date().toISOString(),
          evidenceIds: [e.id],
          payload: { sha256: e.sha256, type },
        });
        setBatches((p) => p.map((x) => (x.id === b.id ? next : x)));
        setMessage(
          "Actual file bytes hashed in this demo. File is not persisted or uploaded.",
        );
      } else {
        const form = new FormData();
        form.set("file", file);
        form.set("type", type);
        const response = await fetch("/api/evidence/" + b.id, {
          method: "POST",
          body: form,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        setBatches((p) => p.map((x) => (x.id === b.id ? result : x)));
        setMessage("Private evidence uploaded and hashed.");
      }
    } catch (e) {
      setMessage(String(e));
    } finally {
      setBusy(false);
    }
  }
  const title = {
    overview:
      actor.role === "FARMER"
        ? "Your field evidence"
        : actor.role === "COLLECTOR"
          ? "Collection workspace"
          : actor.role === "PROCESSOR"
            ? "Facility intake"
            : "Evidence overview",
    conflicts: "Evidence conflict graph",
    lab: "Integrity Test Lab",
    analytics: "Recorded activity",
    new: "Declare a new possibility",
    review: "Independent review queue",
    detail: current?.id ?? "Batch",
  }[section];
  return (
    <div className="workspace">
      <aside aria-label="Workspace navigation">
        <Brand />
        <div className="eyebrow" style={{ padding: "30px 15px 12px" }}>
          Workspace
        </div>
        {[
          [LayoutDashboard, "All batches", base],
          [FileCheck2, "Review queue", base + "/review"],
          [Network, "Conflict graph", base + "/conflicts"],
          [Fingerprint, "Integrity lab", base + "/lab"],
          [ChartNoAxesCombined, "Activity", base + "/analytics"],
        ].map(([Icon, label, href]) => {
          const I = Icon as typeof Sprout;
          return (
            <Link
              key={label as string}
              className={path === href ? "active" : ""}
              aria-current={path === href ? "page" : undefined}
              href={href as string}
            >
              <I size={18} />
              {label as string}
            </Link>
          );
        })}
        <div className="aside-bottom">
          <span className="badge">
            {demo ? "SYNTHETIC DATA" : "PRIVATE WORKSPACE"}
          </span>
          <p>
            {demo
              ? "An isolated, interactive demonstration. Changes reset on refresh."
              : "Independent records. Accountable decisions."}
          </p>
          <Link href="/methodology">Verification boundaries ↗</Link>
        </div>
      </aside>
      <div className="workspace-body">
        <header className="row space">
          <span className="muted">
            Workspace / {section === "detail" ? "Batch dossier" : title}
          </span>
          <div className="row">
            {demo ? (
              <>
                <label htmlFor="role" style={{ margin: 0 }}>
                  Demo role
                </label>
                <select
                  id="role"
                  value={actor.role}
                  style={{ width: 150 }}
                  onChange={(e) =>
                    setActor({
                      id: "demo-" + e.target.value.toLowerCase(),
                      role: e.target.value as Role,
                    })
                  }
                >
                  {roles
                    .filter((r) => r !== "ADMIN")
                    .map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                </select>
              </>
            ) : (
              <>
                <span className="badge">{actor.role}</span>
                <button
                  className="button secondary"
                  onClick={async () => {
                    await fetch("/api/auth", { method: "DELETE" });
                    router.push("/login");
                  }}
                >
                  <LogOut size={16} /> Sign out
                </button>
              </>
            )}
          </div>
        </header>
        <main
          id="workspace-content"
          className={`workspace-main section-${section}`}
        >
          <div className="row space page-heading">
            <div>
              <span className="eyebrow">
                {demo ? "Demonstration · October 2026" : "Evidence operations"}
              </span>
              <h1>{title}</h1>
              <p style={{ marginTop: 0 }}>
                Evidence first. Every handoff accounted for.
              </p>
            </div>
            {actor.role === "FARMER" && (
              <Link className="button" href={base + "/batches/new"}>
                <Plus size={17} /> New batch
              </Link>
            )}
          </div>
          {message && (
            <div role="status" className="warning" style={{ marginBottom: 20 }}>
              {message}
            </div>
          )}
          {section === "overview" || section === "review" ? (
            <>
              <div className="grid metrics">
                {[
                  [all.length, "Recorded batches"],
                  [
                    all
                      .filter((b) => b.intake)
                      .reduce((n, b) => n + b.intake!.kg, 0)
                      .toLocaleString() + " kg",
                    "Processor-confirmed mass",
                  ],
                  [unresolved.length, "Open investigation signals"],
                  [
                    all.filter((b) => b.status === "APPROVED").length,
                    "Approved evidence records",
                  ],
                ].map(([v, l]) => (
                  <div className="card" key={l}>
                    <div className="eyebrow">{l}</div>
                    <strong>{v}</strong>
                  </div>
                ))}
              </div>
              <div className="card" style={{ marginTop: 26 }}>
                <div className="row space">
                  <div>
                    <h2 style={{ margin: 0 }}>
                      {section === "review"
                        ? "Claims awaiting a decision"
                        : "Residue evidence register"}
                    </h2>
                    <p>
                      Recorded activity ·{" "}
                      {demo
                        ? "synthetic demonstration"
                        : "authenticated submissions"}
                    </p>
                  </div>
                  <div className="row">
                    <Search size={17} />
                    <input
                      aria-label="Search batches"
                      placeholder="Search reference or region"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      style={{ width: 220 }}
                    />
                    <select
                      aria-label="Filter status"
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                      style={{ width: 170 }}
                    >
                      {[
                        "ALL",
                        "DRAFT",
                        "DECLARED",
                        "PICKED_UP",
                        "RECEIVED",
                        "UNDER_REVIEW",
                        "APPROVED",
                        "DISPUTED",
                        "REJECTED",
                      ].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div
                  className="table-scroll"
                  tabIndex={0}
                  role="region"
                  aria-label="Batch records"
                >
                  <table>
                    <thead>
                      <tr>
                        <th>Batch / origin</th>
                        <th>Residue</th>
                        <th>Recorded mass</th>
                        <th>Review status</th>
                        <th>Signals</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {visibleBatches.map((b) => (
                        <tr key={b.id}>
                          <td>
                            <Link href={base + "/batches/" + b.id}>
                              <strong>{b.id}</strong>
                            </Link>
                            <div
                              className="muted"
                              style={{ fontSize: 12, marginTop: 5 }}
                            >
                              {b.region}
                            </div>
                          </td>
                          <td>{b.residue}</td>
                          <td>
                            {b.intake?.kg ?? b.declared.kg} kg{" "}
                            <small>{b.declared.basis}</small>
                          </td>
                          <td>
                            <StatusBadge status={b.status} />
                          </td>
                          <td>
                            {b.findings.filter((f) => !f.resolution).length ||
                              "—"}
                          </td>
                          <td>
                            <Link
                              aria-label={"Open " + b.id}
                              href={base + "/batches/" + b.id}
                            >
                              <ArrowUpRight size={18} />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!all.length && (
                    <p>No records yet. Create a plot and your first batch.</p>
                  )}
                  {!!all.length && !visibleBatches.length && (
                    <p className="empty-state">
                      No batches match this view. Try another search or status
                      filter.
                    </p>
                  )}
                </div>
              </div>
              <div className="grid" style={{ marginTop: 24 }}>
                <Link className="card feature-link" href={base + "/conflicts"}>
                  <Network />
                  <h3>Two claims. One receipt.</h3>
                  <p>
                    Follow the evidence relationships behind an investigation.
                  </p>
                  <span>Open conflict graph →</span>
                </Link>
                <Link className="card feature-link" href={base + "/lab"}>
                  <Fingerprint />
                  <h3>Put the proof to the test.</h3>
                  <p>
                    Change a copied measurement and see exactly where
                    verification fails.
                  </p>
                  <span>Enter the integrity lab →</span>
                </Link>
              </div>
            </>
          ) : null}
          {section === "conflicts" && (
            <>
              <div className="warning">
                A relationship is a reason to investigate, not proof of
                wrongdoing. Receipt matching is scoped to the recorded facility.
              </div>
              <div className="card" style={{ marginTop: 20 }}>
                <svg
                  viewBox="0 0 800 260"
                  role="img"
                  aria-label="Interactive evidence relationship graph"
                  style={{ width: "100%", maxHeight: 350 }}
                >
                  {all.map((b, i) => {
                    const x = 100 + i * 190;
                    return (
                      <g key={b.id}>
                        {b.findings
                          .filter(
                            (f) => f.relatedBatchId && b.id < f.relatedBatchId,
                          )
                          .map((f) => {
                            const j = all.findIndex(
                              (o) => o.id === f.relatedBatchId,
                            );
                            return (
                              <g
                                key={f.id}
                                tabIndex={0}
                                role="button"
                                aria-label={f.code}
                                onClick={() => setGraphSelection(f.explanation)}
                                onKeyDown={(e) =>
                                  e.key === "Enter" &&
                                  setGraphSelection(f.explanation)
                                }
                              >
                                <line
                                  x1={x}
                                  y1={110}
                                  x2={100 + j * 190}
                                  y2={110}
                                  stroke="#b88039"
                                  strokeWidth="5"
                                />
                                <text
                                  x={(x + 100 + j * 190) / 2}
                                  y={75}
                                  textAnchor="middle"
                                  fontSize="11"
                                >
                                  {f.code === "SAME_RECEIPT_NUMBER"
                                    ? "Shared receipt"
                                    : "Shared evidence"}
                                </text>
                              </g>
                            );
                          })}
                        <g
                          tabIndex={0}
                          role="button"
                          aria-label={b.id}
                          onClick={() =>
                            setGraphSelection(
                              `${b.id}: ${b.residue}, ${b.declared.kg} kg, ${b.status}`,
                            )
                          }
                          onKeyDown={(e) =>
                            e.key === "Enter" && setGraphSelection(b.id)
                          }
                        >
                          <circle
                            cx={x}
                            cy={110}
                            r={36}
                            fill={
                              b.status === "APPROVED" ? "#234e3e" : "#eed6a7"
                            }
                          />
                          <text
                            x={x}
                            y={115}
                            textAnchor="middle"
                            fill={b.status === "APPROVED" ? "white" : "#3e382b"}
                            fontSize="12"
                          >
                            {b.id}
                          </text>
                          <text x={x} y={175} textAnchor="middle" fontSize="11">
                            {b.region}
                          </text>
                        </g>
                      </g>
                    );
                  })}
                </svg>
                <p aria-live="polite">
                  {graphSelection ||
                    "Select a batch node or a connection to inspect it."}
                </p>
              </div>
              <h2>Investigation records</h2>
              <div className="stack">
                {findings
                  .filter(
                    (f) => !f.relatedBatchId || f.batchId < f.relatedBatchId,
                  )
                  .map((f) => (
                    <div className="card" key={f.id}>
                      <span className="badge">
                        {f.code.replaceAll("_", " ")}
                      </span>
                      <p>{f.explanation}</p>
                      <div className="row">
                        <Link href={base + "/batches/" + f.batchId}>
                          {f.batchId} ↗
                        </Link>
                        {f.relatedBatchId && (
                          <Link href={base + "/batches/" + f.relatedBatchId}>
                            {f.relatedBatchId} ↗
                          </Link>
                        )}
                        <span className="muted">
                          {f.resolution
                            ? "Resolution documented"
                            : "Human review required"}
                        </span>
                      </div>
                      <p className="mono">Sources: {f.sources.join(", ")}</p>
                    </div>
                  ))}
              </div>
            </>
          )}
          {section === "detail" && current && (
            <>
              <div className="row" style={{ marginBottom: 24 }}>
                <StatusBadge status={current.status} />
                <span>
                  {current.region} · {current.residue}
                </span>
                <Link
                  style={{ marginLeft: "auto" }}
                  href={"/verify/" + current.id}
                >
                  Public verification ↗
                </Link>
              </div>
              <div className="detail-grid">
                <div className="stack">
                  <div className="card custody-card">
                    <h2>Chain of custody</h2>
                    <div className="grid metrics">
                      {[
                        [current.declared, "Farmer declaration"],
                        [current.pickup, "Collector pickup"],
                        [current.intake, "Processor intake"],
                      ].map(([measurement, label]) => {
                        const m = measurement as Batch["declared"] | undefined;
                        const l = label as string;
                        return (
                          <div key={l}>
                            <span className="eyebrow">{l}</span>
                            <strong>
                              {m?.kg ?? "—"} <small>kg</small>
                            </strong>
                            <span className="measurement-note">
                              {m
                                ? `${m.basis} basis${m.moisture !== undefined ? ` · ${m.moisture}% moisture` : ""}`
                                : "Not recorded"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <p>
                      Mass basis: {current.declared.basis}. Processing pathway:{" "}
                      {current.intake?.process ?? "Not recorded"}. A selected
                      pathway is not proof the process occurred.
                    </p>
                  </div>
                  <div className="card source-card">
                    <h2>Evidence & original records</h2>
                    <p>
                      AI extraction{" "}
                      {demo
                        ? "unavailable in demo; manual recording remains available"
                        : "is optional; open an uploaded record to request it"}
                      .
                    </p>
                    {!current.evidence.length && (
                      <div className="empty-state">
                        <FileCheck2 size={24} />
                        <p>
                          No source files attached yet. Supporting documents
                          remain separate from the recorded measurements.
                        </p>
                      </div>
                    )}
                    {current.evidence.map((e) => (
                      <div className="evidence-row" key={e.id}>
                        <div>
                          <strong>{e.name}</strong>
                          <div className="mono">SHA-256 {e.sha256}</div>
                        </div>
                        {!demo && (
                          <Link href={"/dashboard/evidence/" + e.id}>
                            Inspect ↗
                          </Link>
                        )}
                        {demo && /^BP-00[1-3]-(pickup|intake)$/.test(e.id) && (
                          <a
                            href={"/api/demo-evidence/" + e.id}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Inspect synthetic source document ↗
                          </a>
                        )}
                      </div>
                    ))}
                    {["FARMER", "COLLECTOR", "PROCESSOR"].includes(
                      actor.role,
                    ) &&
                      !["APPROVED", "REJECTED"].includes(current.status) && (
                        <label>
                          Attach{" "}
                          {actor.role === "COLLECTOR"
                            ? "pickup"
                            : actor.role === "PROCESSOR"
                              ? "intake"
                              : "supporting"}{" "}
                          evidence (PNG, JPEG, PDF · max 5 MB)
                          <input
                            disabled={busy}
                            type="file"
                            accept="image/png,image/jpeg,application/pdf"
                            onChange={(e) =>
                              e.target.files?.[0] &&
                              upload(
                                current,
                                e.target.files[0],
                                actor.role === "COLLECTOR"
                                  ? "pickup"
                                  : actor.role === "PROCESSOR"
                                    ? "intake"
                                    : "supporting",
                              )
                            }
                          />
                        </label>
                      )}
                  </div>
                  <div className="card proof-card">
                    <h2>Proof replay</h2>
                    <p>
                      Append-only event history. Local integrity and blockchain
                      confirmation are separate checks.
                    </p>
                    {current.events.map((e, i) => (
                      <div key={e.id} className="timeline-event">
                        <span className="timeline-number">{i + 1}</span>
                        <div>
                          <strong>{e.type.replaceAll("_", " ")}</strong>
                          <p style={{ margin: "5px 0" }}>
                            {e.actor.role} ·{" "}
                            {new Date(e.timestamp).toLocaleString("en-IN", {
                              timeZone: "Asia/Kolkata",
                            })}{" "}
                            IST
                          </p>
                          <details>
                            <summary>Source payload & hash</summary>
                            <pre className="mono">
                              {JSON.stringify(e.payload, null, 2)}
                            </pre>
                            <div className="mono">{e.hash}</div>
                          </details>
                        </div>
                      </div>
                    ))}
                    <button
                      className="button secondary"
                      onClick={async () => {
                        const r = await verifyChain(current.events);
                        setMessage(
                          r.valid
                            ? "Local hash chain verified. No confirmed blockchain anchor is implied."
                            : r.reason,
                        );
                      }}
                    >
                      Verify event chain
                    </button>
                  </div>
                </div>
                <div className="stack">
                  <div className="card soil-card">
                    <h3>SoilSafe residue guard</h3>
                    <span className="badge">
                      {soilSafe(current).state.replaceAll("_", " ")}
                    </span>
                    <p>{soilSafe(current).explanation}</p>
                    <Link href="/methodology">Understand the advisory ↗</Link>
                  </div>
                  <div className="card">
                    <h3>Investigation signals</h3>
                    {current.findings.length ? (
                      current.findings.map((f) => (
                        <div
                          key={f.id}
                          style={{
                            padding: "15px 0",
                            borderTop: "1px solid #e5e9df",
                          }}
                        >
                          <span className={`badge severity-${f.severity}`}>
                            {f.severity}
                          </span>
                          <strong className="finding-title">
                            {f.code.replaceAll("_", " ")}
                          </strong>
                          <p>{f.explanation}</p>
                          {f.resolution ? (
                            <p className="warning">
                              Resolution: {f.resolution}
                            </p>
                          ) : (
                            actor.role === "AUDITOR" && (
                              <ReasonForm
                                label="Document resolution"
                                busy={busy}
                                onSubmit={(reason) =>
                                  act(current, {
                                    type: "RESOLVE",
                                    findingId: f.id,
                                    reason,
                                  })
                                }
                              />
                            )
                          )}
                        </div>
                      ))
                    ) : (
                      <p>
                        No rule findings for the available records. This is not
                        a certification.
                      </p>
                    )}
                  </div>
                  <div className="card action-card">
                    <h3>Next action · {actor.role.toLowerCase()}</h3>
                    <ActionPanel
                      b={current}
                      actor={actor}
                      busy={busy}
                      act={(action) => act(current, action)}
                    />
                    {current.decision && (
                      <p className="warning">{current.decision.reason}</p>
                    )}
                  </div>
                  <div className="card anchor-card">
                    <h3>Blockchain anchor</h3>
                    <span className="badge">
                      {current.anchor.status.replaceAll("_", " ")}
                    </span>
                    <p>
                      Sepolia testnet. A calculated hash is not a confirmed
                      transaction.
                    </p>
                    {!demo &&
                      actor.role === "AUDITOR" &&
                      current.status === "APPROVED" && (
                        <button
                          disabled={busy}
                          className="button"
                          onClick={async () => {
                            try {
                              const r = await request(
                                "/api/anchor/" + current.id,
                                {},
                              );
                              setMessage(r.message);
                            } catch (e) {
                              setMessage(String(e));
                            }
                          }}
                        >
                          Request / check anchor
                        </button>
                      )}
                    <button
                      className="button secondary"
                      onClick={() => {
                        const a = document.createElement("a");
                        a.href = URL.createObjectURL(
                          new Blob([JSON.stringify(current, null, 2)], {
                            type: "application/json",
                          }),
                        );
                        a.download = current.id + "-private-dossier.json";
                        a.click();
                        URL.revokeObjectURL(a.href);
                      }}
                    >
                      Export private dossier
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
          {section === "lab" && (
            <div className="detail-grid">
              <div className="card">
                <span className="badge">
                  COPY ONLY · NO RECORDS ARE MODIFIED
                </span>
                <h2>
                  One altered number.
                  <br />
                  Broken proof.
                </h2>
                <p>
                  Take the first event from {batches[0]?.id ?? "a batch"}.
                  Change its copied quantity, then verify against the original
                  hash chain.
                </p>
                <label htmlFor="lab-kg">Replacement quantity (kg)</label>
                <input
                  id="lab-kg"
                  type="number"
                  value={labKg}
                  onChange={(e) => setLabKg(e.target.value)}
                />
                <button
                  className="button"
                  style={{ marginTop: 20 }}
                  disabled={!batches.length}
                  onClick={async () => {
                    const b = batches[0],
                      copy = structuredClone(b.events);
                    copy[0].payload.kg = Number(labKg);
                    const r = await verifyChain(copy, b.events.at(-1)?.hash);
                    setLabResult(
                      r.valid
                        ? "Integrity valid: the copied record matches."
                        : `Integrity mismatch at event ${r.index + 1}: ${r.reason}. The original record is unchanged.`,
                    );
                  }}
                >
                  Run integrity test
                </button>
                <div
                  role="status"
                  style={{ marginTop: 20 }}
                  className={labResult ? "warning" : ""}
                >
                  {labResult}
                </div>
              </div>
              <div className="card">
                <Fingerprint size={40} />
                <h3>What this demonstrates</h3>
                <p>
                  Each event commits to its own content and the previous event
                  hash. A changed measurement breaks this relationship.
                </p>
                <p>
                  A privileged attacker could recalculate an unanchored history.
                  An independent, confirmed blockchain root provides an external
                  reference against that attack.
                </p>
                <p>No testnet anchor is fabricated for this lab.</p>
              </div>
            </div>
          )}
          {section === "new" && (
            <div className="card create-card" style={{ maxWidth: 800 }}>
              <span className="eyebrow">
                1. Plot & source · 2. Quantity · 3. Declare from dossier
              </span>
              <h2>Create a residue record</h2>
              {actor.role !== "FARMER" ? (
                <p>Select the Farmer demo role to create a batch.</p>
              ) : (
                <>
                  <form onSubmit={create}>
                    <div className="form-section-heading">
                      <span>01</span>
                      <h3>Plot & source</h3>
                    </div>
                    <label htmlFor="batch-plot">Registered plot</label>
                    <select id="batch-plot" name="plotId" required>
                      {demo ? (
                        <option value="demo-plot-new">
                          Demonstration plot
                        </option>
                      ) : (
                        plotList.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.display_name}
                          </option>
                        ))
                      )}
                    </select>
                    {!demo && (
                      <button
                        type="button"
                        className="button secondary"
                        onClick={() => setNewPlot(!newPlot)}
                      >
                        Register a plot
                      </button>
                    )}
                    <label htmlFor="batch-region">General origin region</label>
                    <input
                      id="batch-region"
                      required
                      name="region"
                      defaultValue="Punjab, India"
                    />
                    <label htmlFor="batch-residue">Crop residue</label>
                    <select id="batch-residue" name="residue">
                      {[
                        "Rice straw",
                        "Wheat straw",
                        "Sugarcane residue",
                        "Other residue",
                      ].map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                    <div className="form-section-heading">
                      <span>02</span>
                      <h3>Quantity & measurement</h3>
                    </div>
                    <div className="grid">
                      <div>
                        <label htmlFor="batch-kg">
                          Estimated available quantity (kg)
                        </label>
                        <input
                          id="batch-kg"
                          required
                          type="number"
                          name="kg"
                          min="0.01"
                          step="0.01"
                        />
                      </div>
                      <div>
                        <label htmlFor="batch-basis">Mass basis</label>
                        <select id="batch-basis" name="basis">
                          <option value="wet">Wet mass</option>
                          <option value="dry">Dry mass</option>
                          <option value="unknown">Unknown</option>
                        </select>
                      </div>
                    </div>
                    <label htmlFor="batch-total">
                      Total generated residue, same basis (kg, optional)
                    </label>
                    <input
                      id="batch-total"
                      type="number"
                      name="total"
                      min="0.01"
                      step="0.01"
                    />
                    <p>
                      These are farmer estimates. SoilSafe requests a
                      site-specific review; this form does not certify
                      sustainable removal.
                    </p>
                    <button className="button" disabled={busy}>
                      Create draft record
                    </button>
                  </form>
                  {newPlot && (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const f = new FormData(e.currentTarget);
                        try {
                          const p = await request("/api/workspace", {
                            kind: "plot",
                            ...Object.fromEntries(f),
                          });
                          setPlotList((x) => [...x, p]);
                          setNewPlot(false);
                          setMessage("Plot registered.");
                        } catch (e) {
                          setMessage(String(e));
                        }
                      }}
                    >
                      <h3>Register plot</h3>
                      {[
                        "display_name",
                        "crop_type",
                        "area_hectares",
                        "approximate_region",
                      ].map((n) => (
                        <label key={n}>
                          {
                            {
                              display_name: "Plot name",
                              crop_type: "Crop type",
                              area_hectares: "Area (hectares)",
                              approximate_region: "Approximate region",
                            }[n]
                          }
                          <input
                            name={n}
                            required
                            type={n === "area_hectares" ? "number" : "text"}
                            step="0.01"
                            min="0.01"
                          />
                        </label>
                      ))}
                      <button className="button">Save plot</button>
                    </form>
                  )}
                </>
              )}
            </div>
          )}
          {section === "analytics" && (
            <>
              <div className="grid metrics">
                {[
                  ["Declared", all.reduce((n, b) => n + b.declared.kg, 0)],
                  [
                    "Received",
                    all.reduce((n, b) => n + (b.intake?.kg ?? 0), 0),
                  ],
                  [
                    "Approved evidence",
                    all
                      .filter((b) => b.status === "APPROVED")
                      .reduce((n, b) => n + (b.intake?.kg ?? 0), 0),
                  ],
                ].map(([l, v]) => (
                  <div className="card" key={l}>
                    <span className="eyebrow">{l}</span>
                    <strong>{Number(v).toLocaleString()} kg</strong>
                  </div>
                ))}
              </div>
              <div className="card" style={{ marginTop: 25 }}>
                <h2>Recorded mass by batch</h2>
                {all.map((b) => (
                  <div key={b.id} style={{ margin: "20px 0" }}>
                    <div className="row space">
                      <Link href={base + "/batches/" + b.id}>{b.id}</Link>
                      <span>{b.declared.kg} kg declared</span>
                    </div>
                    <div
                      style={{
                        height: 16,
                        background: "#edf0e8",
                        marginTop: 9,
                        borderRadius: 4,
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          background: "#73935c",
                          width:
                            Math.min(
                              100,
                              (b.declared.kg /
                                Math.max(...all.map((x) => x.declared.kg))) *
                                100,
                            ) + "%",
                          borderRadius: 4,
                        }}
                      />
                    </div>
                  </div>
                ))}
                <p>
                  These totals describe submitted mass and may include competing
                  claims. They are not net unique biomass, avoided emissions, or
                  certified carbon credits.
                </p>
              </div>
            </>
          )}
        </main>
        <footer>
          {demo
            ? "SYNTHETIC DATA · Session-only demonstration"
            : "Private operational records"}{" "}
          · AI assists. Humans decide.{" "}
          <Link href="/methodology">Methodology ↗</Link>
        </footer>
      </div>
    </div>
  );
}
function ReasonForm({
  label,
  busy,
  onSubmit,
}: {
  label: string;
  busy: boolean;
  onSubmit: (reason: string) => void;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        onSubmit(String(f.get("reason")));
      }}
    >
      <label>
        {label}
        <textarea
          name="reason"
          required
          minLength={12}
          maxLength={2000}
          placeholder="Document evidence and reasoning (at least 12 characters)"
        />
      </label>
      <button disabled={busy} className="button secondary">
        {label}
      </button>
    </form>
  );
}
function ActionPanel({
  b,
  actor,
  busy,
  act,
}: {
  b: Batch;
  actor: Actor;
  busy: boolean;
  act: (action: Action) => void;
}) {
  return (
    <div className="stack">
      {actor.role === "FARMER" && b.status === "DRAFT" && (
        <button
          className="button"
          disabled={busy}
          onClick={() => act({ type: "DECLARE" })}
        >
          Submit declaration
        </button>
      )}
      {((actor.role === "COLLECTOR" && b.status === "DECLARED") ||
        (actor.role === "PROCESSOR" && b.status === "PICKED_UP")) && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget),
              measurement = {
                kg: Number(f.get("kg")),
                basis: String(f.get("basis")) as "wet" | "dry" | "unknown",
                ...(f.get("moisture")
                  ? { moisture: Number(f.get("moisture")) }
                  : {}),
              },
              timestamp = new Date(String(f.get("time"))).toISOString(),
              notes = String(f.get("notes"));
            act(
              actor.role === "COLLECTOR"
                ? { type: "PICKUP", measurement, timestamp, notes }
                : {
                    type: "INTAKE",
                    measurement,
                    timestamp,
                    notes,
                    receipt: String(f.get("receipt")),
                    facility: String(f.get("facility")),
                    process: String(f.get("process")),
                  },
            );
          }}
        >
          <label>
            Measured quantity (kg)
            <input name="kg" required type="number" min="0.01" step="0.01" />
          </label>
          <label>
            Measurement basis
            <select name="basis">
              <option value="wet">Wet</option>
              <option value="dry">Dry</option>
              <option value="unknown">Unknown</option>
            </select>
          </label>
          <label>
            Moisture % (optional)
            <input
              name="moisture"
              type="number"
              min="0"
              max="99.9"
              step="0.1"
            />
          </label>
          <label>
            Actual event time (local)
            <input name="time" type="datetime-local" required />
          </label>
          {actor.role === "PROCESSOR" && (
            <>
              {["receipt", "facility"].map((n) => (
                <label key={n}>
                  {n}
                  <input required name={n} />
                </label>
              ))}
              <label>
                Documented pathway
                <select name="process">
                  <option>Composting</option>
                  <option>Biochar production</option>
                  <option>Biomass fuel</option>
                  <option>Other documented pathway</option>
                </select>
              </label>
            </>
          )}
          <label>
            Measurement source / discrepancy explanation
            <textarea required minLength={3} name="notes" />
          </label>
          <button disabled={busy} className="button">
            Confirm {actor.role === "COLLECTOR" ? "pickup" : "intake"}
          </button>
        </form>
      )}
      {["RECEIVED", "DISPUTED"].includes(b.status) && (
        <button
          className="button"
          disabled={busy}
          onClick={() => act({ type: "REQUEST_REVIEW" })}
        >
          Request audit review
        </button>
      )}
      {actor.role === "AUDITOR" && (
        <>
          <ReasonForm
            label="Request clarification"
            busy={busy}
            onSubmit={(reason) => act({ type: "CLARIFY", reason })}
          />
          <ReasonForm
            label="Document agronomic review"
            busy={busy}
            onSubmit={(reason) => act({ type: "SOIL_REVIEW", reason })}
          />
          {b.status === "UNDER_REVIEW" && (
            <>
              <ReasonForm
                label="Approve evidence"
                busy={busy}
                onSubmit={(reason) => {
                  if (
                    confirm(
                      "Record this approval and its reasoning in the permanent audit history?",
                    )
                  )
                    act({ type: "APPROVE", reason });
                }}
              />
              <ReasonForm
                label="Reject evidence"
                busy={busy}
                onSubmit={(reason) => act({ type: "REJECT", reason })}
              />
            </>
          )}
        </>
      )}
      {["APPROVED", "REJECTED"].includes(b.status) && (
        <ReasonForm
          label="Open dispute"
          busy={busy}
          onSubmit={(reason) => act({ type: "DISPUTE", reason })}
        />
      )}
      {actor.role !== "AUDITOR" && (
        <ReasonForm
          label="Append correction request"
          busy={busy}
          onSubmit={(reason) => act({ type: "CORRECTION", reason })}
        />
      )}
    </div>
  );
}
