import React from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

/** Icon well tint on billing KPIs (reference: rupee=sky blue, MRR/refund=green, ARR/late=gold). */
export type BillingStatAccent = "sky" | "emerald" | "amber";

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  trend: "up" | "down" | "neutral";
  icon: React.ReactNode;
  /** Billing & Revenue — white KPI tiles with icon well (matches AYKA Central reference). */
  variant?: "default" | "billing";
  /** Only used when variant="billing". */
  billingAccent?: BillingStatAccent;
}

export default function StatCard({
  title,
  value,
  change,
  trend,
  icon,
  variant = "default",
  billingAccent = "emerald",
}: StatCardProps) {
  const isUp = trend === "up";
  const isDown = trend === "down";

  if (variant === "billing") {
    const accentClass = `billing-stat-icon--${billingAccent}`;
    return (
      <div className="billing-stat-card">
        <div className="billing-stat-card-head">
          <span className="billing-stat-title">{title}</span>
          <div className={`billing-stat-icon ${accentClass}`} aria-hidden>
            {icon}
          </div>
        </div>
        <div className="billing-stat-value-row">
          <h3 className="billing-stat-value">{value}</h3>
          <span
            className={`billing-stat-delta billing-stat-delta--${
              isUp ? "up" : isDown ? "down" : "neutral"
            }`}
          >
            {isUp ? (
              <ArrowUpRight size={14} strokeWidth={2.5} />
            ) : isDown ? (
              <ArrowDownRight size={14} strokeWidth={2.5} />
            ) : null}
            {change}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: "20px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "16px",
        }}
      >
        <span
          style={{
            color: "var(--text-muted)",
            fontSize: "14px",
            fontWeight: 500,
          }}
        >
          {title}
        </span>
        <div style={{ color: "#b8c23a" }}>{icon}</div>
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
        <h3
          style={{
            fontSize: "24px",
            fontWeight: 700,
            color: "var(--text-main, #111827)",
          }}
        >
          {value}
        </h3>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: "12px",
            fontWeight: 600,
            color: isUp
              ? "var(--success, #16a34a)"
              : isDown
                ? "var(--danger, #dc2626)"
                : "var(--text-muted, #6b7280)",
          }}
        >
          {isUp ? <ArrowUpRight size={14} /> : isDown ? <ArrowDownRight size={14} /> : null}
          {change}
        </div>
      </div>
    </div>
  );
}
