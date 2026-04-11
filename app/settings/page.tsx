"use client";
import React, { useCallback, useEffect, useState } from "react";
import {
  Globe,
  Mail,
  Shield,
  Database,
  CreditCard,
  Key,
  Save,
  MessageSquare,
  Lock,
  ToggleLeft,
  ToggleRight,
  Tag,
  Loader2,
} from "lucide-react";
import {
  createLeadLabel,
  listLeadLabels,
  type LeadLabel,
} from "@/utils/leadLabels";
import "../dashboard/Dashboard.css";
import "./Settings.css";
import { useToast } from "@/components/ToastProvider";

type SettingsSection = "general" | "labels";

function labelBadgeStyle(color: string): React.CSSProperties {
  const c = color?.trim() || "#6366f1";
  return {
    backgroundColor: `${c}22`,
    color: c,
    border: `1px solid ${c}44`,
  };
}

/** Pick readable foreground on a solid hex background */
function contrastTextForHex(hex: string): string {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) {
    h = h
      .split("")
      .map((ch) => ch + ch)
      .join("");
  }
  if (h.length !== 6) return "#ffffff";
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return "#ffffff";
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? "#111827" : "#ffffff";
}

function createLabelButtonStyle(
  hex: string,
  opts: { emptyName: boolean; creating: boolean },
): React.CSSProperties {
  if (opts.emptyName) {
    return {
      background: "var(--border, #e5e7eb)",
      color: "var(--text-muted, #6b7280)",
      cursor: "not-allowed",
      border: "1px solid var(--border, #e5e7eb)",
    };
  }
  const c = hex?.trim() || "#6366f1";
  return {
    backgroundColor: c,
    color: contrastTextForHex(c),
    border: `1px solid ${c}`,
    fontWeight: 600,
    cursor: opts.creating ? "wait" : "pointer",
    opacity: opts.creating ? 0.88 : 1,
  };
}

