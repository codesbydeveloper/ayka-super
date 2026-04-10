"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Plus,
  Edit2,
  Loader2,
  Clock,
  LayoutGrid,
  Stethoscope,
  Building,
  PlusSquare,
  Trash2,
  Zap,
} from "lucide-react";
import "../dashboard/Dashboard.css";
import "./Subscriptions.css";
import { api } from "@/utils/api";
import {
  type AddonDisplay,
  parseAddonServicesPayload,
} from "@/utils/addonServices";

type ApiSubscriptionPlan = {
  id: number;
  name: string;
  monthly?: number;
  quarterly?: number;
  half_yearly?: number;
  yearly?: number;
  badge?: string | null;
  features: string[];
  user_cap?: number;
  storage_quota_gb?: number;
  api_calls_per_month?: number;
  is_active?: boolean;
  active_subscriptions_count?: number;
  /** If the API adds grouping later, map clinic | expert | addon */
  category?: string;
};

type PlansListResponse = {
  success?: boolean;
  message?: string;
  data?: {
    total?: number;
    active_plans?: number;
    inactive_plans?: number;
    plans?: ApiSubscriptionPlan[];
  };
};

type SubscriptionDisplayPlan = {
  id: number;
  name: string;
  category: "clinic" | "expert" | "addon";
  durations: { months: number; price: number }[];
  features: string[];
  is_active: boolean;
  badge?: string | null;
  user_cap?: number;
  storage_quota_gb?: number;
  api_calls_per_month?: number;
  active_subscriptions_count?: number;
};

function normalizeCategory(
  raw: string | undefined,
): "clinic" | "expert" | "addon" {
  const c = (raw || "").toLowerCase().trim();
  if (c === "expert" || c === "specialist" || c === "individual")
    return "expert";
  if (c === "addon" || c === "add-on" || c === "add_on") return "addon";
  return "clinic";
}

function buildDurations(p: ApiSubscriptionPlan): { months: number; price: number }[] {
  const out: { months: number; price: number }[] = [];
  const monthly = Number(p.monthly);
  if (!Number.isNaN(monthly) && monthly > 0) out.push({ months: 1, price: monthly });
  const q = Number(p.quarterly);
  if (p.quarterly != null && !Number.isNaN(q) && q > 0)
    out.push({ months: 3, price: q });
  const h = Number(p.half_yearly);
  if (p.half_yearly != null && !Number.isNaN(h) && h > 0)
    out.push({ months: 6, price: h });
  const y = Number(p.yearly);
  if (!Number.isNaN(y) && y > 0) out.push({ months: 12, price: y });
  return out.sort((a, b) => a.months - b.months);
}

function mapApiPlanToDisplay(p: ApiSubscriptionPlan): SubscriptionDisplayPlan {
  return {
    id: p.id,
    name: p.name,
    category: normalizeCategory(p.category),
    durations: buildDurations(p),
    features: Array.isArray(p.features) ? p.features : [],
    is_active: p.is_active ?? true,
    badge: p.badge ?? undefined,
    user_cap: p.user_cap,
    storage_quota_gb: p.storage_quota_gb,
    api_calls_per_month: p.api_calls_per_month,
    active_subscriptions_count: p.active_subscriptions_count,
  };
}

