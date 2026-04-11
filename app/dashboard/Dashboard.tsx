"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Hospital,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Plus,
  Loader2,
  Download,
  Users,
  UserCheck,
  Briefcase,
  Layers,
  MapPin,
  TrendingDown,
  Calendar,
  Wallet,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import StatCard from "../components/ui/StatCard";
import { api } from "@/utils/api";
import "./Dashboard.css";

function str(v: unknown, fallback: string): string {
  if (v === null || v === undefined || v === "") return fallback;
  return String(v);
}

/** Shared dashboard APIs for all central roles (super admin + admin staff). Backend scopes data by token. */
function dashboardApiPath(): string {
  return "/api/v1/super-admin/dashboard";
}

function dashboardActivityApiPath(): string {
  return "/api/v1/super-admin/dashboard/activity";
}

const inrFmt = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function formatINR(n: number): string {
  return `₹${inrFmt.format(n)}`;
}

function formatInt(n: number): string {
  return new Intl.NumberFormat("en-IN").format(Math.round(n));
}

type SummaryMetric = {
  value?: number;
  mom_change?: number;
  trend?: string;
};

function cardFromMetric(
  m: unknown,
  mode: "int" | "currency",
): { value: string; change: string; trend: "up" | "down" | "neutral" } {
  const o = (m && typeof m === "object" ? m : {}) as SummaryMetric;
  const v = o.value;
  const num =
    typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  const valueStr =
    mode === "currency" && Number.isFinite(num)
      ? formatINR(num)
      : Number.isFinite(num)
        ? formatInt(num)
        : "—";
  const mom = typeof o.mom_change === "number" ? o.mom_change : 0;
  const tr = (o.trend || "").toLowerCase();
  const trend: "up" | "down" | "neutral" =
    tr === "down"
      ? "down"
      : tr === "up"
        ? "up"
        : mom < 0
          ? "down"
          : mom > 0
            ? "up"
            : "neutral";
  const changeStr = `${mom >= 0 ? "+" : ""}${mom}%`;
  return { value: valueStr, change: changeStr, trend };
}

function formatRelativeTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 16);
  const diff = Date.now() - d.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-IN");
}

function normalizeActivityIconKey(action: string): string {
  const a = action.toLowerCase();
  if (a === "signup" || a === "create" || a === "created") return "signup";
  if (a === "upgrade" || a === "update") return "upgrade";
  if (a === "failed_payment" || a === "payment_failed")
    return "failed_payment";
  if (a === "delete" || a === "removed") return "failed_payment";
  return "view";
}

type ActivityFeedItem = {
  id: number | string;
  type: string;
  user: string;
  amount?: string;
  detail?: string;
  time: string;
  status?: string;
  resourceType?: string;
};

function mapActivityRecordToFeedItem(
  raw: unknown,
  index: number,
): ActivityFeedItem | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const action = str(o.action_type, "VIEW");
  const performedBy = str(o.performed_by, "").trim();
  const staffId = o.staff_id;
  const user =
    performedBy ||
    (typeof staffId === "number" && staffId > 0
      ? `Staff #${staffId}`
      : typeof staffId === "string" && staffId
        ? `Staff #${staffId}`
        : "System");
  const rawId = o.id;
  const id: string | number =
    typeof rawId === "string" || typeof rawId === "number" ? rawId : index;
  return {
    id,
    type: normalizeActivityIconKey(action),
    user,
    detail: str(o.description, ""),
    time: formatRelativeTime(str(o.created_at, "")),
    resourceType: str(o.resource_type, "") || undefined,
  };
}

type CorporateDistribution = {
  company_employees: number;
  state_franchises: number;
  district_franchises: number;
  city_franchises: number;
  total_franchises: number;
};

type PipelineRow = {
  month: string;
  year: number;
  count: number;
  is_estimated?: boolean;
  estimated_count?: number;
};

type RevenueStatsState = {
  total: string;
  ayka_saas: string;
  expert_subscription: string;
  patient_referral: string;
  monthly: string;
  weekly: string;
  monthlyChange: string;
  weeklyChange: string;
  monthlyTrend: "up" | "down" | "neutral";
  weeklyTrend: "up" | "down" | "neutral";
  barAykaPct: number;
  barExpertPct: number;
  barPatientPct: number;
};

