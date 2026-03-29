"use client";
import { useState } from "react";
import { Users, Clock } from "lucide-react";
import { userApi, couplesApi } from "@/lib/api";

type Step = "partner_a" | "partner_b" | "waiting" | "result";

const EMPTY_PROFILE = {
  name: "", age: "", annual_income: "", monthly_expenses: "",
  existing_investments: "", risk_profile: "moderate", tax_regime: "new",
};

function parsePlan(raw: any) {
  try {
    const text = typeof raw === "string" ? raw : JSON.stringify(raw);
    const jsonMatch = text.match(/```json\n?([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
    if (jsonMatch) return JSON.parse(jsonMatch[1]);
  } catch {}
  return null;
}

export default function CouplesPage() {
  const [step, setStep] = useState<Step>("partner_a");
  const [partnerA, setPartnerA] = useState({ ...EMPTY_PROFILE });
  const [partnerB, setPartnerB] = useState({ ...EMPTY_PROFILE });
  const [partnerAId, setPartnerAId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const savePartnerA = async () => {
    setLoading(true); setError("");
    try {
      const res = await userApi.create({
        name: partnerA.name, age: +partnerA.age,
        email: `${partnerA.name.toLowerCase().replace(/\s/g, "")}@couple.com`,
        annual_income: +partnerA.annual_income, monthly_expenses: +partnerA.monthly_expenses,
        existing_investments: +partnerA.existing_investments,
        risk_profile: partnerA.risk_profile as any, tax_regime: partnerA.tax_regime as any,
      });
      setPartnerAId(res.user_id);
      setStep("partner_b");
    } catch (e: any) { setError(e.response?.data?.detail || "Error saving Partner A"); }
    finally { setLoading(false); }
  };

  const savePartnerB = async () => {
    setLoading(true); setError("");
    try {
      const res = await userApi.create({
        name: partnerB.name, age: +partnerB.age,
        email: `${partnerB.name.toLowerCase().replace(/\s/g, "")}@couple.com`,
        annual_income: +partnerB.annual_income, monthly_expenses: +partnerB.monthly_expenses,
        existing_investments: +partnerB.existing_investments,
        risk_profile: partnerB.risk_profile as any, tax_regime: partnerB.tax_regime as any,
      });
      const linked = await couplesApi.link(partnerAId, res.user_id);
      setStep("waiting");
      const plan = await couplesApi.plan(linked.couple_id, partnerAId, res.user_id);
      setResult(plan.data);
      setStep("result");
    } catch (e: any) { setError(e.response?.data?.detail || "Error generating plan"); }
    finally { setLoading(false); }
  };

  const ProfileForm = ({ data, setData, title, color, onSubmit, submitLabel }: any) => (
    <div className="card" style={{ maxWidth: 560, borderColor: color }}>
      <h2 style={{ fontSize: 17, fontWeight: 600, color, marginBottom: 20 }}>{title}</h2>
      <div className="grid-2">
        {([
          ["Full Name", "name", "text"], ["Age", "age", "number"],
          ["Annual Income (₹)", "annual_income", "number"],
          ["Monthly Expenses (₹)", "monthly_expenses", "number"],
          ["Existing Investments (₹)", "existing_investments", "number"],
        ] as [string, string, string][]).map(([label, key, type]) => (
          <div className="form-group" key={key}>
            <label className="label">{label}</label>
            <input className="input" type={type} value={(data as any)[key]}
              onChange={(e) => setData({ ...data, [key]: e.target.value })} />
          </div>
        ))}
      </div>
      <div className="grid-2">
        <div className="form-group">
          <label className="label">Risk Profile</label>
          <select className="input" value={data.risk_profile}
            onChange={(e) => setData({ ...data, risk_profile: e.target.value })}>
            <option value="conservative">Conservative</option>
            <option value="moderate">Moderate</option>
            <option value="aggressive">Aggressive</option>
          </select>
        </div>
        <div className="form-group">
          <label className="label">Tax Regime</label>
          <select className="input" value={data.tax_regime}
            onChange={(e) => setData({ ...data, tax_regime: e.target.value })}>
            <option value="new">New</option>
            <option value="old">Old</option>
          </select>
        </div>
      </div>
      {error && <p style={{ color: "var(--accent-red)", fontSize: 13, marginBottom: 12 }}>{error}</p>}
      <button className="btn btn-primary" onClick={onSubmit} disabled={loading}
        style={{ width: "100%", justifyContent: "center", background: color }}>
        {loading ? "Saving…" : submitLabel}
      </button>
    </div>
  );

  const STEPS = [
    { key: "partner_a", label: "Partner A" },
    { key: "partner_b", label: "Partner B" },
    { key: "result", label: "Joint Plan" },
  ];

  const parsed = result ? parsePlan(result.ai_plan) : null;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Users size={28} color="var(--accent-pink)" /> Couple's Money Planner
        </h1>
        <p className="page-subtitle">
          India's first AI-powered joint financial planning tool — optimise HRA, NPS, SIPs, and insurance across both incomes.
        </p>
      </div>

      {/* Step progress */}
      <div style={{ display: "flex", gap: 0, marginBottom: 32, maxWidth: 560 }}>
        {STEPS.map(({ key, label }, i) => {
          const done = STEPS.findIndex(s => s.key === step) > i;
          const active = step === key || (step === "waiting" && key === "result");
          return (
            <div key={key} style={{ display: "flex", alignItems: "center", flex: 1 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: done ? "var(--accent-green)" : active ? "var(--accent-pink)" : "var(--bg-hover)",
                  border: `2px solid ${done ? "var(--accent-green)" : active ? "var(--accent-pink)" : "var(--border)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 600,
                  color: done || active ? "#000" : "var(--text-muted)",
                }}>
                  {done ? "✓" : i + 1}
                </div>
                <div style={{ fontSize: 11, color: active ? "var(--text-primary)" : "var(--text-muted)", marginTop: 4 }}>
                  {label}
                </div>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ height: 2, flex: 1, background: done ? "var(--accent-green)" : "var(--border)", marginBottom: 18 }} />
              )}
            </div>
          );
        })}
      </div>

      {step === "partner_a" && (
        <ProfileForm data={partnerA} setData={setPartnerA}
          title="Partner A — Your details" color="var(--accent-pink)"
          onSubmit={savePartnerA} submitLabel="Save & Continue to Partner B →" />
      )}

      {step === "partner_b" && (
        <ProfileForm data={partnerB} setData={setPartnerB}
          title="Partner B — Their details" color="var(--accent-purple)"
          onSubmit={savePartnerB} submitLabel="Generate Joint Plan ✨" />
      )}

      {step === "waiting" && (
        <div className="card" style={{ maxWidth: 400, textAlign: "center", padding: 48 }}>
          <Clock size={40} color="var(--accent-pink)" style={{ margin: "0 auto 16px" }} />
          <h3 style={{ fontWeight: 600, marginBottom: 8 }}>Building your joint plan…</h3>
          <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>
            Optimising HRA, NPS, SIP splits and insurance strategy across both incomes.
          </p>
          <div className="spinner" style={{ margin: "20px auto 0", width: 28, height: 28 }} />
        </div>
      )}

      {step === "result" && result && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Banner */}
          <div className="card" style={{ borderColor: "var(--accent-pink)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 20 }}>
              {[
                ["Combined Annual Income", `₹${(result.joint_summary?.combined_income || 0).toLocaleString("en-IN")}`, "var(--accent-pink)"],
                ["Combined Monthly Expenses", `₹${(result.joint_summary?.combined_expenses || 0).toLocaleString("en-IN")}`, "var(--accent-purple)"],
                ["Current Net Worth", `₹${(result.joint_summary?.combined_net_worth?.current || 0).toLocaleString("en-IN")}`, "var(--accent-green)"],
              ].map(([label, value, color]) => (
                <div key={label as string}>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: color as string }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* HRA + NPS */}
          <div className="grid-2">
            <div className="card">
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>HRA Optimisation</h3>
              {result.joint_summary?.hra_optimization ? (
                <>
                  <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 4 }}>
                    Claim under: <strong style={{ color: "var(--accent-pink)" }}>
                      {result.joint_summary.hra_optimization.claim_partner}
                    </strong>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "var(--accent-green)", marginTop: 8 }}>
                    ₹{(result.joint_summary.hra_optimization.estimated_annual_saving || 0).toLocaleString("en-IN")}
                    <span style={{ fontSize: 12, fontWeight: 400, color: "var(--text-muted)", marginLeft: 6 }}>saved / year</span>
                  </div>
                </>
              ) : <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Not applicable</p>}
            </div>

            <div className="card">
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>NPS Split (80CCD 1B)</h3>
              {result.joint_summary?.nps_recommendation && (
                <>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {[
                      ["Partner A", result.joint_summary.nps_recommendation.partner_a_contribution, result.joint_summary.nps_recommendation.partner_a_tax_saving],
                      ["Partner B", result.joint_summary.nps_recommendation.partner_b_contribution, result.joint_summary.nps_recommendation.partner_b_tax_saving],
                    ].map(([name, contrib, saving]) => (
                      <div key={name as string} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                        <span style={{ color: "var(--text-secondary)" }}>{name}: ₹{(contrib as number).toLocaleString("en-IN")}/yr</span>
                        <span style={{ color: "var(--accent-green)" }}>saves ₹{(saving as number).toLocaleString("en-IN")}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)", fontSize: 15, fontWeight: 700, color: "var(--accent-green)" }}>
                    Total: ₹{(result.joint_summary.nps_recommendation.total_tax_saving || 0).toLocaleString("en-IN")} saved
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Net worth projection */}
          <div className="card">
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Net Worth Projection</h3>
            <div className="grid-3">
              {[
                ["Today", result.joint_summary?.combined_net_worth?.current],
                ["In 5 Years", result.joint_summary?.combined_net_worth?.projected_5yr],
                ["In 10 Years", result.joint_summary?.combined_net_worth?.projected_10yr],
              ].map(([label, value]) => (
                <div key={label as string} style={{ padding: "16px", background: "var(--bg-hover)", borderRadius: 8 }}>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>{label}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "var(--accent-pink)" }}>
                    ₹{((value as number) || 0).toLocaleString("en-IN")}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Parsed AI plan */}
          {parsed ? (
            <>
              {/* SIP split */}
              {parsed.sip_split && (
                <div className="card">
                  <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, color: "var(--accent-pink)" }}>
                    📈 SIP Split Strategy
                  </h3>
                  <div className="grid-2">
                    {[["Partner A", parsed.sip_split.partner_a_sips], ["Partner B", parsed.sip_split.partner_b_sips]].map(([name, sips]: any) => (
                      <div key={name}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>{name}</div>
                        {Array.isArray(sips) ? sips.map((s: any, i: number) => (
                          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 10px", background: "var(--bg-hover)", borderRadius: 6, marginBottom: 4, fontSize: 12 }}>
                            <span>{s.fund || s.name || s}</span>
                            {s.amount && <span style={{ color: "var(--accent-pink)", fontWeight: 600 }}>₹{Number(s.amount).toLocaleString("en-IN")}/mo</span>}
                          </div>
                        )) : (
                          <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>{sips}</p>
                        )}
                      </div>
                    ))}
                  </div>
                  {parsed.sip_split.rationale && (
                    <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 10, lineHeight: 1.6 }}>
                      {parsed.sip_split.rationale}
                    </p>
                  )}
                </div>
              )}

              {/* Insurance strategy */}
              {parsed.insurance_strategy && (
                <div className="card">
                  <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 10, color: "var(--accent-blue)" }}>
                    🛡️ Insurance Strategy
                  </h3>
                  <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
                    <span className="tag" style={{ background: "var(--accent-blue-dim)", color: "var(--accent-blue)" }}>
                      {parsed.insurance_strategy.type}
                    </span>
                  </div>
                  {parsed.insurance_strategy.cover_amounts && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
                      {Object.entries(parsed.insurance_strategy.cover_amounts).map(([k, v]: any) => (
                        <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                          <span style={{ color: "var(--text-secondary)" }}>{k}</span>
                          <span style={{ fontWeight: 600 }}>₹{Number(v).toLocaleString("en-IN")}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {parsed.insurance_strategy.rationale && (
                    <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                      {parsed.insurance_strategy.rationale}
                    </p>
                  )}
                </div>
              )}

              {/* Tax saving summary */}
              {parsed.tax_saving_summary && (
                <div className="card" style={{ borderColor: "var(--accent-green)", background: "var(--accent-green-dim)" }}>
                  <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, color: "var(--accent-green)" }}>
                    🧾 Total Tax Savings
                  </h3>
                  <div style={{ fontSize: 28, fontWeight: 700, color: "var(--accent-green)" }}>
                    ₹{(parsed.tax_saving_summary.total_annual_saving || 0).toLocaleString("en-IN")}
                    <span style={{ fontSize: 13, fontWeight: 400, color: "var(--text-muted)", marginLeft: 8 }}>per year</span>
                  </div>
                </div>
              )}

              {/* Priority actions */}
              {parsed.priority_actions?.length > 0 && (
                <div className="card">
                  <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, color: "var(--accent-purple)" }}>
                    ⚡ Priority Actions
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {parsed.priority_actions.map((a: any, i: number) => (
                      <div key={i} style={{ display: "flex", gap: 12, padding: "10px 14px", background: "var(--bg-hover)", borderRadius: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--accent-purple)", minWidth: 22 }}>
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{a.action || a}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            // Fallback
            <div className="card">
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Full Joint Financial Plan</h3>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
                {typeof result.ai_plan === "string" ? result.ai_plan : JSON.stringify(result.ai_plan, null, 2)}
              </p>
            </div>
          )}

          <button className="btn btn-ghost" onClick={() => { setStep("partner_a"); setResult(null); setError(""); }}>
            ↩ Start new plan
          </button>
        </div>
      )}
    </div>
  );
}