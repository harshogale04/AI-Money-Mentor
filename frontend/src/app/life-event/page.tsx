"use client";
import { useState } from "react";
import { TrendingUp } from "lucide-react";
import { lifeEventApi } from "@/lib/api";

const USER_ID = "demo-user";

const EVENTS = [
  { value: "bonus", label: "💰 Got a Bonus", desc: "Deploy it optimally" },
  { value: "inheritance", label: "🏠 Received Inheritance", desc: "Wealth structuring advice" },
  { value: "marriage", label: "💍 Getting Married", desc: "Joint finance planning" },
  { value: "new_baby", label: "👶 New Baby", desc: "Child financial planning" },
  { value: "job_change", label: "💼 Changed Jobs", desc: "PF, salary hike deployment" },
  { value: "property_purchase", label: "🏡 Buying Property", desc: "Loan vs rent analysis" },
];

function parseAdvice(raw: any) {
  try {
    const text = typeof raw === "string" ? raw : JSON.stringify(raw);
    const jsonMatch = text.match(/```json\n?([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
    if (jsonMatch) return JSON.parse(jsonMatch[1]);
  } catch {}
  return null;
}

function MarkdownText({ text }: { text: string }) {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i} style={{ color: "var(--text-primary)", fontWeight: 600 }}>{part.slice(2, -2)}</strong>;
        }
        return (
          <span key={i}>
            {part.split(" • ").map((chunk, j) => (
              <span key={j}>
                {j > 0 && <><br /><span style={{ color: "var(--accent-green)", marginRight: 6 }}>•</span></>}
                {chunk}
              </span>
            ))}
          </span>
        );
      })}
    </span>
  );
}

// ─── Rendering helpers ────────────────────────────────────────────────

/** Render ANY value safely as React — never dumps raw objects */
function SafeValue({ val, depth = 0 }: { val: any; depth?: number }) {
  if (val === null || val === undefined) return null;
  if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") {
    return <MarkdownText text={String(val)} />;
  }
  if (Array.isArray(val)) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {val.map((item, i) => <SafeValue key={i} val={item} depth={depth + 1} />)}
      </div>
    );
  }
  if (typeof val === "object") {
    // Known shape: { title/name/heading, description/details/body/summary/text/content }
    const titleKey = ["title", "name", "heading", "area", "category", "risk", "regime"].find(k => val[k] && typeof val[k] === "string");
    const bodyKey = ["description", "details", "body", "summary", "text", "content", "mitigation", "implications"].find(k => val[k]);
    const itemsKey = ["items", "actions", "implications", "steps"].find(k => Array.isArray(val[k]));

    const title = titleKey ? val[titleKey] : null;
    const body = bodyKey ? val[bodyKey] : null;
    const items = itemsKey ? val[itemsKey] : null;

    // Remaining keys after extracting known ones
    const usedKeys = new Set([titleKey, bodyKey, itemsKey, "duration"].filter(Boolean));
    const extraEntries = Object.entries(val).filter(([k]) => !usedKeys.has(k));

    return (
      <div style={{
        padding: depth > 0 ? "10px 14px" : 0,
        background: depth > 0 ? "var(--bg-hover)" : "transparent",
        borderRadius: depth > 0 ? 8 : 0,
        borderLeft: depth > 0 && title ? "3px solid var(--accent-blue)" : "none",
      }}>
        {title && (
          <div style={{ fontSize: 13, fontWeight: 700, color: depth === 0 ? "var(--text-primary)" : "var(--accent-blue)", marginBottom: 6 }}>
            {title}
          </div>
        )}
        {body && (
          <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>
            {Array.isArray(body)
              ? <SafeValue val={body} depth={depth + 1} />
              : <MarkdownText text={typeof body === "string" ? body : JSON.stringify(body)} />
            }
          </div>
        )}
        {items && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: body ? 8 : 0 }}>
            {items.map((item: any, i: number) => (
              <SafeValue key={i} val={item} depth={depth + 1} />
            ))}
          </div>
        )}
        {/* Fallback: render remaining unknown keys */}
        {!body && !items && extraEntries.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {extraEntries.map(([k, v]) => (
              <div key={k}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "capitalize", marginRight: 6 }}>
                  {k.replace(/_/g, " ")}:
                </span>
                <SafeValue val={v} depth={depth + 1} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
  return null;
}

/** Normalize anything to an array for list rendering */
function toList(val: any): any[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === "object") return Object.entries(val).map(([k, v]) => ({ _key: k, ...(typeof v === "object" && v !== null ? v as object : { description: v }) }));
  return [val];
}

export default function LifeEventPage() {
  const [selectedEvent, setSelectedEvent] = useState("");
  const [amount, setAmount] = useState("");
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!selectedEvent) return;
    setLoading(true); setError("");
    try {
      const res = await lifeEventApi.advise({
        user_id: USER_ID,
        event_type: selectedEvent,
        event_amount: amount ? +amount : undefined,
        additional_context: context || undefined,
      });
      setResult(res.data);
    } catch (e: any) { setError(e.response?.data?.detail || "Error"); }
    finally { setLoading(false); }
  };

  const parsed = result ? parseAdvice(result.advice) : null;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <TrendingUp size={28} color="var(--accent-green)" /> Life Event Advisor
        </h1>
        <p className="page-subtitle">Big financial moment? Get personalised advice tailored to your tax bracket, portfolio, and goals.</p>
      </div>

      {!result ? (
        <div style={{ maxWidth: 600 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
            {EVENTS.map(({ value, label, desc }) => (
              <div key={value} onClick={() => setSelectedEvent(value)}
                className="card card-sm"
                style={{
                  cursor: "pointer", transition: "all 0.15s",
                  borderColor: selectedEvent === value ? "var(--accent-green)" : "var(--border)",
                  background: selectedEvent === value ? "var(--accent-green-dim)" : "var(--bg-card)",
                }}>
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{desc}</div>
              </div>
            ))}
          </div>

          {selectedEvent && (
            <div className="card">
              <div className="form-group">
                <label className="label">Amount involved (optional)</label>
                <input className="input" type="number" placeholder="₹0 — e.g. bonus amount"
                  value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="label">Any additional context</label>
                <textarea className="input" rows={3}
                  placeholder="e.g. I have 2 EMIs running, want to invest in equity..."
                  value={context} onChange={(e) => setContext(e.target.value)}
                  style={{ resize: "vertical" }} />
              </div>
              {error && <p style={{ color: "var(--accent-red)", fontSize: 13, marginBottom: 12 }}>{error}</p>}
              <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}
                style={{ width: "100%", justifyContent: "center" }}>
                {loading ? "Getting advice…" : "Get Personalised Advice"}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Event banner */}
          <div className="card" style={{ borderColor: "var(--accent-green)", background: "var(--accent-green-dim)" }}>
            <div style={{ fontSize: 11, color: "var(--accent-green)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
              Advice for — {EVENTS.find(e => e.value === result.event_type)?.label}
            </div>
            {result.event_amount && (
              <div style={{ fontSize: 20, fontWeight: 700 }}>
                ₹{(+result.event_amount).toLocaleString("en-IN")}
              </div>
            )}
          </div>

          {parsed ? (
            <>
              {/* Immediate Actions */}
              {parsed.immediate_actions && toList(parsed.immediate_actions).length > 0 && (
                <div className="card">
                  <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, color: "var(--accent-green)" }}>⚡ Immediate Actions</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {toList(parsed.immediate_actions).map((item, i) => (
                      <div key={i} style={{ display: "flex", gap: 12, padding: "12px 14px", background: "var(--bg-hover)", borderRadius: 8, borderLeft: "3px solid var(--accent-green)" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--accent-green)", minWidth: 22, paddingTop: 2 }}>
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <div style={{ flex: 1 }}>
                          <SafeValue val={item} depth={0} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Short Term Plan */}
              {parsed.short_term_plan && (
                <div className="card">
                  <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, color: "var(--accent-blue)" }}>📅 Short-Term Plan</h3>
                  {(() => {
                    const plan = parsed.short_term_plan;
                    // Has duration + plan subkeys
                    const duration = plan.duration;
                    const planItems = plan.plan || plan.actions;
                    const listItems = toList(planItems || plan);
                    return (
                      <>
                        {duration && (
                          <div style={{ fontSize: 12, color: "var(--accent-blue)", fontWeight: 600, marginBottom: 10 }}>
                            {typeof duration === "string" ? duration : duration.body || duration.description || JSON.stringify(duration)}
                          </div>
                        )}
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          {listItems.map((item: any, i: number) => (
                            <div key={i} style={{ padding: "10px 14px", background: "var(--bg-hover)", borderRadius: 8 }}>
                              <SafeValue val={item} depth={1} />
                            </div>
                          ))}
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {/* Tax Implications */}
              {parsed.tax_implications && (
                <div className="card">
                  <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, color: "var(--accent-purple)" }}>🧾 Tax Implications</h3>
                  {(() => {
                    const tax = parsed.tax_implications;
                    const regime = tax.regime;
                    const items = toList(tax.implications || tax);
                    return (
                      <>
                        {regime && (
                          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent-purple)", marginBottom: 10 }}>
                            Regime: {regime}
                          </div>
                        )}
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {items.map((item: any, i: number) => (
                            <div key={i} style={{ padding: "10px 14px", background: "var(--bg-hover)", borderRadius: 8, borderLeft: "3px solid var(--accent-purple)" }}>
                              <SafeValue val={item} depth={1} />
                            </div>
                          ))}
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {/* Risk Considerations */}
              {parsed.risk_considerations && toList(parsed.risk_considerations).length > 0 && (
                <div className="card">
                  <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, color: "var(--accent-red)" }}>⚠️ Risk Considerations</h3>
                  <div className="grid-2">
                    {toList(parsed.risk_considerations).map((item: any, i: number) => (
                      <div key={i} style={{ padding: "12px 14px", background: "var(--bg-hover)", borderRadius: 8, borderLeft: "3px solid var(--accent-red)" }}>
                        {/* risk + mitigation shape */}
                        {item.risk && (
                          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--accent-red)", marginBottom: 6 }}>{item.risk}</div>
                        )}
                        {item.mitigation && (
                          <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                            <MarkdownText text={item.mitigation} />
                          </div>
                        )}
                        {/* fallback for other shapes */}
                        {!item.risk && !item.mitigation && <SafeValue val={item} depth={1} />}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Long Term Impact */}
              {parsed.long_term_impact && (
                <div className="card">
                  <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 10, color: "var(--accent-amber)" }}>🎯 Long-Term Impact</h3>
                  <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>
                    <SafeValue val={parsed.long_term_impact} depth={0} />
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="card">
              <pre style={{ fontSize: 13, color: "var(--text-secondary)", whiteSpace: "pre-wrap", fontFamily: "var(--font-sans)", lineHeight: 1.7 }}>
                {typeof result.advice === "string" ? result.advice : JSON.stringify(result.advice, null, 2)}
              </pre>
            </div>
          )}

          <button className="btn btn-ghost" onClick={() => { setResult(null); setSelectedEvent(""); }}>
            ↩ Try another event
          </button>
        </div>
      )}
    </div>
  );
}