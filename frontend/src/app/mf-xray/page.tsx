"use client";
import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { PieChart, Upload, AlertTriangle, TrendingUp } from "lucide-react";
import { mfXrayApi } from "@/lib/api";

const USER_ID = "demo-user";

function parseAnalysis(raw: any) {
  try {
    const text = typeof raw === "string" ? raw : JSON.stringify(raw);
    const jsonMatch = text.match(/```json\n?([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
    if (jsonMatch) return JSON.parse(jsonMatch[1]);
  } catch {}
  return null;
}

// Always returns a renderable string — never crashes
function toStr(val: any): string {
  if (!val && val !== 0) return "";
  if (typeof val === "string") return val;
  if (typeof val === "number") return String(val);
  if (Array.isArray(val)) return val.map(toStr).join(", ");
  if (typeof val === "object") {
    const keys = ["explanation", "details", "description", "summary", "text", "analysis", "commentary", "reason"];
    for (const k of keys) if (typeof val[k] === "string" && val[k]) return val[k];
    return Object.entries(val).map(([k, v]) => `${k}: ${toStr(v)}`).join(" · ");
  }
  return String(val);
}

export default function MFXRayPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const onDrop = useCallback(async (files: File[]) => {
    if (!files[0]) return;
    setLoading(true); setError("");
    try {
      const res = await mfXrayApi.uploadPdf(USER_ID, files[0]);
      setResult(res.data);
    } catch (e: any) {
      setError(e.response?.data?.detail || "Failed to analyse. Please try again.");
    } finally { setLoading(false); }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { "application/pdf": [".pdf"] }, maxFiles: 1,
  });

  const parsed = result ? parseAnalysis(result.ai_analysis) : null;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <PieChart size={28} color="var(--accent-blue)" /> MF Portfolio X-Ray
        </h1>
        <p className="page-subtitle">
          Upload your CAMS or KFintech statement — get XIRR, overlap, expense drag, and a rebalancing plan in seconds.
        </p>
      </div>

      {!result && (
        <div {...getRootProps()} className={`upload-zone ${isDragActive ? "active" : ""}`}
          style={{ maxWidth: 560, margin: "0 auto" }}>
          <input {...getInputProps()} />
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <div className="spinner" style={{ width: 32, height: 32 }} />
              <p style={{ color: "var(--text-secondary)" }}>Analysing your portfolio…</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <Upload size={36} color="var(--accent-blue)" />
              <p style={{ fontWeight: 600 }}>Drop your CAMS / KFintech PDF here</p>
              <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>or click to browse · PDF only</p>
            </div>
          )}
        </div>
      )}

      {error && (
        <div style={{ marginTop: 16, padding: "12px 16px", borderRadius: 8,
          background: "var(--accent-red-dim)", border: "1px solid var(--accent-red)",
          color: "var(--accent-red)", fontSize: 13 }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Summary stats */}
          <div className="grid-3">
            {[
              ["Total Invested", `₹${(result.portfolio_summary?.total_invested || 0).toLocaleString("en-IN")}`, "var(--accent-blue)"],
              ["Current Value", `₹${(result.portfolio_summary?.total_current_value || 0).toLocaleString("en-IN")}`, "var(--accent-green)"],
              ["Overall XIRR", `${result.portfolio_summary?.overall_xirr || 0}%`,
                (result.portfolio_summary?.overall_xirr || 0) > 12 ? "var(--accent-green)" : "var(--accent-amber)"],
            ].map(([label, value, color]) => (
              <div className="card" key={label as string}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>{label}</div>
                <div style={{ fontSize: 26, fontWeight: 700, color: color as string }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Holdings table */}
          <div className="card">
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Holdings</h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["Scheme", "Category", "Current Value", "XIRR", "Expense Ratio"].map((h) => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left",
                        color: "var(--text-muted)", fontWeight: 500, fontSize: 11,
                        textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(result.portfolio_summary?.holdings || []).map((h: any, i: number) => (
                    <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "10px 12px", fontWeight: 500 }}>{toStr(h.scheme)}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <span className="tag" style={{ background: "var(--bg-hover)", color: "var(--text-secondary)" }}>
                          {toStr(h.category) || "—"}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px" }}>₹{(h.current_value || 0).toLocaleString("en-IN")}</td>
                      <td style={{ padding: "10px 12px", fontWeight: 600,
                        color: h.xirr > 12 ? "var(--accent-green)" : "var(--accent-amber)" }}>
                        {h.xirr ?? "—"}%
                      </td>
                      <td style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>{h.expense_ratio ?? "—"}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Overlap + Expense drag */}
          <div className="grid-2">
            <div className="card">
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <AlertTriangle size={16} color="var(--accent-amber)" /> Fund Overlap
              </h3>
              {Object.keys(result.overlap_groups || {}).length === 0 ? (
                <p style={{ color: "var(--accent-green)", fontSize: 13 }}>✓ No significant overlap detected</p>
              ) : (
                Object.entries(result.overlap_groups || {}).map(([cat, funds]: any) => (
                  <div key={cat} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 4 }}>{cat}</div>
                    {(Array.isArray(funds) ? funds : [funds]).map((f: any, i: number) => (
                      <div key={i} style={{ fontSize: 13, color: "var(--accent-amber)", padding: "2px 0" }}>• {toStr(f)}</div>
                    ))}
                  </div>
                ))
              )}
            </div>
            <div className="card">
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Expense Drag</h3>
              <div style={{ fontSize: 32, fontWeight: 700, color: "var(--accent-red)" }}>
                ₹{(result.expense_drag_per_year || 0).toLocaleString("en-IN")}
              </div>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 6 }}>lost to expense ratios per year</p>
            </div>
          </div>

          {/* AI Analysis */}
          {parsed ? (
            <>
              {/* Overall assessment */}
              <div className="card" style={{ borderColor: "var(--accent-blue)", background: "var(--accent-blue-dim)" }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: "var(--accent-blue)" }}>
                  📊 Portfolio Assessment
                </h3>
                {parsed.overall_assessment && (
                  <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 12 }}>
                    {toStr(parsed.overall_assessment)}
                  </p>
                )}
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  {Array.isArray(parsed.strengths) && parsed.strengths.length > 0 && (
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--accent-green)", marginBottom: 6, textTransform: "uppercase" }}>
                        ✓ Strengths
                      </div>
                      {parsed.strengths.map((s: any, i: number) => (
                        <div key={i} style={{ fontSize: 12, color: "var(--text-secondary)", padding: "3px 0", lineHeight: 1.5 }}>
                          • {toStr(s)}
                        </div>
                      ))}
                    </div>
                  )}
                  {Array.isArray(parsed.weaknesses) && parsed.weaknesses.length > 0 && (
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--accent-red)", marginBottom: 6, textTransform: "uppercase" }}>
                        ✗ Weaknesses
                      </div>
                      {parsed.weaknesses.map((w: any, i: number) => (
                        <div key={i} style={{ fontSize: 12, color: "var(--text-secondary)", padding: "3px 0", lineHeight: 1.5 }}>
                          • {toStr(w)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Overlap AI commentary */}
              {parsed.fund_overlap && (
                <div className="card">
                  <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, color: "var(--accent-amber)" }}>⚠️ Overlap Analysis</h3>
                  <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>{toStr(parsed.fund_overlap)}</p>
                </div>
              )}

              {/* Expense ratio */}
              {parsed.expense_ratio_analysis && (
                <div className="card">
                  <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, color: "var(--accent-red)" }}>💸 Expense Ratio Analysis</h3>
                  <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>{toStr(parsed.expense_ratio_analysis)}</p>
                </div>
              )}

              {/* Benchmark */}
              {parsed.benchmark_comparison && (
                <div className="card">
                  <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>📈 Benchmark Comparison</h3>
                  <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>{toStr(parsed.benchmark_comparison)}</p>
                </div>
              )}

              {/* Rebalancing plan */}
              {Array.isArray(parsed.rebalancing_plan) && parsed.rebalancing_plan.length > 0 && (
                <div className="card">
                  <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, color: "var(--accent-green)" }}>
                    <TrendingUp size={16} color="var(--accent-green)" style={{ display: "inline", marginRight: 6 }} />
                    Rebalancing Plan
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {parsed.rebalancing_plan.map((step: any, i: number) => {
                      const action = toStr(step.action || "");
                      const fund = toStr(step.fund || "");
                      const reason = toStr(step.reason || "");
                      const alt = toStr(step.suggested_fund || "");
                      const color = action === "EXIT" ? "var(--accent-red)"
                        : action.includes("INTRODUCE") ? "var(--accent-green)"
                        : action.includes("CONSOLIDATE") ? "var(--accent-amber)"
                        : "var(--accent-blue)";
                      return (
                        <div key={i} style={{ padding: "14px", background: "var(--bg-hover)", borderRadius: 8, borderLeft: `3px solid ${color}` }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                            {action && (
                              <span style={{ fontSize: 10, fontWeight: 700, color, background: `${color}22`,
                                padding: "2px 8px", borderRadius: 4, textTransform: "uppercase" }}>
                                {action}
                              </span>
                            )}
                            {fund && <span style={{ fontSize: 13, fontWeight: 600 }}>{fund}</span>}
                          </div>
                          {reason && <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 0 4px" }}>{reason}</p>}
                          {alt && <p style={{ fontSize: 11, color: "var(--accent-green)", margin: 0 }}>💡 Alternative: {alt}</p>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Proposed allocation */}
              {Array.isArray(parsed.proposed_allocation) && parsed.proposed_allocation.length > 0 && (
                <div className="card">
                  <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>📐 Proposed Allocation</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {parsed.proposed_allocation.map((f: any, i: number) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "10px 14px", background: "var(--bg-hover)", borderRadius: 8 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{toStr(f.scheme || f.fund || f.name)}</div>
                          {f.category && <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{toStr(f.category)}</div>}
                        </div>
                        <div style={{ textAlign: "right" }}>
                          {f.percentage && <div style={{ fontSize: 14, fontWeight: 700, color: "var(--accent-green)" }}>{toStr(f.percentage)}</div>}
                          {f.amount && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{toStr(f.amount)}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="card">
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <TrendingUp size={16} color="var(--accent-green)" /> AI Analysis
              </h3>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                {toStr(result.ai_analysis)}
              </p>
            </div>
          )}

          <button className="btn btn-ghost" onClick={() => setResult(null)}>↩ Analyse another portfolio</button>
        </div>
      )}
    </div>
  );
}