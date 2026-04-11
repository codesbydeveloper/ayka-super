"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Package,
  ArrowLeft,
  Save,
  Loader2,
  Zap,
  Check,
  Plus,
  ShieldCheck,
  Database,
  Trash2,
  Globe,
  Power,
} from "lucide-react";
import { api } from "@/utils/api";
import { useToast } from "@/components/ToastProvider";
import { useConfirm } from "@/components/ConfirmDialog";
import {
  parseAddonSinglePayload,
  findAddonInListPayload,
  type AddonDisplay,
} from "@/utils/addonServices";
import "../Subscriptions.css";

const ADDON_LIST_URL =
  "/api/v1/super-admin/addon-services?include_inactive=true&featured_only=false";

function AddonDetailsView({ addonId }: { addonId: string }) {
  const router = useRouter();
  const toast = useToast();
  const askConfirm = useConfirm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [addon, setAddon] = useState({
    name: "",
    description: "",
    monthly_price: 0,
    offer_price: 0,
    badge: "",
    features: [""] as string[],
    icon: "",
    is_active: true,
    is_featured: false,
  });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        let parsed: AddonDisplay | null = null;
        try {
          const one = await api.get<Record<string, unknown>>(
            `/api/v1/super-admin/addon-services/${addonId}`,
          );
          parsed = parseAddonSinglePayload(one);
        } catch {
          const list = await api.get<Record<string, unknown>>(ADDON_LIST_URL);
          parsed = findAddonInListPayload(list, addonId) ?? null;
        }
        if (cancelled) return;
        if (!parsed) {
          toast.error("Add-on not found.");
          router.push("/subscriptions?category=addon");
          return;
        }
        setAddon({
          name: parsed.name,
          description: parsed.description,
          monthly_price: parsed.monthly_price,
          offer_price: parsed.offer_price,
          badge: parsed.badge,
          features: parsed.features.length > 0 ? parsed.features : [""],
          icon: parsed.icon,
          is_active: parsed.is_active,
          is_featured: parsed.is_featured,
        });
      } catch (err: unknown) {
        if (!cancelled) {
          toast.error(
            err instanceof Error ? err.message : "Could not load this add-on.",
          );
          router.push("/subscriptions?category=addon");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [addonId, router, toast]);

  const handleAddonFeatureChange = (index: number, value: string) => {
    setAddon((a) => {
      const next = [...a.features];
      next[index] = value;
      return { ...a, features: next };
    });
  };

  const handleAddonAddFeature = () =>
    setAddon((a) => ({ ...a, features: [...a.features, ""] }));

  const handleAddonRemoveFeature = (index: number) =>
    setAddon((a) => ({
      ...a,
      features: a.features.filter((_, i) => i !== index),
    }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const filteredFeatures = addon.features.map((f) => f.trim()).filter(Boolean);
    if (!addon.name.trim()) {
      toast.error("Name is required.");
      return;
    }
    if (filteredFeatures.length === 0) {
      toast.error("Add at least one feature.");
      return;
    }
    const payload = {
      name: addon.name.trim(),
      description: addon.description.trim(),
      monthly_price: Number(addon.monthly_price),
      offer_price: Number(addon.offer_price),
      badge: addon.badge.trim(),
      features: filteredFeatures,
      icon: addon.icon.trim() || "package",
      is_active: addon.is_active,
      is_featured: addon.is_featured,
    };
    setSaving(true);
    try {
      const result = await api.put<{ success?: boolean; message?: string }>(
        `/api/v1/super-admin/addon-services/${addonId}`,
        payload,
      );
      if (result.success === false) {
        toast.error(result.message || "Failed to update add-on.");
        return;
      }
      router.push("/subscriptions?category=addon");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error updating add-on.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const ok = await askConfirm({
      title: "Delete add-on?",
      message: "This permanently removes this add-on from the catalog.",
      variant: "danger",
      confirmLabel: "Delete",
    });
    if (!ok) return;
    setDeleting(true);
    try {
      const result = await api.delete<{ success?: boolean; message?: string }>(
        `/api/v1/super-admin/addon-services/${addonId}`,
      );
      if (result.success === false) {
        toast.error(result.message || "Failed to delete add-on.");
        return;
      }
      router.push("/subscriptions?category=addon");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error deleting add-on.");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container subscriptions-page flex-center">
        <Loader2
          size={40}
          className="animate-spin"
          style={{ color: "#2A4638" }}
        />
        <p>Loading add-on…</p>
      </div>
    );
  }

  return (
    <div className="page-container subscriptions-page">
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => router.push("/subscriptions?category=addon")}
            style={{ padding: "9px 14px" }}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="page-title">Edit Add-on Service</h1>
            <p className="page-subtitle">
              Update {addon.name || "this add-on"} for the catalog.
            </p>
          </div>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleDelete}
          style={{ color: "#ef4444", borderColor: "rgba(239, 68, 68, 0.2)" }}
          disabled={deleting}
        >
          {deleting ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Trash2 size={18} />
          )}
          <span>Delete add-on</span>
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 0.8fr",
            gap: 32,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div className="card" style={{ padding: 28 }}>
              <h3
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: "#111827",
                  marginBottom: 24,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <Package size={20} style={{ color: "#2A4638" }} />
                Add-on details &amp; pricing
              </h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 20,
                }}
              >
                <div className="form-group" style={{ gridColumn: "span 2" }}>
                  <label className="form-label">Name</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    value={addon.name}
                    onChange={(e) =>
                      setAddon({ ...addon, name: e.target.value })
                    }
                  />
                </div>
                <div className="form-group" style={{ gridColumn: "span 2" }}>
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    value={addon.description}
                    onChange={(e) =>
                      setAddon({ ...addon, description: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Monthly price (₹)</label>
                  <input
                    type="number"
                    className="form-input"
                    required
                    min={0}
                    step="0.01"
                    value={addon.monthly_price}
                    onChange={(e) =>
                      setAddon({
                        ...addon,
                        monthly_price: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Offer price (₹)</label>
                  <input
                    type="number"
                    className="form-input"
                    required
                    min={0}
                    step="0.01"
                    value={addon.offer_price}
                    onChange={(e) =>
                      setAddon({
                        ...addon,
                        offer_price: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Badge</label>
                  <input
                    type="text"
                    className="form-input"
                    value={addon.badge}
                    onChange={(e) =>
                      setAddon({ ...addon, badge: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Icon key</label>
                  <input
                    type="text"
                    className="form-input"
                    value={addon.icon}
                    onChange={(e) =>
                      setAddon({ ...addon, icon: e.target.value })
                    }
                    placeholder="e.g. whatsapp"
                  />
                </div>
              </div>
            </div>
            <div className="card" style={{ padding: 28 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 24,
                }}
              >
                <h3
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: "#111827",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <ShieldCheck size={20} style={{ color: "#10b981" }} />
                  Features
                </h3>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleAddonAddFeature}
                  style={{ fontSize: 13, padding: "4px 12px" }}
                >
                  <Plus size={14} /> Add feature
                </button>
              </div>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {addon.features.map((feature, index) => (
                  <div key={index} style={{ display: "flex", gap: 10 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 40,
                        height: 40,
                        borderRadius: 8,
                        background: "#f8fafc",
                        color: "#10b981",
                        flexShrink: 0,
                      }}
                    >
                      <Check size={18} />
                    </div>
                    <input
                      type="text"
                      className="form-input"
                      value={feature}
                      onChange={(e) =>
                        handleAddonFeatureChange(index, e.target.value)
                      }
                    />
                    {addon.features.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => handleAddonRemoveFeature(index)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#ef4444",
                          padding: "0 8px",
                          cursor: "pointer",
                        }}
                      >
                        <Plus size={18} style={{ transform: "rotate(45deg)" }} />
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div className="card" style={{ padding: 28 }}>
              <h3
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: "#111827",
                  marginBottom: 24,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <Globe size={20} style={{ color: "#f59e0b" }} />
                Visibility
              </h3>
              <label
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <span>Active</span>
                <input
                  type="checkbox"
                  checked={addon.is_active}
                  onChange={(e) =>
                    setAddon({ ...addon, is_active: e.target.checked })
                  }
                />
              </label>
              <label
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>Featured</span>
                <input
                  type="checkbox"
                  checked={addon.is_featured}
                  onChange={(e) =>
                    setAddon({ ...addon, is_featured: e.target.checked })
                  }
                />
              </label>
            </div>
            <div
              style={{ display: "flex", flexDirection: "column", gap: 12 }}
            >
              <button
                type="submit"
                className="btn btn-primary"
                style={{
                  width: "100%",
                  padding: "14px",
                  fontSize: 16,
                  fontWeight: 800,
                }}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <Save size={20} />
                )}
                <span>{saving ? "Saving…" : "Update add-on"}</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => router.push("/subscriptions?category=addon")}
                style={{ width: "100%", padding: "14px" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

function PlanDetailsView({ planId }: { planId: string }) {
  const router = useRouter();
  const toast = useToast();
  const askConfirm = useConfirm();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activating, setActivating] = useState(false);
  const [plan, setPlan] = useState({
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

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const result = await api.get(
          `/api/v1/super-admin/subscription/plans/${planId}`,
        );
        if (result.success && result.data) {
          const d = result.data as Record<string, unknown>;
          setPlan({
            name: (d.name as string) || "",
            monthly: (d.monthly as number) || 0,
            quarterly: (d.quarterly as number) ?? 0,
            half_yearly: (d.half_yearly as number) ?? 0,
            yearly: (d.yearly as number) || 0,
            badge: (d.badge as string) || "",
            features:
              Array.isArray(d.features) && d.features.length > 0
                ? (d.features as string[])
                : [""],
            user_cap: (d.user_cap as number) || 5,
            storage_quota_gb: (d.storage_quota_gb as number) || 10,
            api_calls_per_month: (d.api_calls_per_month as number) || 10000,
            is_active: (d.is_active as boolean) ?? true,
          });
        }
      } catch (err) {
        console.error("Failed to fetch plan", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPlan();
  }, [planId]);

  const handleAddFeature = () =>
    setPlan({ ...plan, features: [...plan.features, ""] });
  const handleRemoveFeature = (index: number) =>
    setPlan({
      ...plan,
      features: plan.features.filter((_, i) => i !== index),
    });
  const handleFeatureChange = (index: number, value: string) => {
    const newFeatures = [...plan.features];
    newFeatures[index] = value;
    setPlan({ ...plan, features: newFeatures });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const filteredFeatures = plan.features.filter((f) => f.trim() !== "");
      const result = await api.put(
        `/api/v1/super-admin/subscription/plans/${planId}`,
        { ...plan, features: filteredFeatures },
      );
      if (result.success) router.push("/subscriptions");
      else toast.error(result.message || "Failed to update plan");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error updating plan");
    } finally {
      setSaving(false);
    }
  };

  const handleActivatePlan = async () => {
    setActivating(true);
    try {
      const result = await api.put<{ success?: boolean; message?: string }>(
        `/api/v1/super-admin/subscription/plans/${planId}`,
        { is_active: true },
      );
      if (result.success === false) {
        alert(result.message || "Could not activate plan.");
        return;
      }
      setPlan((p) => ({ ...p, is_active: true }));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Could not activate plan.");
    } finally {
      setActivating(false);
    }
  };

  const handleDelete = async () => {
    const ok = await askConfirm({
      title: "Delete subscription tier?",
      message:
        "This permanently removes this plan from the platform. This cannot be undone.",
      variant: "danger",
      confirmLabel: "Delete",
    });
    if (!ok) return;
    setDeleting(true);
    try {
      const result = await api.delete(
        `/api/v1/super-admin/subscription/plans/${planId}`,
      );
      if (result.success) router.push("/subscriptions");
      else toast.error(result.message || "Failed to delete plan");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error deleting plan");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container subscriptions-page flex-center">
        <Loader2
          size={40}
          className="animate-spin"
          style={{ color: "#2A4638" }}
        />
        <p>Fetching tier configuration...</p>
      </div>
    );
  }

  return (
    <div className="page-container subscriptions-page">
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => router.push("/subscriptions")}
            style={{ padding: "9px 14px" }}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="page-title">Edit Subscription Tier</h1>
            <p className="page-subtitle">
              Modify parameters for the {plan.name} configuration.
            </p>
          </div>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleDelete}
          style={{ color: "#ef4444", borderColor: "rgba(239, 68, 68, 0.2)" }}
          disabled={deleting}
        >
          {deleting ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Trash2 size={18} />
          )}
          <span>Delete Tier</span>
        </button>
      </div>

      {!plan.is_active ? (
        <div
          className="card"
          style={{
            marginBottom: 24,
            padding: "16px 20px",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            background: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: 12,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <p
              style={{
                margin: 0,
                fontWeight: 700,
                color: "#92400e",
                fontSize: 15,
              }}
            >
              This tier is inactive
            </p>
            <p style={{ margin: "6px 0 0", fontSize: 14, color: "#b45309" }}>
              It is hidden from new subscriptions until you activate it.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void handleActivatePlan()}
            disabled={activating}
            style={{
              flexShrink: 0,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {activating ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Power size={18} />
            )}
            <span>{activating ? "Activating…" : "Activate plan"}</span>
          </button>
        </div>
      ) : null}

      <form onSubmit={handleSubmit}>
        <div
          style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 32 }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div className="card" style={{ padding: 28 }}>
              <h3
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: "#111827",
                  marginBottom: 24,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <Zap size={20} style={{ color: "#2A4638" }} />
                Tier Identity & Pricing
              </h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 20,
                }}
              >
                <div className="form-group" style={{ gridColumn: "span 2" }}>
                  <label className="form-label">Tier Name</label>
                  <input
                    type="text"
                    className="form-input"
                    readOnly
                    value={plan.name}
                    style={{
                      fontWeight: 800,
                      fontSize: "1.1rem",
                      letterSpacing: "0.05em",
                      background: "#f1f5f9",
                      cursor: "not-allowed",
                    }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Monthly Price (₹)</label>
                  <input
                    type="number"
                    className="form-input"
                    required
                    min={0}
                    value={plan.monthly}
                    onChange={(e) =>
                      setPlan({ ...plan, monthly: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Quarterly Price (₹)</label>
                  <input
                    type="number"
                    className="form-input"
                    required
                    min={0}
                    value={plan.quarterly}
                    onChange={(e) =>
                      setPlan({ ...plan, quarterly: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Half-yearly Price (₹)</label>
                  <input
                    type="number"
                    className="form-input"
                    required
                    min={0}
                    value={plan.half_yearly}
                    onChange={(e) =>
                      setPlan({ ...plan, half_yearly: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Yearly Price (₹)</label>
                  <input
                    type="number"
                    className="form-input"
                    required
                    min={0}
                    value={plan.yearly}
                    onChange={(e) =>
                      setPlan({ ...plan, yearly: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="form-group" style={{ gridColumn: "span 2" }}>
                  <label className="form-label">Highlight Badge</label>
                  <input
                    type="text"
                    className="form-input"
                    value={plan.badge}
                    onChange={(e) =>
                      setPlan({ ...plan, badge: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
            <div className="card" style={{ padding: 28 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 24,
                }}
              >
                <h3
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: "#111827",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <ShieldCheck size={20} style={{ color: "#10b981" }} />
                  Feature Lists
                </h3>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleAddFeature}
                  style={{ fontSize: 13, padding: "4px 12px" }}
                >
                  <Plus size={14} /> Add Feature
                </button>
              </div>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {plan.features.map((feature, index) => (
                  <div key={index} style={{ display: "flex", gap: 10 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 40,
                        height: 40,
                        borderRadius: 8,
                        background: "#f8fafc",
                        color: "#10b981",
                        flexShrink: 0,
                      }}
                    >
                      <Check size={18} />
                    </div>
                    <input
                      type="text"
                      className="form-input"
                      value={feature}
                      onChange={(e) =>
                        handleFeatureChange(index, e.target.value)
                      }
                      required
                    />
                    {plan.features.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => handleRemoveFeature(index)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#ef4444",
                          padding: "0 8px",
                          cursor: "pointer",
                        }}
                      >
                        <Plus size={18} style={{ transform: "rotate(45deg)" }} />
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div className="card" style={{ padding: 28 }}>
              <h3
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: "#111827",
                  marginBottom: 24,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <Database size={20} style={{ color: "#3b82f6" }} />
                Resource Quotas
              </h3>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 18 }}
              >
                <div className="form-group">
                  <label
                    className="form-label"
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <span>User Capacity</span>
                    <span style={{ color: "#3b82f6", fontWeight: 700 }}>
                      {plan.user_cap} Users
                    </span>
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={100}
                    className="form-input"
                    value={plan.user_cap}
                    onChange={(e) =>
                      setPlan({ ...plan, user_cap: Number(e.target.value) })
                    }
                    style={{ padding: "8px 0", cursor: "pointer" }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Storage Quota (GB)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={plan.storage_quota_gb}
                    onChange={(e) =>
                      setPlan({
                        ...plan,
                        storage_quota_gb: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">API Calls per Month</label>
                  <input
                    type="number"
                    className="form-input"
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
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <button
                type="submit"
                className="btn btn-primary"
                style={{
                  width: "100%",
                  padding: "14px",
                  fontSize: 16,
                  fontWeight: 800,
                }}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <Save size={20} />
                )}
                <span>{saving ? "Saving..." : "Update Tier"}</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => router.push("/subscriptions")}
                style={{ width: "100%", padding: "14px" }}
              >
                Cancel Changes
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

function SubscriptionDetailsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const isAddon = searchParams.get("kind") === "addon";

  if (isAddon) {
    if (!id) {
      return (
        <div
          className="page-container subscriptions-page flex-center"
          style={{ flexDirection: "column", gap: 16 }}
        >
          <p>Missing add-on id.</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => router.push("/subscriptions?category=addon")}
          >
            Back to add-ons
          </button>
        </div>
      );
    }
    return <AddonDetailsView addonId={id} />;
  }

  if (!id) {
    return (
      <div
        className="page-container subscriptions-page flex-center"
        style={{ flexDirection: "column", gap: 16 }}
      >
        <p>Missing plan id.</p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => router.push("/subscriptions")}
        >
          Back to subscriptions
        </button>
      </div>
    );
  }

  return <PlanDetailsView planId={id} />;
}

export default function ClientComponent() {
  return (
    <Suspense
      fallback={
        <div className="page-container flex-center">
          <Loader2 className="animate-spin" />
        </div>
      }
    >
      <SubscriptionDetailsContent />
    </Suspense>
  );
}
