"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, TrendingUp, Heart, Calculator,
  Users, PieChart, Zap, IndianRupee
} from "lucide-react";

const NAV = [
  { label: "Dashboard",       href: "/dashboard",        icon: LayoutDashboard, color: "var(--accent-blue)" },
  { label: "FIRE Planner",    href: "/fire",             icon: Zap,             color: "var(--accent-amber)" },
  { label: "Health Score",    href: "/health-score",     icon: Heart,           color: "var(--accent-red)" },
  { label: "Life Event",      href: "/life-event",       icon: TrendingUp,      color: "var(--accent-green)" },
  { label: "Tax Wizard",      href: "/tax-wizard",       icon: Calculator,      color: "var(--accent-purple)" },
  { label: "Couple's Planner",href: "/couples-planner",  icon: Users,           color: "var(--accent-pink)" },
  { label: "MF X-Ray",        href: "/mf-xray",          icon: PieChart,        color: "var(--accent-blue)" },
];

export default function Sidebar() {
  const path = usePathname();

  return (
    <aside style={{
      position: "fixed", top: 0, left: 0, height: "100vh",
      width: "var(--sidebar-width)",
      background: "var(--bg-secondary)",
      borderRight: "1px solid var(--border)",
      display: "flex", flexDirection: "column",
      padding: "24px 0", zIndex: 100,
    }}>
      {/* Logo */}
      <div style={{ padding: "0 20px 28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "var(--accent-green)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <IndianRupee size={18} color="#000" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>Money Mentor</div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.08em" }}>AI-POWERED</div>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: "0 12px", display: "flex", flexDirection: "column", gap: 2 }}>
        {NAV.map(({ label, href, icon: Icon, color }) => {
          const active = path === href || path.startsWith(href + "/");
          return (
            <Link key={href} href={href} style={{ textDecoration: "none" }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "9px 12px", borderRadius: 8,
                background: active ? "var(--bg-hover)" : "transparent",
                border: active ? "1px solid var(--border-active)" : "1px solid transparent",
                cursor: "pointer", transition: "all 0.15s",
              }}>
                <Icon size={16} color={active ? color : "var(--text-muted)"} strokeWidth={active ? 2.5 : 2} />
                <span style={{
                  fontSize: 13, fontWeight: active ? 600 : 400,
                  color: active ? "var(--text-primary)" : "var(--text-secondary)",
                }}>
                  {label}
                </span>
                {active && (
                  <div style={{
                    marginLeft: "auto", width: 4, height: 4,
                    borderRadius: "50%", background: color,
                  }} />
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border)" }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>ET AI Hackathon 2026</div>
        <div style={{ fontSize: 10, color: "var(--text-muted)", opacity: 0.6, marginTop: 2 }}>
          Powered by Gemini · LangGraph
        </div>
      </div>
    </aside>
  );
}
