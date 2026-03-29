"use client";
import { useState } from "react";
import { Calculator, Upload } from "lucide-react";
import { taxApi } from "@/lib/api";

const USER_ID = "demo-user";

function parseAdvice(raw: any) {
  try {
    const text = typeof raw === "string" ? raw : JSON.stringify(raw);
    const jsonMatch = text.match(/```json\n?([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
    if (jsonMatch) return JSON.parse(jsonMatch[1]);
  } catch {}
  return null;
}

function toStr(val: any): string {
  if (!val && val !== 0) return "";
  if (typeof val === "string") return val;
  if (typeof val === "number") return String(val);
  if (Array.isArray(val)) return val.map(toStr).join(", ");
  if (typeof val === "object") {
    const keys = ["explanation", "details", "description", "summary", "text", "reason", "analysis"];
    for (const k of keys) if (typeof val[k] === "string" && val[k]) return val[k];
    return Object.entries(val).map(([k, v]) => `${k}: ${toStr(v)}`).join(" · ");
  }
  return String(val);
}

export default function TaxWizardPage() {
  const [mode, setMode] = useState<"upload" | "manual">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [manual, setManual] = useState({
    gross_salary: "", section_80c: "", section_80d: "", section_80ccd: "", hra_received: "",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true); setError("");
    try {
      const res = await taxApi.uploadPdf(USER_ID, file);
      setResult(res.data);
    } catch (e: any) { setError(e.response?.data?.detail || "Parse error"); }
    finally { setLoading(false); }
  };

  const handleManual = async () => {
    setLoading(true); setError("");
    try {
      const res = await taxApi.manual({
        user_id: USER_ID,
        gross_salary: +manual.gross_salary,
        hra_received: +manual.hra_received,
        deductions: {
          section_80c: +manual.section_80c,
          section_80d: +manual.section_80d,
          section_80ccd: +manual.section_80ccd,
        },
      });
      setResult(res.data);
    } catch (e: any) { setError(e.response?.data?.detail || "Error"); }
    finally { setLoading(false); }
  };

  const parsed = result ? parseAdvice(result.ai_advice) : null;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Calculator size={28} color="var(--accent-purple)" /> Tax Wizard
        </h1>
        <p className="page-subtitle">Find every deduction you're missing. Old vs new regime with your exact numbers.</p>
      </div>

      {!result ? (
        <div className="card" style={{ maxWidth: 560 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 24, background: "var(--bg-secondary)", padding: 4, borderRadius: 8 }}>
            {(["upload", "manual"] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)} style={{
                flex: 1, padding: "8px", borderRadius: 6, border: "none", cursor: "pointer",
                background: mode === m ? "var(--bg-card)" : "transparent",
                color: mode === m ? "var(--text-primary)" : "var(--text-secondary)",
                fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 500,
                boxShadow: mode === m ? "0 1px 3px rgba(0,0,0,0.3)" : "none",
              }}>
                {m === "upload" ? "Upload Form 16" : "Enter manually"}
              </button>
            ))}
          </div>

          {mode === "upload" ? (
            <>
              <label className="upload-zone" style={{ display: "block", cursor: "pointer" }}>
                <input type="file" accept=".pdf" hidden onChange={(e) => setFile(e.target.files?.[0] || null)} />
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                  <Upload size={32} color="var(--accent-purple)" />
                  {file
                    ? <span style={{ color: "var(--accent-green)", fontWeight: 600 }}>{file.name}</span>
                    : <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>Click to upload Form 16 PDF</span>}
                </div>
              </label>
              <button className="btn btn-primary" onClick={handleUpload} disabled={!file || loading}
                style={{ width: "100%", justifyContent: "center", marginTop: 16 }}>
                {loading ? "Analysing…" : "Analyse Form 16"}
              </button>
            </>
          ) : (
            <>
              {([
                ["Gross Salary (Annual)", "gross_salary"],
                ["HRA Received", "hra_received"],
                ["80C Investments", "section_80c"],
                ["80D (Health Insurance)", "section_80d"],
                ["NPS (80CCD)", "section_80ccd"],
              ] as [string, string][]).map(([label, key]) => (
                <div className="form-group" key={key}>
                  <label className="label">{label}</label>
                  <input className="input" type="number" placeholder="₹0"
                    value={(manual as any)[key]}
                    onChange={(e) => setManual((p) => ({ ...p, [key]: e.target.value }))} />
                </div>
              ))}
              <button className="btn btn-primary" onClick={handleManual} disabled={!manual.gross_salary || loading}
                style={{ width: "100%", justifyContent: "center" }}>
                {loading ? "Calculating…" : "Calculate Tax"}
              </button>
            </>
          )}
          {error && <p style={{ color: "var(--accent-red)", fontSize: 13, marginTop: 10 }}>{error}</p>}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Regime numbers */}
          <div className="grid-2">
            <div className="card">
              <div className="label">Old Regime Tax</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "var(--accent-amber)" }}>
                ₹{(result.tax_old_regime || 0).toLocaleString("en-IN")}
              </div>
            </div>
            <div className="card">
              <div className="label">New Regime Tax</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "var(--accent-green)" }}>
                ₹{(result.tax_new_regime || 0).toLocaleString("en-IN")}
              </div>
            </div>
          </div>

          {/* Recommendation banner */}
          <div className="card" style={{ borderColor: "var(--accent-purple)", background: "var(--accent-purple-dim)" }}>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 4 }}>Recommended regime</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "var(--accent-purple)", textTransform: "uppercase" }}>
              {result.recommended_regime} Regime
            </div>
            <div style={{ fontSize: 13, color: "var(--accent-green)", marginTop: 4 }}>
              Save ₹{(result.potential_savings || 0).toLocaleString("en-IN")} p.a.
            </div>
          </div>

          {/* Unused headroom */}
          <div className="card">
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Unused Deduction Headroom</h3>
            <div className="grid-3">
              {Object.entries(result.missing_deductions || {}).map(([k, v]: any) => (
                <div key={k} style={{ padding: "12px", background: "var(--bg-hover)", borderRadius: 8 }}>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>{k.replace("_unused", "")}</div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: "var(--accent-amber)" }}>
                    ₹{Number(v).toLocaleString("en-IN")}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {parsed ? (
            <>
              {/* Regime recommendation — plain text */}
              {parsed.regime_recommendation && (
                <div className="card" style={{ borderColor: "var(--accent-green)", background: "var(--accent-green-dim)" }}>
                  <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 10, color: "var(--accent-green)" }}>
                    ✅ Regime Recommendation
                  </h3>
                  {parsed.recommended_regime && (
                    <div style={{ marginBottom: 10 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, background: "var(--accent-green)",
                        color: "#000", padding: "3px 10px", borderRadius: 4, textTransform: "uppercase" }}>
                        Go with {parsed.recommended_regime} regime
                      </span>
                      {parsed.tax_saving && (
                        <span style={{ fontSize: 13, color: "var(--accent-green)", marginLeft: 10, fontWeight: 600 }}>
                          · Save {parsed.tax_saving}
                        </span>
                      )}
                    </div>
                  )}
                  <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>
                    {toStr(parsed.regime_recommendation)}
                  </p>
                </div>
              )}

              {/* Missing deductions */}
              {Array.isArray(parsed.missing_deductions) && parsed.missing_deductions.length > 0 && (
                <div className="card">
                  <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, color: "var(--accent-amber)" }}>
                    🔍 Deductions You're Missing
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {parsed.missing_deductions.map((d: any, i: number) => (
                      <div key={i} style={{ padding: "12px 14px", background: "var(--bg-hover)", borderRadius: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>
                            {toStr(d.section || d.name || d)}
                          </span>
                          {(d.amount_available || d.amount) && (
                            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--accent-amber)", flexShrink: 0, marginLeft: 12 }}>
                              {toStr(d.amount_available || d.amount)}
                            </span>
                          )}
                        </div>
                        {(d.description || d.details) && (
                          <div style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                            {toStr(d.description || d.details)}
                          </div>
                        )}
                        {d.max_limit && (
                          <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 3 }}>
                            Max limit: {toStr(d.max_limit)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Investment suggestions */}
              {Array.isArray(parsed.investment_suggestions) && parsed.investment_suggestions.length > 0 && (
                <div className="card">
                  <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, color: "var(--accent-blue)" }}>
                    💡 Investment Suggestions
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {parsed.investment_suggestions.map((s: any, i: number) => (
                      <div key={i} style={{ padding: "12px 14px", background: "var(--bg-hover)", borderRadius: 8 }}>
                        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--accent-blue)", minWidth: 22, paddingTop: 2 }}>
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                              {toStr(s.name || s.instrument || s)}
                            </div>
                            {(s.reason || s.rationale) && (
                              <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 6 }}>
                                {toStr(s.reason || s.rationale)}
                              </div>
                            )}
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                              {s.max_deduction && (
                                <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4,
                                  background: "var(--accent-green-dim)", color: "var(--accent-green)" }}>
                                  Deduction: {toStr(s.max_deduction)}
                                </span>
                              )}
                              {s.returns && (
                                <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4,
                                  background: "var(--accent-amber-dim)", color: "var(--accent-amber)" }}>
                                  Returns: {toStr(s.returns)}
                                </span>
                              )}
                              {s.liquidity && (
                                <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4,
                                  background: "var(--bg-secondary)", color: "var(--text-muted)" }}>
                                  Lock-in: {toStr(s.liquidity)}
                                </span>
                              )}
                              {s.risk && (
                                <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4,
                                  background: "var(--bg-secondary)", color: "var(--text-muted)" }}>
                                  Risk: {toStr(s.risk)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary */}
              {parsed.summary && (
                <div className="card">
                  <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>📋 Summary</h3>
                  <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>
                    {toStr(parsed.summary)}
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="card">
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>AI Tax Advice</h3>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                {toStr(result.ai_advice)}
              </p>
            </div>
          )}

          <button className="btn btn-ghost" onClick={() => setResult(null)}>↩ Start over</button>
        </div>
      )}
    </div>
  );
}