export default function Dashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<
    {
      title: string;
      value: string;
      change: string;
      trend: "up" | "down" | "neutral";
      icon: React.ReactNode;
    }[]
  >([]);
  const [revenueStats, setRevenueStats] = useState<RevenueStatsState | null>(
    null,
  );
  const [activityFeed, setActivityFeed] = useState<ActivityFeedItem[]>([]);
  const [corporateDistribution, setCorporateDistribution] =
    useState<CorporateDistribution | null>(null);
  const [subscriptionPipeline, setSubscriptionPipeline] = useState<
    PipelineRow[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [showHierarchy, setShowHierarchy] = useState(false);

  const [activityPanelOpen, setActivityPanelOpen] = useState(false);
  const [activityPanelLoading, setActivityPanelLoading] = useState(false);
  const [activityPanelItems, setActivityPanelItems] = useState<
    ActivityFeedItem[]
  >([]);
  const [activityPanelPage, setActivityPanelPage] = useState(1);
  const [activityPanelPages, setActivityPanelPages] = useState(1);
  const [activityPanelTotal, setActivityPanelTotal] = useState(0);

  useEffect(() => {
    setShowHierarchy(localStorage.getItem("user_type") !== "admin_staff");
  }, []);

  useEffect(() => {
    if (!activityPanelOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActivityPanelOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activityPanelOpen]);

  const fetchActivityPanelPage = useCallback(async (page: number) => {
    setActivityPanelLoading(true);
    try {
      const q = new URLSearchParams({
        page: String(page),
        per_page: "20",
      });
      const res = (await api.get(
        `${dashboardActivityApiPath()}?${q}`,
      )) as {
        success?: boolean;
        data?: Record<string, unknown>;
      };
      if (!res?.success || !res.data || typeof res.data !== "object") {
        setActivityPanelItems([]);
        setActivityPanelPages(1);
        setActivityPanelTotal(0);
        return;
      }
      const d = res.data;
      const items = Array.isArray(d.items) ? d.items : [];
      setActivityPanelItems(
        items
          .map((item, i) => mapActivityRecordToFeedItem(item, i))
          .filter((x): x is ActivityFeedItem => x != null),
      );
      setActivityPanelPage(
        typeof d.page === "number" ? d.page : Number(d.page) || page,
      );
      setActivityPanelPages(
        Math.max(
          1,
          typeof d.pages === "number" ? d.pages : Number(d.pages) || 1,
        ),
      );
      setActivityPanelTotal(
        typeof d.total === "number" ? d.total : Number(d.total) || items.length,
      );
    } catch (e) {
      console.error("Activity feed page error:", e);
      setActivityPanelItems([]);
    } finally {
      setActivityPanelLoading(false);
    }
  }, []);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);

    const applyFallback = () => {
      setStats([
        {
          title: "Total Clinic",
          value: "1,248",
          change: "+12%",
          trend: "up",
          icon: <Hospital size={20} />,
        },
        {
          title: "Total Expert",
          value: "452",
          change: "+8%",
          trend: "up",
          icon: <UserCheck size={20} />,
        },
        {
          title: "Total Patients",
          value: "12,850",
          change: "+15%",
          trend: "up",
          icon: <Users size={20} />,
        },
        {
          title: "Active Subs",
          value: "842",
          change: "+5%",
          trend: "up",
          icon: <Activity size={20} />,
        },
        {
          title: "Inactive Subs",
          value: "124",
          change: "-2%",
          trend: "down",
          icon: <TrendingDown size={20} />,
        },
        {
          title: "Pipeline (MoM)",
          value: "68",
          change: "+18%",
          trend: "up",
          icon: <Calendar size={20} />,
        },
        {
          title: "Total Users",
          value: "15,200",
          change: "+10%",
          trend: "up",
          icon: <Users size={20} />,
        },
        {
          title: "Total Revenue",
          value: "₹24,50,000",
          change: "+12%",
          trend: "up",
          icon: <Wallet size={20} />,
        },
      ]);
      setRevenueStats({
        total: "₹24,50,000",
        ayka_saas: "₹12,40,000",
        expert_subscription: "₹8,20,000",
        patient_referral: "₹3,90,000",
        monthly: "₹8,45,000",
        weekly: "₹2,12,000",
        monthlyChange: "+4.2%",
        weeklyChange: "+2.1%",
        monthlyTrend: "up",
        weeklyTrend: "up",
        barAykaPct: 51,
        barExpertPct: 33,
        barPatientPct: 16,
      });
      setActivityFeed([
        {
          id: 1,
          type: "signup",
          user: "City Clinic Health",
          amount: "Premium Plan",
          time: "2 mins ago",
        },
        {
          id: 2,
          type: "upgrade",
          user: "Dr. Sarah Smith",
          amount: "Expert Pro",
          time: "15 mins ago",
        },
        {
          id: 3,
          type: "failed_payment",
          user: "Metro Diagnostics",
          amount: "Standard Plan",
          time: "1 hour ago",
        },
      ]);
      setCorporateDistribution({
        company_employees: 124,
        state_franchises: 28,
        district_franchises: 145,
        city_franchises: 412,
        total_franchises: 585,
      });
      setSubscriptionPipeline([
        { month: "March", year: 2026, count: 40 },
        { month: "April", year: 2026, count: 65 },
        {
          month: "May",
          year: 2026,
          count: 85,
          is_estimated: true,
          estimated_count: 90,
        },
      ]);
    };

    try {
      const res = await api.get(dashboardApiPath());
      if (!res?.success || !res.data || typeof res.data !== "object") {
        applyFallback();
        return;
      }

      const data = res.data as Record<string, unknown>;
      const summary = (data.summary as Record<string, unknown>) || {};

      setStats([
        {
          title: "Total Clinic",
          ...cardFromMetric(summary.total_clinic, "int"),
          icon: <Hospital size={20} />,
        },
        {
          title: "Total Expert",
          ...cardFromMetric(summary.total_expert, "int"),
          icon: <UserCheck size={20} />,
        },
        {
          title: "Total Patients",
          ...cardFromMetric(summary.total_patients, "int"),
          icon: <Users size={20} />,
        },
        {
          title: "Active Subs",
          ...cardFromMetric(summary.active_subs, "int"),
          icon: <Activity size={20} />,
        },
        {
          title: "Inactive Subs",
          ...cardFromMetric(summary.inactive_subs, "int"),
          icon: <TrendingDown size={20} />,
        },
        {
          title: "Pipeline (MoM)",
          ...cardFromMetric(summary.pipeline_mom, "int"),
          icon: <Calendar size={20} />,
        },
        {
          title: "Total Users",
          ...cardFromMetric(summary.total_users, "int"),
          icon: <Users size={20} />,
        },
        {
          title: "Total Revenue",
          ...cardFromMetric(summary.total_revenue, "currency"),
          icon: <Wallet size={20} />,
        },
      ]);

      const rev =
        (data.revenue_architecture as Record<string, unknown>) || {};
      const ayka = Number(rev.ayka_saas) || 0;
      const expert = Number(rev.expert_subscriptions) || 0;
      const patient = Number(rev.patient_referrals) || 0;
      const revTotal = Number(rev.total) || ayka + expert + patient || 1;
      const pct = (part: number) =>
        revTotal > 0 ? Math.min(100, Math.round((part / revTotal) * 100)) : 0;

      const monthly =
        (rev.monthly_revenue as Record<string, unknown>) || {};
      const weekly =
        (rev.weekly_revenue as Record<string, unknown>) || {};

      const mCh =
        typeof monthly.mom_change === "number" ? monthly.mom_change : 0;
      const monthlyTrendLbl =
        String(monthly.trend || "").toLowerCase() === "down"
          ? "down"
          : String(monthly.trend || "").toLowerCase() === "up"
            ? "up"
            : mCh < 0
              ? "down"
              : mCh > 0
                ? "up"
                : "neutral";

      const wCh =
        typeof weekly.wow_change === "number"
          ? weekly.wow_change
          : typeof weekly.mom_change === "number"
            ? weekly.mom_change
            : 0;
      const weeklyTrendLbl =
        String(weekly.trend || "").toLowerCase() === "down"
          ? "down"
          : String(weekly.trend || "").toLowerCase() === "up"
            ? "up"
            : wCh < 0
              ? "down"
              : wCh > 0
                ? "up"
                : "neutral";

      setRevenueStats({
        total: formatINR(Number(rev.total) || 0),
        ayka_saas: formatINR(ayka),
        expert_subscription: formatINR(expert),
        patient_referral: formatINR(patient),
        monthly: formatINR(Number(monthly.value) || 0),
        weekly: formatINR(Number(weekly.value) || 0),
        monthlyChange: `${mCh >= 0 ? "+" : ""}${mCh}%`,
        weeklyChange: `${wCh >= 0 ? "+" : ""}${wCh}%`,
        monthlyTrend: monthlyTrendLbl,
        weeklyTrend: weeklyTrendLbl,
        barAykaPct: pct(ayka),
        barExpertPct: pct(expert),
        barPatientPct: pct(patient),
      });

      const rawAct = Array.isArray(data.recent_activity)
        ? data.recent_activity
        : [];
      setActivityFeed(
        rawAct
          .map((item, i) => mapActivityRecordToFeedItem(item, i))
          .filter((x): x is ActivityFeedItem => x != null),
      );

      const corp = data.corporate_distribution as
        | Record<string, unknown>
        | undefined;
      if (corp && typeof corp === "object") {
        setCorporateDistribution({
          company_employees: Number(corp.company_employees) || 0,
          state_franchises: Number(corp.state_franchises) || 0,
          district_franchises: Number(corp.district_franchises) || 0,
          city_franchises: Number(corp.city_franchises) || 0,
          total_franchises: Number(corp.total_franchises) || 0,
        });
      } else {
        setCorporateDistribution(null);
      }

      const pipe = Array.isArray(data.subscription_pipeline)
        ? data.subscription_pipeline
        : [];
      setSubscriptionPipeline(
        pipe.map((p) => {
          const o = p as Record<string, unknown>;
          return {
            month: str(o.month, ""),
            year: Number(o.year) || 0,
            count: Number(o.count) || 0,
            is_estimated: Boolean(o.is_estimated),
            estimated_count:
              typeof o.estimated_count === "number"
                ? o.estimated_count
                : undefined,
          };
        }),
      );
    } catch (err: unknown) {
      console.error("Fetch dashboard error:", err);
      applyFallback();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (loading) {
    return (
      <div className="page-container flex-center">
        <Loader2 className="animate-spin" size={48} color="var(--primary)" />
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Command Center</h1>
          <p className="page-subtitle">
            Real-time overview of AYKA Systems Enterprise.
          </p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => router.push("/reports")}
          >
            <Download size={18} /> Download Reports
          </button>
        </div>
      </div>

      <div className="stats-grid-extended">
        {stats.map((stat, i) => (
          <StatCard key={i} {...stat} />
        ))}
      </div>

      <div className="dashboard-grid-layout">
        <div className="dashboard-main-col">
          <div className="card revenue-container">
            <div className="card-header">
              <h3 className="card-title">Revenue Architecture</h3>
              <div className="revenue-total-badge">
                <Wallet size={16} />
                <span>Total: {revenueStats?.total}</span>
              </div>
            </div>

            <div className="revenue-split-grid">
              <div className="rev-item">
                <span className="rev-label">AYKA SaaS</span>
                <span className="rev-value">{revenueStats?.ayka_saas}</span>
                <div className="rev-progress">
                  <div
                    className="rev-bar"
                    style={{
                      width: `${revenueStats?.barAykaPct ?? 0}%`,
                      background: "var(--primary)",
                    }}
                  />
                </div>
              </div>
              <div className="rev-item">
                <span className="rev-label">Expert Subscriptions</span>
                <span className="rev-value">
                  {revenueStats?.expert_subscription}
                </span>
                <div className="rev-progress">
                  <div
                    className="rev-bar"
                    style={{
                      width: `${revenueStats?.barExpertPct ?? 0}%`,
                      background: "#8b5cf6",
                    }}
                  />
                </div>
              </div>
              <div className="rev-item">
                <span className="rev-label">Patient Referrals</span>
                <span className="rev-value">
                  {revenueStats?.patient_referral}
                </span>
                <div className="rev-progress">
                  <div
                    className="rev-bar"
                    style={{
                      width: `${revenueStats?.barPatientPct ?? 0}%`,
                      background: "#ec4899",
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="revenue-time-stats">
              <div className="time-stat">
                <span className="time-label">Monthly Revenue</span>
                <div className="time-value-group">
                  <span className="time-value">{revenueStats?.monthly}</span>
                  <span
                    className={
                      revenueStats?.monthlyTrend === "down"
                        ? "trend-down"
                        : revenueStats?.monthlyTrend === "up"
                          ? "trend-up"
                          : "trend-neutral"
                    }
                  >
                    {revenueStats?.monthlyTrend === "down" ? (
                      <TrendingDown size={14} />
                    ) : revenueStats?.monthlyTrend === "up" ? (
                      <ArrowUpRight size={14} />
                    ) : null}{" "}
                    {revenueStats?.monthlyChange}
                  </span>
                </div>
              </div>
              <div className="time-stat">
                <span className="time-label">Weekly Revenue</span>
                <div className="time-value-group">
                  <span className="time-value">{revenueStats?.weekly}</span>
                  <span
                    className={
                      revenueStats?.weeklyTrend === "down"
                        ? "trend-down"
                        : revenueStats?.weeklyTrend === "up"
                          ? "trend-up"
                          : "trend-neutral"
                    }
                  >
                    {revenueStats?.weeklyTrend === "down" ? (
                      <TrendingDown size={14} />
                    ) : revenueStats?.weeklyTrend === "up" ? (
                      <ArrowUpRight size={14} />
                    ) : null}{" "}
                    {revenueStats?.weeklyChange}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {showHierarchy && (
            <div className="card hierarchy-container">
              <div className="card-header">
                <h3 className="card-title">Corporate Distribution</h3>
                <button
                  type="button"
                  className="text-btn"
                  onClick={() => router.push("/staff")}
                >
                  Manage Hierarchy
                </button>
              </div>
              <div className="hierarchy-grid">
                <div className="h-box">
                  <div className="h-icon">
                    <Briefcase size={20} />
                  </div>
                  <div className="h-info">
                    <span className="h-label">Company Employees</span>
                    <span className="h-value">
                      {formatInt(corporateDistribution?.company_employees ?? 0)}
                    </span>
                  </div>
                </div>
                <div className="h-box">
                  <div className="h-icon">
                    <MapPin size={20} style={{ color: "#ef4444" }} />
                  </div>
                  <div className="h-info">
                    <span className="h-label">State Franchises</span>
                    <span className="h-value">
                      {formatInt(corporateDistribution?.state_franchises ?? 0)}
                    </span>
                  </div>
                </div>
                <div className="h-box">
                  <div className="h-icon">
                    <Layers size={20} style={{ color: "#f59e0b" }} />
                  </div>
                  <div className="h-info">
                    <span className="h-label">District Franchises</span>
                    <span className="h-value">
                      {formatInt(
                        corporateDistribution?.district_franchises ?? 0,
                      )}
                    </span>
                  </div>
                </div>
                <div className="h-box">
                  <div className="h-icon">
                    <Activity size={20} style={{ color: "#10b981" }} />
                  </div>
                  <div className="h-info">
                    <span className="h-label">City Franchises</span>
                    <span className="h-value">
                      {formatInt(corporateDistribution?.city_franchises ?? 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="dashboard-side-col">
          <div className="card activity-card">
            <div className="card-header">
              <h3 className="card-title">Recent Activity</h3>
              <button
                type="button"
                className="text-btn"
                onClick={() => {
                  setActivityPanelOpen(true);
                  void fetchActivityPanelPage(1);
                }}
              >
                View All
              </button>
            </div>
            <div className="activity-list">
              {activityFeed.length === 0 ? (
                <p
                  style={{
                    margin: 0,
                    color: "var(--text-muted, #64748b)",
                    fontSize: 14,
                  }}
                >
                  No recent activity.
                </p>
              ) : null}
              {activityFeed.map((item) => (
                <div key={item.id} className="activity-item">
                  <div className={`activity-icon icon-${item.type}`}>
                    {item.type === "signup" && <Plus size={16} />}
                    {item.type === "upgrade" && <ArrowUpRight size={16} />}
                    {item.type === "failed_payment" && (
                      <ArrowDownRight size={16} />
                    )}
                    {item.type === "view" && <Activity size={16} />}
                  </div>
                  <div className="activity-details">
                    <p className="activity-text">
                      {item.detail ? (
                        <>
                          <strong>{item.user}</strong>
                          <span> — {item.detail}</span>
                        </>
                      ) : (
                        <>
                          <strong>{item.user}</strong>
                          {item.type === "signup"
                            ? " joined "
                            : item.type === "upgrade"
                              ? " upgraded to "
                              : item.type === "failed_payment"
                                ? " failed payment "
                                : " "}
                          <span>{item.amount}</span>
                        </>
                      )}
                      {item.resourceType ? (
                        <span
                          style={{
                            display: "block",
                            marginTop: 4,
                            fontSize: 11,
                            fontWeight: 600,
                            color: "#94a3b8",
                            textTransform: "capitalize",
                          }}
                        >
                          {item.resourceType}
                        </span>
                      ) : null}
                    </p>
                    <span className="activity-time">{item.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card pipe-card">
            <div className="card-header">
              <h3 className="card-title">Subscription Pipeline</h3>
            </div>
            <div className="pipeline-chart">
              {(() => {
                const max = Math.max(
                  1,
                  ...subscriptionPipeline.map((p) =>
                    Math.max(
                      p.count,
                      p.is_estimated && p.estimated_count != null
                        ? p.estimated_count
                        : 0,
                    ),
                  ),
                );
                return subscriptionPipeline.length === 0 ? (
                  <p
                    style={{
                      margin: 0,
                      color: "var(--text-muted, #64748b)",
                      fontSize: 14,
                    }}
                  >
                    No pipeline data yet.
                  </p>
                ) : (
                  subscriptionPipeline.map((p, idx) => {
                    const denom = p.is_estimated
                      ? Math.max(p.count, p.estimated_count ?? 0)
                      : p.count;
                    const widthPct = Math.min(
                      100,
                      Math.round((denom / max) * 100),
                    );
                    const label =
                      p.month +
                      (p.year ? ` ${p.year}` : "") +
                      (p.is_estimated ? " (Est.)" : "");
                    const countLabel =
                      p.is_estimated && p.estimated_count != null
                        ? `${p.count} (est. ${p.estimated_count})`
                        : String(p.count);
                    return (
                      <div
                        key={`${p.month}-${p.year}-${idx}`}
                        className="pipe-row"
                      >
                        <span>{label}</span>
                        <div className="pipe-bg">
                          <div
                            className="pipe-bar"
                            style={{
                              width: `${widthPct}%`,
                              background: p.is_estimated
                                ? "var(--primary)"
                                : undefined,
                            }}
                          />
                        </div>
                        <span>{countLabel}</span>
                      </div>
                    );
                  })
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      {activityPanelOpen ? (
        <div
          className="dashboard-activity-modal-overlay"
          role="presentation"
          onClick={() => setActivityPanelOpen(false)}
        >
          <div
            className="dashboard-activity-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dashboard-activity-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dashboard-activity-modal-header">
              <div>
                <h3 id="dashboard-activity-modal-title" className="card-title">
                  Activity feed
                </h3>
                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: 13,
                    color: "#64748b",
                  }}
                >
                  Page {activityPanelPage} of {activityPanelPages}
                  {activityPanelTotal > 0
                    ? ` · ${formatInt(activityPanelTotal)} events`
                    : null}
                </p>
              </div>
              <button
                type="button"
                className="text-btn"
                aria-label="Close"
                onClick={() => setActivityPanelOpen(false)}
              >
                <X size={22} />
              </button>
            </div>

            <div className="dashboard-activity-modal-body">
              {activityPanelLoading ? (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    padding: 48,
                  }}
                >
                  <Loader2
                    className="animate-spin"
                    size={36}
                    color="var(--primary)"
                  />
                </div>
              ) : activityPanelItems.length === 0 ? (
                <p
                  style={{
                    margin: 0,
                    color: "var(--text-muted, #64748b)",
                    fontSize: 14,
                  }}
                >
                  No activity entries.
                </p>
              ) : (
                <div className="activity-list dashboard-activity-modal-list">
                  {activityPanelItems.map((item) => (
                    <div key={item.id} className="activity-item">
                      <div className={`activity-icon icon-${item.type}`}>
                        {item.type === "signup" && <Plus size={16} />}
                        {item.type === "upgrade" && <ArrowUpRight size={16} />}
                        {item.type === "failed_payment" && (
                          <ArrowDownRight size={16} />
                        )}
                        {item.type === "view" && <Activity size={16} />}
                      </div>
                      <div className="activity-details">
                        <p className="activity-text">
                          <strong>{item.user}</strong>
                          <span> — {item.detail || "—"}</span>
                          {item.resourceType ? (
                            <span
                              style={{
                                display: "block",
                                marginTop: 4,
                                fontSize: 11,
                                fontWeight: 600,
                                color: "#94a3b8",
                                textTransform: "capitalize",
                              }}
                            >
                              {item.resourceType}
                            </span>
                          ) : null}
                        </p>
                        <span className="activity-time">{item.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="dashboard-activity-modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                disabled={activityPanelLoading || activityPanelPage <= 1}
                onClick={() =>
                  void fetchActivityPanelPage(activityPanelPage - 1)
                }
                style={{ display: "flex", alignItems: "center", gap: 6 }}
              >
                <ChevronLeft size={18} />
                Previous
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={
                  activityPanelLoading ||
                  activityPanelPage >= activityPanelPages
                }
                onClick={() =>
                  void fetchActivityPanelPage(activityPanelPage + 1)
                }
                style={{ display: "flex", alignItems: "center", gap: 6 }}
              >
                Next
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
