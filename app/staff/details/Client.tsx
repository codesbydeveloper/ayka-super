"use client";
import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Loader2,
  ShieldCheck,
  Globe,
  UserCheck,
  Activity,
  BarChart3,
  Trash2,
  Edit2,
} from "lucide-react";
import { api } from "@/utils/api";
import "../../dashboard/Dashboard.css";
import "../Staff.css";

/** PUT /api/v1/admin-staff-management/staff/{staff_id} — permissions shape */
type UpdateStaffPermissions = {
  can_view_clinics: boolean;
  can_edit_clinics: boolean;
  can_delete_clinics: boolean;
  can_view_doctors: boolean;
  can_edit_doctors: boolean;
  can_view_patients: boolean;
  can_view_appointments: boolean;
  can_edit_appointments: boolean;
  can_view_payments: boolean;
  can_view_subscriptions: boolean;
  can_view_staff: boolean;
  can_edit_staff: boolean;
  can_view_analytics: boolean;
};

const DEFAULT_UPDATE_PERMISSIONS: UpdateStaffPermissions = {
  can_view_clinics: false,
  can_edit_clinics: false,
  can_delete_clinics: false,
  can_view_doctors: false,
  can_edit_doctors: false,
  can_view_patients: false,
  can_view_appointments: false,
  can_edit_appointments: false,
  can_view_payments: false,
  can_view_subscriptions: false,
  can_view_staff: false,
  can_edit_staff: false,
  can_view_analytics: false,
};

const STAFF_ROLE_OPTIONS = [
  "Executive",
  "Manager",
  "L1",
  "L2",
  "L3",
  "L4",
  "L5",
] as const;

function mergePermissions(
  fromApi?: Record<string, boolean>,
): UpdateStaffPermissions {
  const base = { ...DEFAULT_UPDATE_PERMISSIONS };
  if (!fromApi) return base;
  for (const key of Object.keys(
    DEFAULT_UPDATE_PERMISSIONS,
  ) as (keyof UpdateStaffPermissions)[]) {
    if (typeof fromApi[key] === "boolean") base[key] = fromApi[key] as boolean;
  }
  return base;
}

type StaffDetailFormState = {
  name: string;
  email: string;
  username: string;
  phone_number: string;
  password: string;
  designation: string;
  role: string;
  department: string;
  notes: string;
  geographic_access: { states: string[]; cities: string[] };
  permissions: UpdateStaffPermissions;
  is_active: boolean;
};

type StaffDetailExtras = {
  activity_statistics?: Record<string, unknown>;
};

const emptyForm: StaffDetailFormState = {
  name: "",
  email: "",
  username: "",
  phone_number: "",
  password: "",
  designation: "Company Employee",
  role: STAFF_ROLE_OPTIONS[0],
  department: "",
  notes: "",
  geographic_access: { states: [], cities: [] },
  permissions: { ...DEFAULT_UPDATE_PERMISSIONS },
  is_active: true,
};

function buildUpdateStaffPayload(
  form: StaffDetailFormState,
): Record<string, unknown> {
  const states = form.geographic_access.states
    .map((s) => s.trim())
    .filter(Boolean);
  const cities = form.geographic_access.cities
    .map((c) => c.trim())
    .filter(Boolean);
  const body: Record<string, unknown> = {
    name: form.name.trim(),
    email: form.email.trim(),
    phone_number: form.phone_number.replace(/\s/g, ""),
    role: form.role.trim() || STAFF_ROLE_OPTIONS[0],
    designation: form.designation.trim(),
    department: form.department.trim(),
    geographic_access: { states, cities },
    permissions: { ...form.permissions },
    is_active: form.is_active,
  };
  const notes = form.notes.trim();
  if (notes) body.notes = notes;
  const pw = form.password.trim();
  if (pw) body.password = pw;
  return body;
}

