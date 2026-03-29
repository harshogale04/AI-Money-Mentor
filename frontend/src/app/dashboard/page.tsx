"use client";
import Link from "next/link";
import { Zap, Heart, TrendingUp, Calculator, Users, PieChart, ArrowRight } from "lucide-react";

const AGENTS = [
  {
    label: "FIRE Planner",
    desc: "Build your month-by-month retirement roadmap with SIP targets.",
    href: "/fire",
    icon: Zap,
    color: "var(--accent-amber)",
    dim: "var(--accent-amber-dim)",
    tag: "Retirement",
  },
  {
    label: "Health Score",
    desc: "Get a 0–100 wellness score across 6 financial dimensions.",
    href: "/health-score",
    icon: Heart,
    color: "var(--accent-red)",
    dim: "var(--accent-red-dim)",
    tag: "Assessment",
  },
  {
    label: "Life Event Advisor",
    desc: "Got a bonus, inheritance, or baby on the way? Get personalized advice.",
    href: "/life-event",
    icon: TrendingUp,
    color: "var(--accent-green)",
    dim: "var(--accent-green-dim)",
    tag: "Advisory",
  },
  {
    label: "Tax Wizard",
    desc: "Upload Form 16 — find every deduction you're missing.",
    href: "/tax-wizard",
    icon: Calculator,
    color: "var(--accent-purple)",
    dim: "var(--accent-purple-dim)",
    tag: "Tax",
  },
  {
    label: "Couple's Planner",
    desc: "Optimize HRA, NPS, and SIPs jointly across both incomes.",
    href: "/couples-planner",
    icon: Users,
    color: "var(--accent-pink)",
    dim: "var(--accent-pink-dim)",
    tag: "Joint",
  },
  {
    label: "MF X-Ray",
    desc: "Upload CAMS statement — get XIRR, overlap, and rebalancing plan.",
    href: "/mf-xray",
    icon: PieChart,
    color: "var(--accent-blue)",
    dim: "var(--accent-blue-dim)",
    tag: "Portfolio",
  },
];

export default function DashboardPage() {
  return (
    <div>
      <div className="page-header">
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          background: "var(--accent-green-dim)", border: "1px solid rgba(0,214,143,0.2)",
          borderRadius: 999, padding: "4px 12px", marginBottom: 16,
        }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent-green)" }} />
          <span style={{ fontSize: 11, color: "var(--accent-green)", fontWeight: 600, letterSpacing: "0.06em" }}>
            6 AI AGENTS READY
          </span>
        </div>
        <h1 className="page-title">Your AI Money Mentor</h1>
        <p className="page-subtitle">
          India's most comprehensive AI-powered personal finance platform. Pick where to start.
        </p>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
        gap: 16,
      }}>
        {AGENTS.map(({ label, desc, href, icon: Icon, color, dim, tag }) => (
          <Link key={href} href={href} style={{ textDecoration: "none" }}>
            <div
              className="card"
              style={{ cursor: "pointer", transition: "all 0.2s", height: "100%" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = color;
                (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)";
                (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 10,
                  background: dim, display: "flex",
                  alignItems: "center", justifyContent: "center",
                }}>
                  <Icon size={20} color={color} strokeWidth={2} />
                </div>
                <span className="tag" style={{
                  background: dim, color: color,
                  border: `1px solid ${color}30`,
                }}>
                  {tag}
                </span>
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{label}</h3>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 16 }}>
                {desc}
              </p>
              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                fontSize: 12, fontWeight: 600, color,
              }}>
                Get started <ArrowRight size={12} />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