export default function SettingsPage() {
  const toast = useToast();
  const [section, setSection] = useState<SettingsSection>("general");
  const [labels, setLabels] = useState<LeadLabel[]>([]);
  const [labelsLoading, setLabelsLoading] = useState(false);
  const [labelsError, setLabelsError] = useState<string | null>(null);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("#6366f1");
  const [creating, setCreating] = useState(false);

  const handleSaveChanges = () => {
    toast.success("System settings updated successfully.");
  };

  const loadLabels = useCallback(async () => {
    setLabelsLoading(true);
    setLabelsError(null);
    try {
      const list = await listLeadLabels(includeInactive);
      setLabels(list);
    } catch (e) {
      setLabelsError(e instanceof Error ? e.message : "Failed to load labels");
      setLabels([]);
    } finally {
      setLabelsLoading(false);
    }
  }, [includeInactive]);

  useEffect(() => {
    if (section !== "labels") return;
    void loadLabels();
  }, [section, loadLabels]);

  const handleCreateLabel = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newLabelName.trim();
    if (!name) return;
    setCreating(true);
    setLabelsError(null);
    try {
      const created = await createLeadLabel({
        label_name: name,
        color: newLabelColor.trim() || "#6366f1",
      });
      setLabels((prev) => {
        const withoutDup = prev.filter((x) => x.id !== created.id);
        return [created, ...withoutDup];
      });
      setNewLabelName("");
    } catch (err) {
      setLabelsError(
        err instanceof Error ? err.message : "Failed to create label",
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="page-container settings-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">System Settings</h1>
          <p className="page-subtitle">
            Configure global platform parameters, API integrations, and
            security.
          </p>
        </div>
        {section === "general" && (
          <button
            className="btn btn-primary"
            onClick={handleSaveChanges}
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
            type="button"
          >
            <Save size={18} />
            <span>Save Changes</span>
          </button>
        )}
      </div>

      <div className="settings-grid">
        <aside className="settings-nav">
          <button
            type="button"
            className={`settings-nav-item${section === "general" ? " active" : ""}`}
            onClick={() => setSection("general")}
          >
            <Globe size={18} /> General
          </button>
          <button
            type="button"
            className={`settings-nav-item${section === "labels" ? " active" : ""}`}
            onClick={() => setSection("labels")}
          >
            <Tag size={18} /> Labels
          </button>
          <button type="button" className="settings-nav-item">
            <Shield size={18} /> Security
          </button>
          <button type="button" className="settings-nav-item">
            <CreditCard size={18} /> Billing Keys
          </button>
          <button type="button" className="settings-nav-item">
            <Mail size={18} /> SMTP Config
          </button>
          <button type="button" className="settings-nav-item">
            <MessageSquare size={18} /> WhatsApp API
          </button>
          <button type="button" className="settings-nav-item">
            <Database size={18} /> Feature Flags
          </button>
        </aside>

        <main className="settings-content">
          {section === "general" && (
            <>
              <div className="card settings-card">
                <h3
                  className="card-title"
                  style={{ marginBottom: "24px" }}
                >
                  Global Application Config
                </h3>

                <div className="form-group">
                  <label className="form-label">Application Name</label>
                  <input className="form-input" defaultValue="Ayka Central" />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Support Email</label>
                    <input
                      className="form-input"
                      defaultValue="support@ayka.com"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Default Currency</label>
                    <select className="form-input">
                      <option>USD ($)</option>
                      <option>INR (₹)</option>
                      <option>EUR (€)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Trial Period (Days)</label>
                  <input
                    className="form-input"
                    type="number"
                    defaultValue="14"
                  />
                </div>
              </div>

              <div
                className="card settings-card"
                style={{ marginTop: "24px" }}
              >
                <h3
                  className="card-title"
                  style={{ marginBottom: "24px" }}
                >
                  API Integrations (Keys)
                </h3>

                <div className="form-group">
                  <label className="form-label">Razorpay Key ID</label>
                  <div className="input-with-icon">
                    <Key size={16} />
                    <input
                      className="form-input"
                      value="rzp_test_921098..."
                      disabled
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Stripe Secret</label>
                  <div className="input-with-icon">
                    <Lock size={16} />
                    <input
                      className="form-input"
                      type="password"
                      value="sk_test_9210982309812..."
                      disabled
                    />
                  </div>
                  <p className="form-help">
                    Keys are masked for security. Click &apos;Edit&apos; to
                    change.
                  </p>
                </div>
              </div>

              <div
                className="card settings-card"
                style={{ marginTop: "24px" }}
              >
                <h3
                  className="card-title"
                  style={{ marginBottom: "24px" }}
                >
                  Platform Feature Flags
                </h3>
                <div className="feature-toggle-list">
                  <div className="toggle-item">
                    <div className="toggle-info">
                      <span className="toggle-name">
                        Global WhatsApp Notifications
                      </span>
                      <p className="toggle-desc">
                        Enable or disable WhatsApp API for all clinics across
                        the platform.
                      </p>
                    </div>
                    <ToggleRight
                      size={32}
                      color="var(--primary)"
                      style={{ cursor: "pointer" }}
                    />
                  </div>
                  <div className="toggle-item">
                    <div className="toggle-info">
                      <span className="toggle-name">
                        Beta: AI Diagnosis Suggestions
                      </span>
                      <p className="toggle-desc">
                        Limited rollout of AI diagnosis engine for clinical
                        trials.
                      </p>
                    </div>
                    <ToggleLeft
                      size={32}
                      color="var(--text-subtle)"
                      style={{ cursor: "pointer" }}
                    />
                  </div>
                  <div className="toggle-item">
                    <div className="toggle-info">
                      <span className="toggle-name">
                        Self-Hosted Backups
                      </span>
                      <p className="toggle-desc">
                        Allow clinics to backup data to their own storage
                        providers.
                      </p>
                    </div>
                    <ToggleRight
                      size={32}
                      color="var(--primary)"
                      style={{ cursor: "pointer" }}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {section === "labels" && (
            <div className="card settings-card">
              <h3 className="card-title" style={{ marginBottom: "8px" }}>
                Lead labels
              </h3>
              

              {labelsError && (
                <div className="settings-labels-error" role="alert">
                  {labelsError}
                </div>
              )}

              <form onSubmit={handleCreateLabel} className="settings-labels-toolbar">
                <div className="form-group">
                  <label className="form-label" htmlFor="new-label-name">
                    New label name
                  </label>
                  <input
                    id="new-label-name"
                    className="form-input"
                    value={newLabelName}
                    onChange={(ev) => setNewLabelName(ev.target.value)}
                    placeholder="e.g. Hot lead"
                    autoComplete="off"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="new-label-color">
                    Badge color
                  </label>
                  <div className="settings-labels-color">
                    <input
                      id="new-label-color"
                      type="color"
                      value={newLabelColor}
                      onChange={(ev) => setNewLabelColor(ev.target.value)}
                      aria-label="Label color"
                    />
                    <input
                      className="form-input"
                      value={newLabelColor}
                      onChange={(ev) => setNewLabelColor(ev.target.value)}
                      placeholder="#6366f1"
                      style={{ maxWidth: "120px" }}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="btn settings-create-label-btn"
                  disabled={creating || !newLabelName.trim()}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    height: "42px",
                    ...createLabelButtonStyle(newLabelColor, {
                      emptyName: !newLabelName.trim(),
                      creating,
                    }),
                  }}
                >
                  {creating ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Tag size={18} />
                  )}
                  <span>Create label</span>
                </button>
              </form>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  marginBottom: "16px",
                }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "14px",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={includeInactive}
                    onChange={(ev) => setIncludeInactive(ev.target.checked)}
                  />
                  Include inactive labels
                </label>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => void loadLabels()}
                  disabled={labelsLoading}
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  {labelsLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : null}
                  Refresh list
                </button>
              </div>

              {labelsLoading && labels.length === 0 ? (
                <div
                  className="settings-labels-empty"
                  style={{ display: "flex", justifyContent: "center" }}
                >
                  <Loader2 size={28} className="animate-spin" />
                </div>
              ) : labels.length === 0 ? (
                <div className="settings-labels-empty">
                  No labels yet. Create one above or adjust filters.
                </div>
              ) : (
                <div className="settings-labels-table-wrap">
                  <table className="settings-labels-table">
                    <thead>
                      <tr>
                        <th>Label</th>
                        <th>Status</th>
                        <th>Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {labels.map((row) => (
                        <tr key={row.id}>
                          <td>
                            <span
                              className="settings-label-badge"
                              style={labelBadgeStyle(row.color)}
                            >
                              {row.label_name}
                            </span>
                          </td>
                          <td>
                            {row.is_active ? (
                              <span style={{ color: "#059669" }}>Active</span>
                            ) : (
                              <span style={{ color: "var(--text-muted)" }}>
                                Inactive
                              </span>
                            )}
                          </td>
                          <td style={{ color: "var(--text-muted)" }}>
                            {row.created_at
                              ? new Date(row.created_at).toLocaleString()
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
