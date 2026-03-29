"use client";
import { useState } from "react";
import { Zap } from "lucide-react";
import { fireApi } from "@/lib/api";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

function parseRoadmap(raw: any) {
  try {
    const text = typeof raw === "string" ? raw : JSON.stringify(raw);
    const jsonMatch = text.match(/```json\n?([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
    if (jsonMatch) return JSON.parse(jsonMatch[1]);
  } catch {}
  return null;
}

/** Render markdown **bold** and bullet • as styled HTML */
function MarkdownText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i} style={{ color: "var(--text-primary)", fontWeight: 600 }}>{part.slice(2, -2)}</strong>;
        }
        // Replace bullet • with line breaks
        return (
          <span key={i}>
            {part.split(" • ").map((chunk, j) => (
              <span key={j}>
                {j > 0 && <><br /><span style={{ color: "var(--accent-amber)", marginRight: 6 }}>•</span></>}
                {chunk}
              </span>
            ))}
          </span>
        );
      })}
    </span>
  );
}

function flattenToRows(val: any): { label: string; value: string }[] {
  if (!val) return [];
  if (typeof val === "string") return [{ label: "", value: val }];
  if (Array.isArray(val)) {
    return val.flatMap((item) => {
      if (typeof item === "string") return [{ label: "", value: item }];
      if (item.goal && item.monthly_sip) return [{ label: item.goal, value: `₹${Number(item.monthly_sip).toLocaleString("en-IN")}/mo` }];
      if (item.period && item.actions) {
        const actions = Array.isArray(item.actions) ? item.actions.join(" • ") : String(item.actions);
        return [{ label: item.period, value: actions }];
      }
      if (item.phase && item.actions) {
        const actions = Array.isArray(item.actions) ? item.actions.join(" • ") : String(item.actions);
        return [{ label: item.phase, value: actions }];
      }
      if (item.description) return [{ label: "", value: item.description }];
      return Object.entries(item).map(([k, v]) => ({ label: k, value: typeof v === "object" ? JSON.stringify(v) : String(v) }));
    });
  }
  if (typeof val === "object") {
    return Object.entries(val).flatMap(([phase, phaseVal]: any) => {
      if (typeof phaseVal === "string") return [{ label: phase, value: phaseVal }];
      if (typeof phaseVal === "object" && !Array.isArray(phaseVal)) {
        return Object.entries(phaseVal).map(([k, v]: any) => {
          if (k === "note" || k === "total_monthly_sip") {
            return { label: k === "total_monthly_sip" ? `${phase} — Total SIP` : `${phase} — Note`, value: typeof v === "object" ? JSON.stringify(v) : String(v) };
          }
          const amount = v?.amount ? `₹${Number(v.amount).toLocaleString("en-IN")}/mo` : "";
          const desc = v?.description || (typeof v === "string" ? v : "");
          return { label: k.replace(/_/g, " "), value: [amount, desc].filter(Boolean).join(" — ") };
        });
      }
      return [{ label: phase, value: String(phaseVal) }];
    });
  }
  return [{ label: "", value: String(val) }];
}

/** Flatten insurance_gap object into list of coverage items */
function flattenInsurance(val: any): { type: string; status: string; recommendation: string }[] {
  if (!val) return [];
  if (typeof val === "string") return [{ type: "Insurance", status: "", recommendation: val }];
  if (typeof val === "object" && !Array.isArray(val)) {
    // Check if it's directly { status, recommendation }
    if (val.status && val.recommendation) {
      return [{ type: "Insurance Gap", status: val.status, recommendation: val.recommendation }];
    }
    // Otherwise it's keyed by insurance type
    return Object.entries(val).map(([k, v]: any) => ({
      type: k.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
      status: v?.status || "",
      recommendation: v?.recommendation || (typeof v === "string" ? v : JSON.stringify(v)),
    }));
  }
  return [];
}

export default function FirePage() {
  const [form, setForm] = useState({
    name: "", age: "", annual_income: "", monthly_expenses: "",
    existing_investments: "", target_retirement_age: "",
    post_retirement_monthly_expense: "", risk_profile: "moderate",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setLoading(true); setError("");
    try {
      const res = await fireApi.plan({
        user_profile: {
          name: form.name, age: +form.age,
          email: "user@example.com",
          annual_income: +form.annual_income,
          monthly_expenses: +form.monthly_expenses,
          existing_investments: +form.existing_investments,
          risk_profile: form.risk_profile as any,
          tax_regime: "new",
        },
        target_retirement_age: +form.target_retirement_age,
        post_retirement_monthly_expense: +form.post_retirement_monthly_expense,
      });
      setResult(res.data);
    } catch (e: any) { setError(e.response?.data?.detail || "Error"); }
    finally { setLoading(false); }
  };

  const chartData = result ? Array.from({ length: result.fire_numbers.years_to_fire + 1 }, (_, i) => {
    const r = result.fire_numbers.expected_return / 100 / 12;
    const n = i * 12;
    const sip = result.fire_numbers.monthly_sip_needed;
    const existing = result.fire_numbers.existing_investments;
    const corpus = existing * Math.pow(1 + r, n) + sip * (Math.pow(1 + r, n) - 1) / r;
    return { year: new Date().getFullYear() + i, corpus: Math.round(corpus / 100000) };
  }) : [];

  const parsed = result ? parseRoadmap(result.roadmap) : null;
  const sipRows = parsed ? flattenToRows(parsed.goal_wise_sips) : [];
  const milestoneRows = parsed ? flattenToRows(parsed.milestones) : [];
  const taxRows = parsed ? flattenToRows(parsed.tax_moves) : [];
  const insuranceItems = parsed ? flattenInsurance(parsed.insurance_gap) : [];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Zap size={28} color="var(--accent-amber)" /> FIRE Path Planner
        </h1>
        <p className="page-subtitle">Financial Independence, Retire Early — your personalised month-by-month roadmap.</p>
      </div>

      {!result ? (
        <div className="card" style={{ maxWidth: 600 }}>
          <div className="grid-2">
            {([
              ["Your Name", "name", "text"],
              ["Age", "age", "number"],
              ["Annual Income (₹)", "annual_income", "number"],
              ["Monthly Expenses (₹)", "monthly_expenses", "number"],
              ["Existing Investments (₹)", "existing_investments", "number"],
              ["Target Retirement Age", "target_retirement_age", "number"],
              ["Monthly Expense Post-Retirement (₹)", "post_retirement_monthly_expense", "number"],
            ] as [string, string, string][]).map(([label, key, type]) => (
              <div className="form-group" key={key}>
                <label className="label">{label}</label>
                <input className="input" type={type} value={(form as any)[key]}
                  onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))} />
              </div>
            ))}
          </div>
          <div className="form-group">
            <label className="label">Risk profile</label>
            <select className="input" value={form.risk_profile}
              onChange={(e) => setForm((p) => ({ ...p, risk_profile: e.target.value }))}>
              <option value="conservative">Conservative</option>
              <option value="moderate">Moderate</option>
              <option value="aggressive">Aggressive</option>
            </select>
          </div>
          {error && <p style={{ color: "var(--accent-red)", fontSize: 13, marginBottom: 12 }}>{error}</p>}
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}
            style={{ width: "100%", justifyContent: "center" }}>
            {loading ? "Building your roadmap…" : "Build My FIRE Plan ⚡"}
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Key numbers */}
          <div className="grid-3">
            {[
              ["FIRE Corpus Needed", `₹${(result.fire_numbers.corpus_needed / 1e7).toFixed(2)} Cr`, "var(--accent-amber)"],
              ["Monthly SIP Needed", `₹${(result.fire_numbers.monthly_sip_needed || 0).toLocaleString("en-IN")}`, "var(--accent-green)"],
              ["Years to FIRE", `${result.fire_numbers.years_to_fire} yrs`, "var(--accent-blue)"],
            ].map(([label, value, color]) => (
              <div className="card" key={label as string}>
                <div className="label">{label}</div>
                <div style={{ fontSize: 26, fontWeight: 700, color: color as string, marginTop: 6 }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div className="card">
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Corpus Growth Projection (₹ Lakhs)</h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="year" tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
                <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8 }}
                  formatter={(v: any) => [`₹${v}L`, "Corpus"]}
                />
                <Line type="monotone" dataKey="corpus" stroke="var(--accent-amber)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Asset allocation + SIP ratio */}
          <div className="grid-2">
            <div className="card">
              <div className="label">Asset Allocation</div>
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                {Object.entries(result.fire_numbers.asset_allocation || {}).map(([k, v]: any) => (
                  <div key={k}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                      <span style={{ textTransform: "capitalize", color: "var(--text-secondary)" }}>{k}</span>
                      <span style={{ fontWeight: 600 }}>{v}%</span>
                    </div>
                    <div style={{ height: 6, background: "var(--bg-hover)", borderRadius: 3 }}>
                      <div style={{
                        height: "100%", borderRadius: 3, width: `${v}%`,
                        background: k === "equity" ? "var(--accent-amber)" : "var(--accent-blue)",
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="card">
              <div className="label">SIP to Income Ratio</div>
              <div style={{ fontSize: 40, fontWeight: 700, color: "var(--accent-green)", marginTop: 8 }}>
                {result.fire_numbers.sip_to_income_ratio}%
              </div>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>of your monthly income</p>
            </div>
          </div>

          {/* AI Roadmap */}
          {parsed ? (
            <>
              {parsed.fire_corpus_needed && (
                <div className="card" style={{ borderColor: "var(--accent-amber)", background: "var(--accent-amber-dim)" }}>
                  <div className="label">FIRE Corpus (AI Estimate)</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "var(--accent-amber)", marginTop: 4 }}>
                    ₹{Number(parsed.fire_corpus_needed).toLocaleString("en-IN")}
                  </div>
                </div>
              )}

              {sipRows.length > 0 && (
                <div className="card">
                  <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>🎯 Goal-wise SIPs</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {sipRows.map((row, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "10px 14px", background: "var(--bg-hover)", borderRadius: 8, gap: 12 }}>
                        {row.label && (
                          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--accent-amber)", textTransform: "capitalize", minWidth: 140 }}>
                            {row.label.replace(/_/g, " ")}
                          </span>
                        )}
                        <span style={{ fontSize: 13, color: "var(--text-secondary)", flex: 1 }}>{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {milestoneRows.length > 0 && (
                <div className="card">
                  <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>📅 Milestones</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {milestoneRows.map((row, i) => (
                      <div key={i} style={{ display: "flex", gap: 12, padding: "12px 14px", background: "var(--bg-hover)", borderRadius: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--accent-green)", minWidth: 22, paddingTop: 2 }}>
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <div style={{ flex: 1 }}>
                          {row.label && (
                            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent-blue)", marginBottom: 6, textTransform: "capitalize" }}>
                              {row.label.replace(/_/g, " ")}
                            </div>
                          )}
                          <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>
                            <MarkdownText text={row.value} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {taxRows.length > 0 && (
                <div className="card">
                  <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, color: "var(--accent-purple)" }}>🧾 Tax Moves</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {taxRows.map((row, i) => (
                      <div key={i} style={{ padding: "10px 14px", background: "var(--bg-hover)", borderRadius: 8 }}>
                        {row.label && (
                          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent-purple)", marginBottom: 4, textTransform: "capitalize" }}>
                            {row.label.replace(/_/g, " ")}
                          </div>
                        )}
                        <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                          <MarkdownText text={row.value} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {insuranceItems.length > 0 && (
                <div className="card">
                  <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, color: "var(--accent-red)" }}>⚠️ Insurance Gap</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {insuranceItems.map((item, i) => (
                      <div key={i} style={{ padding: "12px 14px", background: "var(--bg-hover)", borderRadius: 8, borderLeft: "3px solid var(--accent-red)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--accent-red)", textTransform: "capitalize" }}>
                            {item.type}
                          </span>
                          {item.status && (
                            <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: "var(--accent-red-dim, rgba(239,68,68,0.15))", color: "var(--accent-red)" }}>
                              {item.status}
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7, margin: 0 }}>
                          <MarkdownText text={item.recommendation} />
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="card">
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>AI Roadmap</h3>
              <pre style={{ fontSize: 13, color: "var(--text-secondary)", whiteSpace: "pre-wrap", fontFamily: "var(--font-sans)", lineHeight: 1.7 }}>
                {typeof result.roadmap === "string" ? result.roadmap : JSON.stringify(result.roadmap, null, 2)}
              </pre>
            </div>
          )}

          <button className="btn btn-ghost" onClick={() => setResult(null)}>↩ Recalculate</button>
        </div>
      )}
    </div>
  );
}