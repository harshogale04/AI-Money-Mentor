"use client";
import { useState } from "react";
import { Heart } from "lucide-react";
import { healthScoreApi } from "@/lib/api";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts";

const USER_ID = "demo-user";
const INVESTMENT_OPTIONS = ["equity", "debt", "gold", "fd", "real_estate", "elss", "ppf", "nps"];

function MarkdownText({ text }: { text: string }) {
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

// Strip leading "**1. Title:**" pattern into a clean title + body
function parseAction(action: string): { title: string; body: string } {
  // Match **N. Title:** or **Title:** at the start
  const match = action.match(/^\*\*\d*\.?\s*([^*]+?):?\*\*\s*([\s\S]*)$/);
  if (match) return { title: match[1].replace(/:$/, ""), body: match[2] };
  return { title: "", body: action };
}

export default function HealthScorePage() {
  const [form, setForm] = useState({
    monthly_income: "", monthly_expenses: "", emergency_fund: "",
    insurance_cover: "", total_debt_emi: "", retirement_corpus: "", age: "",
  });
  const [investTypes, setInvestTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const toggleInvest = (t: string) =>
    setInvestTypes((p) => p.includes(t) ? p.filter((x) => x !== t) : [...p, t]);

  const handleSubmit = async () => {
    setLoading(true); setError("");
    try {
      const res = await healthScoreApi.compute({
        user_id: USER_ID,
        monthly_income: +form.monthly_income,
        monthly_expenses: +form.monthly_expenses,
        emergency_fund: +form.emergency_fund,
        insurance_cover: +form.insurance_cover,
        total_debt_emi: +form.total_debt_emi,
        retirement_corpus: +form.retirement_corpus,
        age: +form.age,
        investment_types: investTypes,
      });
      setResult(res.data);
    } catch (e: any) {
      setError(e.response?.data?.detail || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const dimensions = result ? [
    { dim: "Emergency", score: result.emergency_score },
    { dim: "Insurance", score: result.insurance_score },
    { dim: "Diversify", score: result.diversification_score },
    { dim: "Debt",      score: result.debt_score },
    { dim: "Tax",       score: result.tax_score },
    { dim: "Retirement",score: result.retirement_score },
  ] : [];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Heart size={28} color="var(--accent-red)" /> Financial Health Score
        </h1>
        <p className="page-subtitle">5-minute assessment across 6 dimensions. Find out where you stand.</p>
      </div>

      {!result ? (
        <div className="card" style={{ maxWidth: 600 }}>
          <div className="grid-2">
            {([
              ["Age", "age", "years"],
              ["Monthly Income", "monthly_income", "₹"],
              ["Monthly Expenses", "monthly_expenses", "₹"],
              ["Emergency Fund", "emergency_fund", "₹ saved"],
              ["Total Insurance Cover", "insurance_cover", "₹"],
              ["Monthly EMIs", "total_debt_emi", "₹/month"],
              ["Retirement Corpus", "retirement_corpus", "₹ saved so far"],
            ] as [string, string, string][]).map(([label, key, hint]) => (
              <div className="form-group" key={key}>
                <label className="label">
                  {label} <span style={{ color: "var(--text-muted)", textTransform: "none" }}>({hint})</span>
                </label>
                <input
                  className="input" type="number" placeholder="0"
                  value={(form as any)[key]}
                  onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                />
              </div>
            ))}
          </div>

          <div className="form-group">
            <label className="label">Investment types you hold</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
              {INVESTMENT_OPTIONS.map((t) => (
                <button key={t} type="button" onClick={() => toggleInvest(t)} style={{
                  padding: "6px 14px", borderRadius: 999, fontSize: 12, fontWeight: 500,
                  cursor: "pointer", border: "1px solid",
                  borderColor: investTypes.includes(t) ? "var(--accent-green)" : "var(--border)",
                  background: investTypes.includes(t) ? "var(--accent-green-dim)" : "transparent",
                  color: investTypes.includes(t) ? "var(--accent-green)" : "var(--text-secondary)",
                  transition: "all 0.15s",
                }}>
                  {t.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {error && <p style={{ color: "var(--accent-red)", fontSize: 13, marginBottom: 12 }}>{error}</p>}

          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}
            style={{ width: "100%", justifyContent: "center" }}>
            {loading ? <><span className="spinner" />Calculating…</> : "Get My Health Score"}
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Overall score */}
          <div className="card" style={{ textAlign: "center", padding: 40 }}>
            <div style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 8 }}>Overall Financial Health</div>
            <div style={{
              fontSize: 72, fontWeight: 800,
              color: result.overall_score >= 70 ? "var(--accent-green)"
                : result.overall_score >= 40 ? "var(--accent-amber)"
                : "var(--accent-red)",
            }}>
              {result.overall_score}
            </div>
            <div style={{ fontSize: 14, color: "var(--text-muted)" }}>out of 100</div>
          </div>

          <div className="grid-2">
            {/* Radar chart */}
            <div className="card">
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Dimension Breakdown</h3>
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={dimensions}>
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis dataKey="dim" tick={{ fill: "var(--text-secondary)", fontSize: 11 }} />
                  <Radar dataKey="score" stroke="var(--accent-red)" fill="var(--accent-red)" fillOpacity={0.15} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Score bars */}
            <div className="card">
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Scores</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {dimensions.map(({ dim, score }) => (
                  <div key={dim}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 13 }}>
                      <span style={{ color: "var(--text-secondary)" }}>{dim}</span>
                      <span style={{ fontWeight: 600, color: score >= 70 ? "var(--accent-green)" : score >= 40 ? "var(--accent-amber)" : "var(--accent-red)" }}>
                        {score}
                      </span>
                    </div>
                    <div style={{ height: 6, background: "var(--bg-hover)", borderRadius: 3 }}>
                      <div style={{
                        height: "100%", borderRadius: 3, width: `${score}%`,
                        background: score >= 70 ? "var(--accent-green)" : score >= 40 ? "var(--accent-amber)" : "var(--accent-red)",
                        transition: "width 0.8s ease",
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Priority actions */}
          {result.priority_actions?.length > 0 && (
            <div className="card">
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Priority Actions</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {result.priority_actions.map((action: string, i: number) => {
                  const { title, body } = parseAction(action);
                  return (
                    <div key={i} style={{ display: "flex", gap: 12, padding: "12px 14px", background: "var(--bg-hover)", borderRadius: 8, borderLeft: "3px solid var(--accent-green)" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--accent-green)", minWidth: 20, paddingTop: 2 }}>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div style={{ flex: 1 }}>
                        {title && (
                          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 5 }}>
                            {title}
                          </div>
                        )}
                        <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>
                          <MarkdownText text={body} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <button className="btn btn-ghost" onClick={() => setResult(null)}>↩ Retake assessment</button>
        </div>
      )}
    </div>
  );
}