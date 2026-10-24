"use client";
import { useState } from "react";
export function EvidenceViewer({ id }: { id: string }) {
  const [url, setUrl] = useState(""),
    [value, setValue] = useState(
      JSON.stringify(
        {
          documentType: "Receipt",
          receiptNumber: null,
          documentDate: null,
          weight: null,
          unit: "unknown",
          vehicleIdentifier: null,
          facilityName: null,
          relevantText: "",
          uncertainties: [],
        },
        null,
        2,
      ),
    ),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function run(kind: string) {
    setBusy(true);
    try {
      const response = await fetch(
        `/api/${kind === "view" ? "evidence" : "ai"}/${id}`,
        {
          method:
            kind === "view" ? "GET" : kind === "confirm" ? "PATCH" : "POST",
          ...(kind === "confirm"
            ? { headers: { "content-type": "application/json" }, body: value }
            : {}),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (kind === "view") setUrl(data.url);
      else if (kind === "confirm")
        setMessage(
          "Confirmed fields appended to audit history. Custody measurements still require an explicit actor submission.",
        );
      else {
        setValue(JSON.stringify(data.extracted_fields_json, null, 2));
        setMessage(
          "AI suggestion — requires confirmation. Inspect each field against the original.",
        );
      }
    } catch (e) {
      setMessage(String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="detail-grid evidence-viewer">
      <div className="card">
        <span className="eyebrow">01 / ORIGINAL SOURCE</span>
        <h2>Inspect the document</h2>
        <p>
          Request a private link to view the original. If it expires, request a
          new link.
        </p>
        <button
          className="button secondary"
          disabled={busy}
          onClick={() => run("view")}
        >
          Open original (60-second private link)
        </button>
        {url && (
          <>
            <p>
              <a href={url} target="_blank" rel="noreferrer">
                Open / zoom original ↗
              </a>
            </p>
            <iframe
              title="Private source document"
              src={url}
              sandbox=""
              style={{ width: "100%", height: 550, border: 0 }}
            />
          </>
        )}
      </div>
      <div className="card">
        <span className="eyebrow">02 / REVIEW & CONFIRM</span>
        <h2>AI suggestion — requires confirmation</h2>
        <p>
          Manual entry works without an AI key. Extracted data never approves a
          claim or changes a measured quantity automatically.
        </p>
        <button
          disabled={busy}
          className="button secondary"
          onClick={() => run("extract")}
        >
          Request AI extraction
        </button>
        <label>
          Editable extracted fields (JSON)
          <textarea
            rows={20}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </label>
        <button
          disabled={busy}
          className="button"
          onClick={() => run("confirm")}
        >
          Confirm reviewed fields
        </button>
        <p role="status">{message}</p>
      </div>
    </div>
  );
}
