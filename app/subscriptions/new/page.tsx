"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Loader2,
  Zap,
  Check,
  Plus,
  ShieldCheck,
  Database,
  Globe,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { api } from "@/utils/api";
import "../../dashboard/Dashboard.css";
import "../Subscriptions.css";

type CreatedPlan = {
  id: number;
  name: string;
  monthly: number;
  quarterly?: number;
  half_yearly?: number;
  yearly: number;
  badge?: string | null;
  features: string[];
  user_cap: number;
  storage_quota_gb: number;
  api_calls_per_month: number;
  is_active: boolean;
  active_subscriptions_count?: number;
  created_at: string;
};

const emptyPlan = () => ({
  name: "",
  monthly: 0,
  quarterly: 0,
  half_yearly: 0,
  yearly: 0,
  badge: "",
  features: [""] as string[],
  user_cap: 5,
  storage_quota_gb: 10,
  api_calls_per_month: 10000,
  is_active: true,
});

export default function NewSubscriptionPlanPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [plan, setPlan] = useState(emptyPlan);
  const [created, setCreated] = useState<CreatedPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAddFeature = () => {
    setPlan((p) => ({ ...p, features: [...p.features, ""] }));
  };

  const handleRemoveFeature = (index: number) => {
    setPlan((p) => ({
      ...p,
      features: p.features.filter((_, i) => i !== index),
    }));
  };

  const handleFeatureChange = (index: number, value: string) => {
    setPlan((p) => {
      const next = [...p.features];
      next[index] = value;
      return { ...p, features: next };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const filteredFeatures = plan.features.map((f) => f.trim()).filter(Boolean);
    if (filteredFeatures.length === 0) {
      setError("Add at least one feature for this tier.");
      return;
    }

    const payload = {
      name: plan.name.trim().toUpperCase(),
      monthly: Number(plan.monthly),
      quarterly: Number(plan.quarterly),
      half_yearly: Number(plan.half_yearly),
      yearly: Number(plan.yearly),
      ...(plan.badge.trim() ? { badge: plan.badge.trim() } : {}),
      features: filteredFeatures,
      user_cap: Number(plan.user_cap),
      storage_quota_gb: Number(plan.storage_quota_gb),
      api_calls_per_month: Number(plan.api_calls_per_month),
      is_active: plan.is_active,
    };

    setSaving(true);
    try {
      const result = await api.post<{
        success?: boolean;
        message?: string;
        data?: CreatedPlan;
      }>("/api/v1/super-admin/subscription/plans", payload);

      if (result.success && result.data) {
        setCreated(result.data);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setError(result.message || "Could not create this plan.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setSaving(false);
    }
  };

  const formatInr = (n: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(n);

  const resetAnother = () => {
    setCreated(null);
    setPlan(emptyPlan());
    setError(null);
  };

  return (
    <div className="page-container subscriptions-page sub-create">
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => router.push("/subscriptions")}
            style={{ padding: "9px 14px" }}
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="page-title">Create Subscription Tier</h1>
            <p className="page-subtitle">
              Define price points, quotas and feature access for clinics.
            </p>
          </div>
        </div>
        {created ? (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => router.push("/subscriptions")}
          >
            All plans
          </button>
        ) : null}
      </div>

      {created ? (
        <div className="plan-created-receipt plan-created-receipt--enter">
          <div className="plan-created-receipt__ribbon">
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <CheckCircle2 size={17} strokeWidth={2.25} />
              Saved · SA-01
            </span>
          </div>
          <div className="plan-created-receipt__body">
            <p className="plan-created-receipt__eyebrow">New subscription plan</p>
            <div className="plan-created-receipt__title">
              <span className="plan-created-receipt__name">{created.name}</span>
              {created.badge ? (
                <span className="plan-created-receipt__badge">{created.badge}</span>
              ) : null}
            </div>
            <p className="plan-created-receipt__lede">
              {created.is_active
                ? "Clinics can see this tier where plans are sold. You can edit quotas or pricing from the catalog anytime."
                : "This tier is inactive and hidden from checkout until you turn it on."}
            </p>

            <div className="plan-created-receipt__stats">
              <div className="plan-created-receipt__stat">
                <span className="plan-created-receipt__stat-k">Monthly</span>
                <span className="plan-created-receipt__stat-v">
                  {formatInr(created.monthly)}
                </span>
              </div>
              <div className="plan-created-receipt__stat">
                <span className="plan-created-receipt__stat-k">Quarterly</span>
                <span className="plan-created-receipt__stat-v">
                  {formatInr(created.quarterly ?? 0)}
                </span>
              </div>
              <div className="plan-created-receipt__stat">
                <span className="plan-created-receipt__stat-k">Half-yearly</span>
                <span className="plan-created-receipt__stat-v">
                  {formatInr(created.half_yearly ?? 0)}
                </span>
              </div>
              <div className="plan-created-receipt__stat">
                <span className="plan-created-receipt__stat-k">Yearly</span>
                <span className="plan-created-receipt__stat-v">
                  {formatInr(created.yearly)}
                </span>
              </div>
              <div className="plan-created-receipt__stat">
                <span className="plan-created-receipt__stat-k">Active subs</span>
                <span className="plan-created-receipt__stat-v">
                  {created.active_subscriptions_count ?? 0}
                </span>
              </div>
            </div>

            <ul className="plan-created-receipt__features">
              {created.features.map((f, i) => (
                <li key={i}>
                  <Check size={14} strokeWidth={2.5} />
                  {f}
                </li>
              ))}
            </ul>

            <div className="plan-created-receipt__quotas">
              <div>
                <span className="plan-created-receipt__stat-k">Users cap</span>
                <div className="plan-created-receipt__stat-v">{created.user_cap}</div>
              </div>
              <div>
                <span className="plan-created-receipt__stat-k">Storage</span>
                <div className="plan-created-receipt__stat-v">
                  {created.storage_quota_gb} GB
                </div>
              </div>
              <div>
                <span className="plan-created-receipt__stat-k">API / month</span>
                <div className="plan-created-receipt__stat-v">
                  {created.api_calls_per_month.toLocaleString("en-IN")}
                </div>
              </div>
            </div>

            <div className="plan-created-receipt__actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => router.push("/subscriptions")}
              >
                <Sparkles size={18} />
                View catalog
              </button>
              <button type="button" className="btn btn-secondary" onClick={resetAnother}>
                Create another tier
              </button>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {error ? (
            <div className="sub-create-error" role="alert">
              {error}
            </div>
          ) : null}

          <div className="sub-create-form">
            <div className="sub-create-stack">
              <div className="card sub-create-card">
                <h2 className="sub-create-card__title sub-create-card__title--spaced">
                  <Zap size={20} className="sub-create-icon--violet" />
                  Tier Identity &amp; Pricing
                </h2>
                <div className="sub-create-grid2">
                  <div className="sub-create-field sub-create-span2">
                    <label htmlFor="tier-name">Tier name</label>
                    <input
                      id="tier-name"
                      type="text"
                      className="sub-create-input sub-create-input--strong"
                      required
                      autoComplete="off"
                      value={plan.name}
                      onChange={(e) =>
                        setPlan({ ...plan, name: e.target.value })
                      }
                      placeholder="e.g. PREMIUM, GROWTH"
                    />
                  </div>
                  <div className="sub-create-field">
                    <label htmlFor="price-mo">Monthly price (₹)</label>
                    <input
                      id="price-mo"
                      type="number"
                      className="sub-create-input"
                      required
                      min={0}
                      step={1}
                      value={plan.monthly}
                      onChange={(e) =>
                        setPlan({ ...plan, monthly: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div className="sub-create-field">
                    <label htmlFor="price-q">Quarterly price (₹)</label>
                    <input
                      id="price-q"
                      type="number"
                      className="sub-create-input"
                      required
                      min={0}
                      step={1}
                      value={plan.quarterly}
                      onChange={(e) =>
                        setPlan({ ...plan, quarterly: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div className="sub-create-field">
                    <label htmlFor="price-hy">Half-yearly price (₹)</label>
                    <input
                      id="price-hy"
                      type="number"
                      className="sub-create-input"
                      required
                      min={0}
                      step={1}
                      value={plan.half_yearly}
                      onChange={(e) =>
                        setPlan({ ...plan, half_yearly: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div className="sub-create-field">
                    <label htmlFor="price-yr">Yearly price (₹)</label>
                    <input
                      id="price-yr"
                      type="number"
                      className="sub-create-input"
                      required
                      min={0}
                      step={1}
                      value={plan.yearly}
                      onChange={(e) =>
                        setPlan({ ...plan, yearly: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div className="sub-create-field sub-create-span2">
                    <label htmlFor="badge">Highlight badge (optional)</label>
                    <input
                      id="badge"
                      type="text"
                      className="sub-create-input"
                      value={plan.badge}
                      onChange={(e) =>
                        setPlan({ ...plan, badge: e.target.value })
                      }
                      placeholder="e.g. Most Popular"
                    />
                  </div>
                </div>
              </div>

              <div className="card sub-create-card">
                <div className="sub-create-card__head">
                  <h2 className="sub-create-card__title" style={{ marginBottom: 0 }}>
                    <ShieldCheck size={20} className="sub-create-icon--green" />
                    Feature list
                  </h2>
                  <button
                    type="button"
                    className="btn btn-secondary sub-create-add-btn"
                    onClick={handleAddFeature}
                  >
                    <Plus size={16} />
                    Add feature
                  </button>
                </div>
                <div className="sub-create-feature-rows">
                  {plan.features.map((feature, index) => (
                    <div className="sub-create-feature-row" key={index}>
                      <div className="sub-create-feature-check" aria-hidden>
                        <Check size={18} />
                      </div>
                      <input
                        type="text"
                        className="sub-create-input"
                        value={feature}
                        onChange={(e) =>
                          handleFeatureChange(index, e.target.value)
                        }
                        placeholder="e.g. Unlimited appointments"
                      />
                      {plan.features.length > 1 ? (
                        <button
                          type="button"
                          className="sub-create-feature-remove"
                          onClick={() => handleRemoveFeature(index)}
                          aria-label="Remove"
                        >
                          <Plus
                            size={18}
                            style={{ transform: "rotate(45deg)" }}
                          />
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="sub-create-stack">
              <div className="card sub-create-card">
                <h2 className="sub-create-card__title sub-create-card__title--spaced">
                  <Database size={20} className="sub-create-icon--blue" />
                  Resource quotas
                </h2>
                <div className="sub-create-stack" style={{ gap: 20 }}>
                  <div className="sub-create-field sub-create-field--rowlabel">
                    <label htmlFor="user-cap">
                      <span>User capacity</span>
                      <span className="sub-create-field__hint">
                        {plan.user_cap} users
                      </span>
                    </label>
                    <input
                      id="user-cap"
                      type="range"
                      className="sub-create-range"
                      min={1}
                      max={100}
                      step={1}
                      value={plan.user_cap}
                      onChange={(e) =>
                        setPlan({
                          ...plan,
                          user_cap: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="sub-create-field sub-create-field--rowlabel">
                    <label htmlFor="storage-gb">
                      <span>Storage quota</span>
                      <span className="sub-create-field__hint">
                        {plan.storage_quota_gb} GB
                      </span>
                    </label>
                    <input
                      id="storage-gb"
                      type="number"
                      className="sub-create-input"
                      min={0}
                      value={plan.storage_quota_gb}
                      onChange={(e) =>
                        setPlan({
                          ...plan,
                          storage_quota_gb: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="sub-create-field">
                    <label htmlFor="api-calls">API calls per month</label>
                    <input
                      id="api-calls"
                      type="number"
                      className="sub-create-input"
                      min={0}
                      value={plan.api_calls_per_month}
                      onChange={(e) =>
                        setPlan({
                          ...plan,
                          api_calls_per_month: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="card sub-create-card">
                <h2 className="sub-create-card__title sub-create-card__title--spaced">
                  <Globe size={20} className="sub-create-icon--amber" />
                  Visibility
                </h2>
                <label className="sub-create-toggle">
                  <div>
                    <span className="sub-create-toggle__title">Active status</span>
                    <span className="sub-create-toggle__hint">
                      Show this plan to clinics for purchase.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={plan.is_active}
                    onChange={(e) =>
                      setPlan({ ...plan, is_active: e.target.checked })
                    }
                  />
                </label>
              </div>

              <div className="sub-create-actions">
                <button
                  type="submit"
                  className="btn btn-primary sub-create-submit"
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 size={20} className="sub-create-spin" />
                  ) : (
                    <Save size={20} />
                  )}
                  {saving ? "Creating…" : "Create Subscription Tier"}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary sub-create-discard"
                  onClick={() => router.push("/subscriptions")}
                >
                  Discard changes
                </button>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