export default function SubscriptionsPage() {
  const router = useRouter();

  const [plans, setPlans] = useState<SubscriptionDisplayPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<
    "clinic" | "expert" | "addon"
  >("clinic");

  const [addons, setAddons] = useState<AddonDisplay[]>([]);
  const [addonLoading, setAddonLoading] = useState(false);
  const [addonFetchError, setAddonFetchError] = useState<string | null>(null);
  const [deletingAddonId, setDeletingAddonId] = useState<number | null>(null);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const result = await api.get<PlansListResponse>(
        "/api/v1/super-admin/subscription/plans?include_inactive=true",
      );
      const raw = result.data?.plans ?? [];
      setPlans(raw.map(mapApiPlanToDisplay));
    } catch (err: unknown) {
      console.error("Fetch plans error:", err);
      setPlans([]);
      setFetchError(
        err instanceof Error ? err.message : "Could not load subscription plans.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAddons = useCallback(async () => {
    setAddonLoading(true);
    setAddonFetchError(null);
    try {
      const result = await api.get<Record<string, unknown>>(
        "/api/v1/super-admin/addon-services?include_inactive=true&featured_only=false",
      );
      setAddons(parseAddonServicesPayload(result));
    } catch (err: unknown) {
      console.error("Fetch add-on services error:", err);
      setAddons([]);
      setAddonFetchError(
        err instanceof Error ? err.message : "Could not load add-on services.",
      );
    } finally {
      setAddonLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  useEffect(() => {
    if (activeCategory !== "addon") return;
    void fetchAddons();
  }, [activeCategory, fetchAddons]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const c = new URLSearchParams(window.location.search).get("category");
    if (c === "addon" || c === "expert" || c === "clinic") {
      setActiveCategory(c);
    }
  }, []);

  const filteredPlans = plans.filter((p) => p.category === activeCategory);

  const goCreateTier = () =>
    router.push(
      activeCategory === "addon"
        ? "/subscriptions/new?kind=addon"
        : "/subscriptions/new",
    );

  const handleDeleteAddon = async (addonId: number) => {
    if (!confirm("Delete this add-on service? This cannot be undone.")) return;
    setDeletingAddonId(addonId);
    try {
      const result = await api.delete<{ success?: boolean; message?: string }>(
        `/api/v1/super-admin/addon-services/${addonId}`,
      );
      if (result.success === false) {
        alert(result.message || "Could not delete this add-on.");
        return;
      }
      await fetchAddons();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Could not delete this add-on.");
    } finally {
      setDeletingAddonId(null);
    }
  };

  return (
    <div className="page-container subscriptions-page">
      <div className="subscriptions-hero">
        <div className="subscriptions-hero__copy">
          <h1 className="subscriptions-hero__title">Platform Subscriptions</h1>
          <p className="subscriptions-hero__subtitle">
            Design and deploy pricing models across the Ayka ecosystem.
          </p>
        </div>
        <div className="subscriptions-hero__actions">
          <button
            type="button"
            className="subscriptions-btn subscriptions-btn--outline"
            onClick={() =>
              alert("Category management will be available in a future release.")
            }
          >
            <PlusSquare size={18} strokeWidth={2} />
            Add Category
          </button>
          <button
            type="button"
            className="subscriptions-btn subscriptions-btn--primary"
            onClick={goCreateTier}
          >
            <Plus size={18} strokeWidth={2.25} />
            Create New Tier
          </button>
        </div>
      </div>

      {activeCategory === "addon" && addonFetchError ? (
        <div className="subscriptions-fetch-error" role="alert">
          {addonFetchError}
        </div>
      ) : activeCategory !== "addon" && fetchError ? (
        <div className="subscriptions-fetch-error" role="alert">
          {fetchError}
        </div>
      ) : null}

      <div className="category-tabs-container">
        <div className="category-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeCategory === "clinic"}
            className={`cat-tab ${activeCategory === "clinic" ? "active" : ""}`}
            onClick={() => setActiveCategory("clinic")}
          >
            <Building size={18} strokeWidth={1.75} />
            <span>Clinic Subscriptions</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeCategory === "expert"}
            className={`cat-tab ${activeCategory === "expert" ? "active" : ""}`}
            onClick={() => setActiveCategory("expert")}
          >
            <Stethoscope size={18} strokeWidth={1.75} />
            <span>Expert Subscriptions</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeCategory === "addon"}
            className={`cat-tab ${activeCategory === "addon" ? "active" : ""}`}
            onClick={() => setActiveCategory("addon")}
          >
            <LayoutGrid size={18} strokeWidth={1.75} />
            <span>Add-on Services</span>
          </button>
        </div>
      </div>

      <div className="plans-grid">
        {activeCategory === "addon" ? (
          addonLoading ? (
            <div className="subscriptions-loading">
              <Loader2 className="subscriptions-loading__spin" size={34} />
              <span>Loading add-on services…</span>
            </div>
          ) : addons.length === 0 ? (
            <div className="subscriptions-empty">
              <p>No add-on services yet.</p>
              <button
                type="button"
                className="subscriptions-btn subscriptions-btn--primary"
                onClick={goCreateTier}
              >
                Create New Tier
              </button>
            </div>
          ) : (
            addons.map((addon) => (
              <article
                key={addon.id}
                className={`plan-card ${addon.badge || addon.is_featured ? "plan-card--featured" : ""} ${!addon.is_active ? "plan-card--inactive" : ""}`}
              >
                {addon.badge ? (
                  <div className="plan-card__pin">
                    <Zap size={11} strokeWidth={2.5} />
                    {addon.badge}
                  </div>
                ) : addon.is_featured ? (
                  <div className="plan-card__pin">
                    <Zap size={11} strokeWidth={2.5} />
                    Featured
                  </div>
                ) : null}

                <div className="plan-card__top">
                  <h3 className="plan-card__name">{addon.name}</h3>
                  {!addon.is_active ? (
                    <div className="plan-card__status plan-card__status--off">
                      Inactive add-on
                    </div>
                  ) : null}
                  {addon.description ? (
                    <p
                      style={{
                        margin: "0 0 10px",
                        fontSize: 13,
                        color: "var(--muted-foreground, #5c6670)",
                        lineHeight: 1.45,
                      }}
                    >
                      {addon.description}
                    </p>
                  ) : null}
                  <div className="price-durations-list">
                    <div className="price-item">
                      <div className="price-item__dur">
                        <Clock
                          size={13}
                          strokeWidth={2}
                          className="price-item__clock"
                        />
                        <span className="duration-text">List (mo)</span>
                      </div>
                      <span className="price-amount">
                        ₹{addon.monthly_price.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="price-item">
                      <div className="price-item__dur">
                        <Clock
                          size={13}
                          strokeWidth={2}
                          className="price-item__clock"
                        />
                        <span className="duration-text">Offer</span>
                      </div>
                      <span className="price-amount">
                        ₹{addon.offer_price.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                  {addon.icon ? (
                    <dl className="plan-card__meta">
                      <dt>Icon</dt>
                      <dd>{addon.icon}</dd>
                    </dl>
                  ) : null}
                </div>

                <div className="plan-features-section">
                  <span className="feature-title">What&apos;s included</span>
                  <ul className="feature-list">
                    {addon.features.length === 0 ? (
                      <li className="price-item--muted" style={{ listStyle: "none" }}>
                        No features listed
                      </li>
                    ) : (
                      addon.features.map((f, i) => (
                        <li key={i}>
                          <span className="feature-list__check" aria-hidden>
                            <Check size={13} strokeWidth={2.75} />
                          </span>
                          {f}
                        </li>
                      ))
                    )}
                  </ul>
                </div>

                <div className="plan-actions">
                  <button
                    type="button"
                    className="plan-actions__edit"
                    onClick={() =>
                      router.push(
                        `/subscriptions/details?id=${addon.id}&kind=addon`,
                      )
                    }
                  >
                    <Edit2 size={16} strokeWidth={2} />
                    Edit add-on
                  </button>
                  <button
                    type="button"
                    className="plan-actions__delete"
                    title="Remove add-on"
                    aria-label="Remove add-on"
                    disabled={deletingAddonId === addon.id}
                    onClick={() => handleDeleteAddon(addon.id)}
                  >
                    {deletingAddonId === addon.id ? (
                      <Loader2 size={17} strokeWidth={2} className="subscriptions-loading__spin" />
                    ) : (
                      <Trash2 size={17} strokeWidth={2} />
                    )}
                  </button>
                </div>
              </article>
            ))
          )
        ) : loading ? (
          <div className="subscriptions-loading">
            <Loader2 className="subscriptions-loading__spin" size={34} />
            <span>Loading tiers…</span>
          </div>
        ) : filteredPlans.length === 0 ? (
          <div className="subscriptions-empty">
            <p>No tiers in this category yet.</p>
            <button
              type="button"
              className="subscriptions-btn subscriptions-btn--primary"
              onClick={goCreateTier}
            >
              Create New Tier
            </button>
          </div>
        ) : (
          filteredPlans.map((plan) => (
            <article
              key={plan.id}
              className={`plan-card ${plan.badge ? "plan-card--featured" : ""} ${!plan.is_active ? "plan-card--inactive" : ""}`}
            >
              {plan.badge ? (
                <div className="plan-card__pin">
                  <Zap size={11} strokeWidth={2.5} />
                  {plan.badge}
                </div>
              ) : null}

              <div className="plan-card__top">
                <h3 className="plan-card__name">{plan.name}</h3>
                {!plan.is_active ? (
                  <div className="plan-card__status plan-card__status--off">
                    Inactive tier
                  </div>
                ) : null}
                <div className="price-durations-list">
                  {plan.durations.length === 0 ? (
                    <div className="price-item price-item--muted">
                      <span className="duration-text">Pricing</span>
                      <span className="price-amount price-amount--muted">
                        Not set
                      </span>
                    </div>
                  ) : (
                    plan.durations.map((d) => (
                      <div key={d.months} className="price-item">
                        <div className="price-item__dur">
                          <Clock
                            size={13}
                            strokeWidth={2}
                            className="price-item__clock"
                          />
                          <span className="duration-text">
                            {d.months === 1 ? "Monthly" : `${d.months} Mo`}
                          </span>
                        </div>
                        <span className="price-amount">
                          ₹{d.price.toLocaleString("en-IN")}
                        </span>
                      </div>
                    ))
                  )}
                </div>
                {plan.user_cap != null ||
                plan.storage_quota_gb != null ||
                plan.api_calls_per_month != null ||
                plan.active_subscriptions_count != null ? (
                  <dl className="plan-card__meta">
                    {plan.user_cap != null ? (
                      <>
                        <dt>User cap</dt>
                        <dd>{plan.user_cap}</dd>
                      </>
                    ) : null}
                    {plan.storage_quota_gb != null ? (
                      <>
                        <dt>Storage</dt>
                        <dd>{plan.storage_quota_gb} GB</dd>
                      </>
                    ) : null}
                    {plan.api_calls_per_month != null ? (
                      <>
                        <dt>API / mo</dt>
                        <dd>
                          {plan.api_calls_per_month.toLocaleString("en-IN")}
                        </dd>
                      </>
                    ) : null}
                    {plan.active_subscriptions_count != null ? (
                      <>
                        <dt>Active subs</dt>
                        <dd>{plan.active_subscriptions_count}</dd>
                      </>
                    ) : null}
                  </dl>
                ) : null}
              </div>

              <div className="plan-features-section">
                <span className="feature-title">Tier Benefits</span>
                <ul className="feature-list">
                  {plan.features.map((f: string, i: number) => (
                    <li key={i}>
                      <span className="feature-list__check" aria-hidden>
                        <Check size={13} strokeWidth={2.75} />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="plan-actions">
                <button
                  type="button"
                  className="plan-actions__edit"
                  onClick={() =>
                    router.push(`/subscriptions/details?id=${plan.id}`)
                  }
                >
                  <Edit2 size={16} strokeWidth={2} />
                  Edit Tier
                </button>
                <button
                  type="button"
                  className="plan-actions__delete"
                  title="Remove tier"
                  aria-label="Remove tier"
                >
                  <Trash2 size={17} strokeWidth={2} />
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