function asRecord(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

/** First element if array of objects; otherwise the object. */
function arrayFirstRecord(v: unknown): Record<string, unknown> | null {
  if (Array.isArray(v)) {
    for (const item of v) {
      const r = asRecord(item);
      if (r) return r;
    }
    return null;
  }
  return asRecord(v);
}

function looksLikeStaffRow(r: Record<string, unknown>): boolean {
  if (typeof r.name === "string" && r.name.trim()) return true;
  if (typeof r.full_name === "string" && r.full_name.trim()) return true;
  if (typeof r.email === "string" && r.email.includes("@")) return true;
  if (typeof r.user_email === "string" && r.user_email.includes("@")) return true;
  if (typeof r.phone_number === "string" && r.phone_number.trim()) return true;
  if (typeof r.phone === "string" && r.phone.trim()) return true;
  if (typeof r.mobile === "string" && r.mobile.trim()) return true;
  return false;
}

/**
 * Handles common API envelopes: { data }, { data: { staff } }, { staff }, arrays, etc.
 */
function unwrapStaffDetailPayload(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;

  const tryCandidate = (v: unknown): Record<string, unknown> | null => {
    const direct = asRecord(v);
    if (direct && looksLikeStaffRow(direct)) return direct;
    const fromArr = arrayFirstRecord(v);
    if (fromArr && looksLikeStaffRow(fromArr)) return fromArr;
    return null;
  };

  const nestedKeys = [
    "staff",
    "user",
    "admin_staff",
    "admin",
    "result",
    "item",
    "record",
    "profile",
    "payload",
    "body",
  ] as const;

  const candidates: unknown[] = [p];

  const data = p.data;
  if (data !== undefined && data !== null) {
    candidates.push(data);
    const dataObj = asRecord(data);
    if (dataObj) {
      for (const k of nestedKeys) {
        if (dataObj[k] !== undefined) candidates.push(dataObj[k]);
      }
    }
  }

  for (const k of nestedKeys) {
    if (p[k] !== undefined) candidates.push(p[k]);
  }

  for (const c of candidates) {
    const hit = tryCandidate(c);
    if (hit) return hit;
  }

 
  const d = asRecord(p.data);
  if (d) {
    for (const v of Object.values(d)) {
      const hit = tryCandidate(v);
      if (hit) return hit;
    }
  }

  return null;
}

function pickString(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

/** Backend may send boolean, 0/1, or string flags. Default true when unknown. */
function parseStaffActiveFlag(v: unknown): boolean {
  if (v === false || v === 0 || v === "0" || v === "false" || v === "inactive")
    return false;
  if (v === true || v === 1 || v === "1" || v === "true" || v === "active")
    return true;
  return true;
}

function mapStaffDetailToFormAndExtras(
  core: Record<string, unknown>,
): { form: StaffDetailFormState; extras: StaffDetailExtras } {
  const geoRaw = core.geographic_access;
  let states: string[] = [];
  let cities: string[] = [];
  if (geoRaw && typeof geoRaw === "object" && !Array.isArray(geoRaw)) {
    const g = geoRaw as Record<string, unknown>;
    if (Array.isArray(g.states)) {
      states = g.states.filter((x): x is string => typeof x === "string");
    }
    if (Array.isArray(g.cities)) {
      cities = g.cities.filter((x): x is string => typeof x === "string");
    }
  }
  if (Array.isArray(core.accessible_states)) {
    states = core.accessible_states.filter((x): x is string => typeof x === "string");
  }
  if (Array.isArray(core.accessible_cities)) {
    cities = core.accessible_cities.filter((x): x is string => typeof x === "string");
  }

  const permRaw = core.permissions;
  const permissionsFromApi =
    permRaw && typeof permRaw === "object" && !Array.isArray(permRaw)
      ? (permRaw as Record<string, boolean>)
      : undefined;

  const activityRaw =
    core.activity_statistics ?? core.activity_stats ?? core.stats;
  const activity_statistics =
    activityRaw && typeof activityRaw === "object" && !Array.isArray(activityRaw)
      ? (activityRaw as Record<string, unknown>)
      : undefined;

  const name = pickString(
    core,
    "name",
    "full_name",
    "display_name",
    "staff_name",
  );
  const email = pickString(
    core,
    "email",
    "user_email",
    "mail",
    "email_address",
  );
  const usernameRaw = pickString(core, "username", "user_name", "login");
  const username =
    usernameRaw ||
    (email.includes("@") ? email.split("@")[0]! : "");

  const form: StaffDetailFormState = {
    name,
    email,
    username,
    phone_number: pickString(
      core,
      "phone_number",
      "phoneNumber",
      "phone",
      "mobile",
      "contact_number",
      "cell",
    ),
    password: "",
    designation: pickString(
      core,
      "designation",
      "title",
      "job_title",
      "position",
    ) || "Company Employee",
    role:
      pickString(core, "role", "staff_role", "access_role", "user_role") ||
      STAFF_ROLE_OPTIONS[0],
    department: pickString(
      core,
      "department",
      "dept",
      "division",
    ),
    notes: pickString(core, "notes", "note", "remarks", "comment"),
    geographic_access: { states, cities },
    permissions: mergePermissions(permissionsFromApi),
    is_active: parseStaffActiveFlag(core.is_active),
  };

  const extras: StaffDetailExtras = {
    activity_statistics,
  };

  return { form, extras };
}

function StaffDetailsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  /** Only `mode=edit` allows changes; `mode=view` or missing mode is read-only. */
  const canEdit = searchParams.get("mode") === "edit";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [formData, setFormData] = useState<StaffDetailFormState>(emptyForm);
  const [detailExtras, setDetailExtras] = useState<StaffDetailExtras | null>(
    null,
  );

  const fetchUser = useCallback(async () => {
    const staffId = (id ?? "").trim();
    if (!staffId) {
      setFetchError("Missing staff id.");
      setFormData(emptyForm);
      setDetailExtras(null);
      setLoading(false);
      return;
    }

    const bootstrapKey = `ayka_staff_detail_bootstrap_${staffId}`;

    setLoading(true);
    setFetchError(null);
    try {
      let result: Record<string, unknown> | null = null;
      if (typeof window !== "undefined") {
        try {
          const raw = sessionStorage.getItem(bootstrapKey);
          if (raw) {
            const parsed = JSON.parse(raw) as { at?: number; payload?: unknown };
            if (
              typeof parsed.at === "number" &&
              Date.now() - parsed.at < 15_000 &&
              parsed.payload &&
              typeof parsed.payload === "object" &&
              !Array.isArray(parsed.payload)
            ) {
              result = parsed.payload as Record<string, unknown>;
            }
          }
        } catch {
          /* ignore corrupt cache */
        }
        try {
          sessionStorage.removeItem(bootstrapKey);
        } catch {
          /* ignore */
        }
      }

      if (!result) {
        result = await api.get<Record<string, unknown>>(
          `/api/v1/admin-staff-management/staff/${encodeURIComponent(staffId)}`,
        );
      }

      const core = unwrapStaffDetailPayload(result);
      if (!core) {
        setFetchError("Could not read staff details from the response.");
        setFormData(emptyForm);
        setDetailExtras(null);
        return;
      }
      const { form, extras } = mapStaffDetailToFormAndExtras(core);
      if (!form.name && !form.email && !form.phone_number) {
        setFetchError(
          "Staff details were returned in an unexpected format (no name, email, or phone).",
        );
        setFormData(emptyForm);
        setDetailExtras(null);
        return;
      }
      setFormData(form);
      setDetailExtras(extras);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Could not load staff details.";
      setFetchError(message);
      setFormData(emptyForm);
      setDetailExtras(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchUser();
  }, [fetchUser]);

  const togglePermission = (key: keyof UpdateStaffPermissions) => {
    setFormData((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: !prev.permissions[key],
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    if (!id) return;
    setSaving(true);
    try {
      const payload = buildUpdateStaffPayload(formData);
      const result = await api.put(
        `/api/v1/admin-staff-management/staff/${encodeURIComponent(id.trim())}`,
        payload,
      );
      if (result && typeof result === "object" && result.success === false) {
        alert(
          typeof result.message === "string"
            ? result.message
            : "Update was not accepted.",
        );
        return;
      }
      alert("Staff updated successfully.");
      router.push("/staff");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Unable to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStaff = async () => {
    if (!canEdit) return;
    if (!id) return;
    if (
      !confirm(
        "Delete this staff member? Their account and activity logs will be removed.",
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      await api.delete(
        `/api/v1/admin-staff-management/staff/${encodeURIComponent(id.trim())}`,
      );
      router.push("/staff");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container flex-center">
        <Loader2 className="animate-spin" size={40} color="var(--primary)" />
        <p style={{ marginTop: "12px", fontWeight: 600 }}>
          Loading staff details…
        </p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="page-container" style={{ paddingTop: 24 }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => router.push("/staff")}
          style={{ marginBottom: 24, display: "inline-flex", alignItems: "center", gap: 8 }}
        >
          <ArrowLeft size={20} />
          Back to staff
        </button>
        <div className="card" style={{ padding: 32, maxWidth: 560 }}>
          <h1 className="page-title" style={{ fontSize: 20, marginBottom: 8 }}>
            Could not load staff
          </h1>
          <p style={{ color: "var(--text-muted, #64748b)", marginBottom: 20 }}>
            {fetchError}
          </p>
          {id ? (
            <button type="button" className="btn btn-primary" onClick={() => void fetchUser()}>
              Retry
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  const activityEntries = detailExtras?.activity_statistics
    ? Object.entries(detailExtras.activity_statistics)
    : [];

  const staffId = (id ?? "").trim();

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: "32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => router.push("/staff")}
            style={{ padding: "10px" }}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="page-title">
              {canEdit ? "Edit staff" : "View profile"}
            </h1>
            <p className="page-subtitle">
              {canEdit
                ? `Update profile and access for ${formData.name || "this member"}.`
                : `Read-only profile for ${formData.name || "this member"}. Use Edit to make changes.`}
            </p>
          </div>
        </div>
        <div className="header-actions" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          {!canEdit ? (
            <button
              type="button"
              className="btn btn-primary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 16px",
              }}
              onClick={() =>
                router.push(
                  `/staff/details?id=${encodeURIComponent(staffId)}&mode=edit`,
                )
              }
            >
              <Edit2 size={18} />
              <span>Edit profile</span>
            </button>
          ) : null}
          {canEdit ? (
            <button
              type="button"
              className="btn btn-secondary staff-card-icon-btn-danger"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 16px",
                borderColor: "#fecaca",
              }}
              disabled={deleting || saving}
              onClick={() => void handleDeleteStaff()}
            >
              {deleting ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <Trash2 size={18} />
              )}
              <span>Delete staff</span>
            </button>
          ) : null}
          <div
            style={{
              background: formData.is_active
                ? "var(--success-light)"
                : "var(--danger-light)",
              padding: "8px 16px",
              borderRadius: "12px",
              border: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: formData.is_active
                  ? "var(--success)"
                  : "var(--danger)",
              }}
            />
            <span
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: formData.is_active ? "var(--success)" : "var(--danger)",
              }}
            >
              {formData.is_active ? "ACTIVE" : "ACCESS REVOKED"}
            </span>
          </div>
        </div>
      </div>

      {activityEntries.length > 0 ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "20px",
            marginBottom: "28px",
          }}
        >
          <div className="card" style={{ padding: "24px" }}>
            <h3
              style={{
                fontSize: "14px",
                fontWeight: 800,
                marginBottom: "16px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                color: "#1e293b",
              }}
            >
              <BarChart3 size={18} color="var(--primary)" /> Activity statistics
            </h3>
            <dl
              style={{
                margin: 0,
                display: "grid",
                gap: "8px",
                fontSize: "13px",
              }}
            >
              {activityEntries.map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "12px",
                    borderBottom: "1px solid #f1f5f9",
                    paddingBottom: "6px",
                  }}
                >
                  <dt style={{ color: "#64748b", fontWeight: 600 }}>{k}</dt>
                  <dd style={{ margin: 0, color: "#1e293b", textAlign: "right" }}>
                    {v === null || v === undefined
                      ? "—"
                      : typeof v === "object"
                        ? JSON.stringify(v)
                        : String(v)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      ) : null}

      <form
        onSubmit={canEdit ? handleSubmit : (e) => e.preventDefault()}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 0.8fr",
            gap: "32px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div className="card" style={{ padding: "32px" }}>
              <h3
                style={{
                  fontSize: "16px",
                  fontWeight: 800,
                  marginBottom: "24px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <UserCheck size={20} color="var(--primary)" /> Profile
              </h3>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    className="form-input"
                    required={canEdit}
                    readOnly={!canEdit}
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    style={
                      !canEdit
                        ? { background: "#f8fafc", cursor: "default" }
                        : undefined
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    className="form-input"
                    required={canEdit}
                    readOnly={!canEdit}
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    style={
                      !canEdit
                        ? { background: "#f8fafc", cursor: "default" }
                        : undefined
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">System Username</label>
                  <input
                    type="text"
                    className="form-input"
                    readOnly
                    value={formData.username}
                    style={{
                      background: "var(--primary-light)",
                      cursor: "not-allowed",
                    }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Primary Contact</label>
                  <input
                    type="text"
                    className="form-input"
                    required={canEdit}
                    readOnly={!canEdit}
                    value={formData.phone_number}
                    onChange={(e) =>
                      setFormData({ ...formData, phone_number: e.target.value })
                    }
                    style={
                      !canEdit
                        ? { background: "#f8fafc", cursor: "default" }
                        : undefined
                    }
                  />
                </div>
                {canEdit ? (
                  <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                    <label className="form-label">New password (optional)</label>
                    <input
                      type="password"
                      className="form-input"
                      autoComplete="new-password"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      placeholder="Leave blank to keep current password"
                    />
                  </div>
                ) : null}
              </div>
            </div>

            <div className="card" style={{ padding: "32px" }}>
              <h3
                style={{
                  fontSize: "16px",
                  fontWeight: 800,
                  marginBottom: "24px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <Activity size={20} color="var(--primary)" /> Authority & roles
              </h3>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Designation</label>
                  <select
                    className="form-input"
                    disabled={!canEdit}
                    value={formData.designation}
                    onChange={(e) =>
                      setFormData({ ...formData, designation: e.target.value })
                    }
                  >
                    <option value="Company Employee">Company Employee</option>
                    <option value="State Franchise">State Franchise</option>
                    <option value="District Franchise">District Franchise</option>
                    <option value="City Franchise">City Franchise</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select
                    className="form-input"
                    disabled={!canEdit}
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({ ...formData, role: e.target.value })
                    }
                  >
                    {formData.role &&
                    !(STAFF_ROLE_OPTIONS as readonly string[]).includes(
                      formData.role,
                    ) ? (
                      <option value={formData.role}>{formData.role}</option>
                    ) : null}
                    {STAFF_ROLE_OPTIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div className="card" style={{ padding: "32px" }}>
              <h3
                style={{
                  fontSize: "16px",
                  fontWeight: 800,
                  marginBottom: "24px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <Globe size={20} color="var(--primary)" /> Access scope & notes
              </h3>
              <div className="form-group">
                <label className="form-label">Department</label>
                <input
                  type="text"
                  className="form-input"
                  readOnly={!canEdit}
                  value={formData.department}
                  onChange={(e) =>
                    setFormData({ ...formData, department: e.target.value })
                  }
                  style={
                    !canEdit
                      ? { background: "#f8fafc", cursor: "default" }
                      : undefined
                  }
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  Authorized states (comma-separated)
                </label>
                <input
                  type="text"
                  className="form-input"
                  readOnly={!canEdit}
                  value={formData.geographic_access.states.join(", ")}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      geographic_access: {
                        ...formData.geographic_access,
                        states: e.target.value
                          .split(/[;,]/)
                          .map((s) => s.trim())
                          .filter(Boolean),
                      },
                    })
                  }
                  placeholder="e.g. Maharashtra, Karnataka"
                  style={
                    !canEdit
                      ? { background: "#f8fafc", cursor: "default" }
                      : undefined
                  }
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  Authorized cities (comma-separated)
                </label>
                <input
                  type="text"
                  className="form-input"
                  readOnly={!canEdit}
                  value={formData.geographic_access.cities.join(", ")}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      geographic_access: {
                        ...formData.geographic_access,
                        cities: e.target.value
                          .split(/[;,]/)
                          .map((s) => s.trim())
                          .filter(Boolean),
                      },
                    })
                  }
                  placeholder="e.g. Mumbai, Pune"
                  style={
                    !canEdit
                      ? { background: "#f8fafc", cursor: "default" }
                      : undefined
                  }
                />
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea
                  className="form-input"
                  rows={3}
                  readOnly={!canEdit}
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Internal notes"
                  style={{
                    resize: canEdit ? "vertical" : "none",
                    ...(!canEdit
                      ? { background: "#f8fafc", cursor: "default" }
                      : {}),
                  }}
                />
              </div>
            </div>

            <div className="card" style={{ padding: "32px" }}>
              <h3
                style={{
                  fontSize: "16px",
                  fontWeight: 800,
                  marginBottom: "24px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <ShieldCheck size={20} color="var(--primary)" /> Access
              </h3>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <p
                    style={{
                      fontSize: "14px",
                      fontWeight: 700,
                      color: "var(--text-main)",
                    }}
                  >
                    Platform access
                  </p>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    Revoke access to terminate sessions.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={() =>
                    setFormData({ ...formData, is_active: !formData.is_active })
                  }
                  style={{
                    width: "50px",
                    height: "26px",
                    borderRadius: "20px",
                    background: formData.is_active ? "var(--primary)" : "#CBD5E1",
                    position: "relative",
                    transition: "all 0.3s ease",
                    border: "none",
                    cursor: canEdit ? "pointer" : "not-allowed",
                    opacity: canEdit ? 1 : 0.7,
                  }}
                >
                  <div
                    style={{
                      width: "18px",
                      height: "18px",
                      borderRadius: "50%",
                      background: "white",
                      position: "absolute",
                      top: "4px",
                      left: formData.is_active ? "28px" : "4px",
                      transition: "all 0.3s ease",
                    }}
                  />
                </button>
              </div>
            </div>

            <div className="card" style={{ padding: "32px" }}>
              <h3
                style={{
                  fontSize: "16px",
                  fontWeight: 800,
                  marginBottom: "16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <ShieldCheck size={20} color="var(--primary)" /> Permissions
              </h3>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  maxHeight: "min(48vh, 360px)",
                  overflowY: "auto",
                }}
              >
                {(
                  Object.keys(
                    formData.permissions,
                  ) as (keyof UpdateStaffPermissions)[]
                ).map((p) => (
                  <div
                    key={p}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      background: "white",
                      borderRadius: "10px",
                      border: "1px solid #edf2f7",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "#475569",
                        textTransform: "capitalize",
                      }}
                    >
                      {p.replace(/_/g, " ")}
                    </span>
                    <input
                      type="checkbox"
                      style={{
                        width: 18,
                        height: 18,
                        cursor: canEdit ? "pointer" : "not-allowed",
                      }}
                      disabled={!canEdit}
                      checked={formData.permissions[p]}
                      onChange={() => togglePermission(p)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                marginTop: "12px",
              }}
            >
              {canEdit ? (
                <>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{
                      width: "100%",
                      padding: "16px",
                      fontSize: "16px",
                      fontWeight: 800,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                    }}
                    disabled={saving || deleting}
                  >
                    {saving ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      <Save size={20} />
                    )}
                    <span>Save changes</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => router.push("/staff")}
                    style={{ width: "100%", padding: "14px" }}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{
                      width: "100%",
                      padding: "16px",
                      fontSize: "16px",
                      fontWeight: 800,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                    }}
                    onClick={() =>
                      router.push(
                        `/staff/details?id=${encodeURIComponent(staffId)}&mode=edit`,
                      )
                    }
                  >
                    <Edit2 size={20} />
                    <span>Edit profile</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => router.push("/staff")}
                    style={{ width: "100%", padding: "14px" }}
                  >
                    Back to staff
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function StaffDetailsPage() {
  return (
    <Suspense
      fallback={
        <div className="page-container flex-center">
          <Loader2 className="animate-spin" />
        </div>
      }
    >
      <StaffDetailsContent />
    </Suspense>
  );
}
