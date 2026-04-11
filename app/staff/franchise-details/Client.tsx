"use client";

import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Store,
  Globe,
  BarChart3,
  ShieldCheck,
  User,
  Briefcase,
  Edit2,
  Trash2,
  Save,
  MapPin,
  Layers,
} from "lucide-react";
import { api } from "@/utils/api";
import {
  fetchCitiesByStateCode,
  fetchFranchiseDistrictsByStateId,
  fetchIndianStates,
  type FranchiseDistrict,
  type IndianCity,
  type IndianState,
} from "@/utils/locations";
import {
  formatAssignedAt,
  franchiseTerritoriesListUrl,
  parseFranchiseTerritoriesList,
  type FranchiseTerritoryRow,
} from "@/utils/franchiseTerritories";
import { useToast } from "@/components/ToastProvider";
import { useConfirm } from "@/components/ConfirmDialog";
import "../../dashboard/Dashboard.css";
import "../Staff.css";

function unwrapFranchiseByIdPayload(result: unknown): {
  franchise: Record<string, unknown>;
  statistics: Record<string, unknown>;
} | null {
  if (!result || typeof result !== "object") return null;
  const p = result as Record<string, unknown>;
  const data = p.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const d = data as Record<string, unknown>;
  const fr = d.franchise;
  if (!fr || typeof fr !== "object" || Array.isArray(fr)) return null;
  const st = d.statistics;
  const statistics =
    st && typeof st === "object" && !Array.isArray(st)
      ? (st as Record<string, unknown>)
      : {};
  return { franchise: fr as Record<string, unknown>, statistics };
}

function fmt(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  if (typeof v === "string") return v.trim() || "—";
  return "—";
}

function pickNumericId(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v) && v > 0) return Math.trunc(v);
  if (v != null && String(v).trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) return Math.trunc(n);
  }
  return undefined;
}

type FranchiseLevel = "state" | "district" | "city";

type FranchiseEditForm = {
  name: string;
  email: string;
  phone_number: string;
  owner_name: string;
  owner_email: string;
  owner_phone: string;
  level: FranchiseLevel;
  state: string;
  district: string;
  city: string;
  address: string;
  pin_code: string;
  business_registration_number: string;
  gst_number: string;
  pan_number: string;
  commission_percentage: string;
  description: string;
  is_active: boolean;
  /** Only sent on PUT when non-empty (API optional). */
  password: string;
  logo: string;
};

function franchiseToForm(fr: Record<string, unknown>): FranchiseEditForm {
  const lvl = String(fr.level ?? "state").toLowerCase();
  const level: FranchiseLevel =
    lvl === "district" ? "district" : lvl === "city" ? "city" : "state";
  const comm = fr.commission_percentage;
  const commissionStr =
    typeof comm === "number" && Number.isFinite(comm)
      ? String(comm)
      : typeof comm === "string"
        ? comm
        : "0";
  return {
    name: typeof fr.name === "string" ? fr.name : "",
    email: typeof fr.email === "string" ? fr.email : "",
    phone_number:
      typeof fr.phone_number === "string" ? fr.phone_number : "",
    owner_name: typeof fr.owner_name === "string" ? fr.owner_name : "",
    owner_email: typeof fr.owner_email === "string" ? fr.owner_email : "",
    owner_phone: typeof fr.owner_phone === "string" ? fr.owner_phone : "",
    level,
    state: typeof fr.state === "string" ? fr.state : "",
    district: fr.district == null ? "" : String(fr.district),
    city: fr.city == null ? "" : String(fr.city),
    address: typeof fr.address === "string" ? fr.address : "",
    pin_code: typeof fr.pin_code === "string" ? fr.pin_code : "",
    business_registration_number:
      typeof fr.business_registration_number === "string"
        ? fr.business_registration_number
        : "",
    gst_number: typeof fr.gst_number === "string" ? fr.gst_number : "",
    pan_number: typeof fr.pan_number === "string" ? fr.pan_number : "",
    commission_percentage: commissionStr,
    description: typeof fr.description === "string" ? fr.description : "",
    is_active: fr.is_active === true,
    password: "",
    logo: typeof fr.logo === "string" ? fr.logo : "",
  };
}

function mergePermissionsFromFranchise(
  fr: Record<string, unknown>,
): Record<string, boolean> {
  const raw = fr.permissions;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    out[k] = v === true;
  }
  return out;
}

/**
 * PUT /api/v1/super-admin/franchises/franchises/{id} — body matches OpenAPI
 * (all fields optional; we send a full snapshot of editable fields).
 * Active/inactive is changed via PATCH …/toggle-status on save, not PUT.
 */
function buildFranchiseUpdatePayload(
  form: FranchiseEditForm,
  permissions: Record<string, boolean>,
): Record<string, unknown> {
  const commission = Number(form.commission_percentage.replace(/\s/g, ""));
  const body: Record<string, unknown> = {
    name: form.name.trim(),
    email: form.email.trim(),
    phone_number: form.phone_number.replace(/\s/g, ""),
    owner_name: form.owner_name.trim(),
    owner_email: form.owner_email.trim(),
    owner_phone: form.owner_phone.replace(/\s/g, ""),
    address: form.address.trim(),
    pin_code: form.pin_code.trim(),
    business_registration_number:
      form.business_registration_number.trim(),
    gst_number: form.gst_number.trim(),
    pan_number: form.pan_number.trim(),
    commission_percentage: Number.isFinite(commission) ? commission : 0,
    description: form.description.trim(),
    permissions: { ...permissions },
  };
  const pw = form.password.trim();
  if (pw) body.password = pw;
  const logo = form.logo.trim();
  if (logo) body.logo = logo;
  return body;
}

function FranchiseDetailsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const canEdit = searchParams.get("mode") === "edit";
  const toast = useToast();
  const askConfirm = useConfirm();

  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [franchise, setFranchise] = useState<Record<string, unknown> | null>(
    null,
  );
  const [statistics, setStatistics] = useState<Record<string, unknown>>({});
  const [form, setForm] = useState<FranchiseEditForm | null>(null);
  const [permEdit, setPermEdit] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [togglingVerify, setTogglingVerify] = useState(false);
  const [territories, setTerritories] = useState<FranchiseTerritoryRow[]>([]);
  const [territoriesLoading, setTerritoriesLoading] = useState(false);
  const [territoriesError, setTerritoriesError] = useState<string | null>(null);

  const [locationStates, setLocationStates] = useState<IndianState[]>([]);
  const [bulkDistrictOptions, setBulkDistrictOptions] = useState<
    FranchiseDistrict[]
  >([]);
  const [bulkCityOptions, setBulkCityOptions] = useState<IndianCity[]>([]);
  const [bulkDistrictsLoading, setBulkDistrictsLoading] = useState(false);
  const [bulkCitiesLoading, setBulkCitiesLoading] = useState(false);
  const [bulkDistrictIds, setBulkDistrictIds] = useState<number[]>([]);
  const [bulkCityIds, setBulkCityIds] = useState<number[]>([]);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  const franchisePath = (fid: string) =>
    `/api/v1/super-admin/franchises/franchises/${encodeURIComponent(fid)}`;

  const franchiseToggleStatusPath = (fid: string) =>
    `${franchisePath(fid)}/toggle-status`;

  const franchiseVerifyPath = (fid: string) =>
    `${franchisePath(fid)}/verify`;

  /** DELETE …/franchises/{id}?force=true — force orphans clinics per API docs */
  const franchiseDeletePath = (fid: string, force: boolean) =>
    `${franchisePath(fid)}${force ? "?force=true" : ""}`;

  const franchiseBulkTerritoriesPath = (fid: string) =>
    `/api/v1/super-admin/territories/franchises/${encodeURIComponent(fid)}/territories/bulk`;

  const effectiveStateId = useMemo(() => {
    if (!franchise) return undefined;
    const direct = pickNumericId(franchise.state_id);
    if (direct != null) return direct;
    const name =
      typeof franchise.state === "string" ? franchise.state.trim() : "";
    if (!name || locationStates.length === 0) return undefined;
    const match = locationStates.find(
      (s) => s.name.toLowerCase() === name.toLowerCase(),
    );
    return match?.id;
  }, [franchise, locationStates]);

  const effectiveStateCode = useMemo(() => {
    if (!franchise) return "";
    const codeRaw = franchise.state_code;
    if (typeof codeRaw === "string" && /^[a-z]{2}$/i.test(codeRaw.trim())) {
      return codeRaw.trim().toUpperCase();
    }
    const name =
      typeof franchise.state === "string" ? franchise.state.trim() : "";
    if (!name || locationStates.length === 0) return "";
    const match = locationStates.find(
      (s) => s.name.toLowerCase() === name.toLowerCase(),
    );
    return match?.code ?? "";
  }, [franchise, locationStates]);

  const fetchFranchiseTerritories = useCallback(async () => {
    const fid = (id ?? "").trim();
    if (!fid) {
      setTerritories([]);
      setTerritoriesError(null);
      return;
    }
    setTerritoriesLoading(true);
    setTerritoriesError(null);
    try {
      const result = await api.get<unknown>(franchiseTerritoriesListUrl(fid));
      setTerritories(parseFranchiseTerritoriesList(result));
    } catch (err: unknown) {
      setTerritories([]);
      setTerritoriesError(
        err instanceof Error ? err.message : "Could not load territories.",
      );
    } finally {
      setTerritoriesLoading(false);
    }
  }, [id]);

  const fetchFranchise = useCallback(async () => {
    const fid = (id ?? "").trim();
    if (!fid) {
      setFetchError("Missing franchise id.");
      setFranchise(null);
      setStatistics({});
      setForm(null);
      setPermEdit({});
      setLoading(false);
      return;
    }

    setLoading(true);
    setFetchError(null);
    try {
      const result = await api.get<Record<string, unknown>>(franchisePath(fid));
      const parsed = unwrapFranchiseByIdPayload(result);
      if (!parsed) {
        setFetchError("Could not read franchise details from the response.");
        setFranchise(null);
        setStatistics({});
        setForm(null);
        setPermEdit({});
        return;
      }
      setFranchise(parsed.franchise);
      setStatistics(parsed.statistics);
      setForm(franchiseToForm(parsed.franchise));
      setPermEdit(mergePermissionsFromFranchise(parsed.franchise));
    } catch (err: unknown) {
      setFetchError(
        err instanceof Error ? err.message : "Could not load franchise details.",
      );
      setFranchise(null);
      setStatistics({});
      setForm(null);
      setPermEdit({});
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchFranchise();
  }, [fetchFranchise]);

  useEffect(() => {
    void fetchFranchiseTerritories();
  }, [fetchFranchiseTerritories]);

  useEffect(() => {
    if (!canEdit) return;
    void fetchIndianStates()
      .then(setLocationStates)
      .catch(() => setLocationStates([]));
  }, [canEdit]);

  useEffect(() => {
    if (!canEdit || !form || form.level !== "state" || effectiveStateId == null) {
      setBulkDistrictOptions([]);
      return;
    }
    let cancelled = false;
    setBulkDistrictsLoading(true);
    void fetchFranchiseDistrictsByStateId(effectiveStateId)
      .then((rows) => {
        if (!cancelled) setBulkDistrictOptions(rows);
      })
      .catch(() => {
        if (!cancelled) setBulkDistrictOptions([]);
      })
      .finally(() => {
        if (!cancelled) setBulkDistrictsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canEdit, form?.level, effectiveStateId]);

  useEffect(() => {
    if (!canEdit || !form || form.level === "state" || !effectiveStateCode) {
      setBulkCityOptions([]);
      return;
    }
    const districtId = franchise ? pickNumericId(franchise.district_id) : undefined;
    if (
      (form.level === "district" || form.level === "city") &&
      districtId == null
    ) {
      setBulkCityOptions([]);
      setBulkCitiesLoading(false);
      return;
    }
    let cancelled = false;
    setBulkCitiesLoading(true);
    void fetchCitiesByStateCode(effectiveStateCode)
      .then((list) => {
        if (cancelled) return;
        setBulkCityOptions(
          list.filter(
            (c) =>
              c.district_id != null && c.district_id === districtId,
          ),
        );
      })
      .catch(() => {
        if (!cancelled) setBulkCityOptions([]);
      })
      .finally(() => {
        if (!cancelled) setBulkCitiesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canEdit, form?.level, effectiveStateCode, franchise?.district_id]);

  const toggleBulkDistrict = (did: number) => {
    setBulkDistrictIds((prev) =>
      prev.includes(did) ? prev.filter((x) => x !== did) : [...prev, did],
    );
  };

  const toggleBulkCity = (cid: number) => {
    setBulkCityIds((prev) =>
      prev.includes(cid) ? prev.filter((x) => x !== cid) : [...prev, cid],
    );
  };

  const handleBulkAssignTerritories = async () => {
    const fid = (id ?? "").trim();
    if (!fid || !form) return;
    const districtsPayload =
      form.level === "state" ? bulkDistrictIds : ([] as number[]);
    const citiesPayload =
      form.level === "district" || form.level === "city"
        ? bulkCityIds
        : ([] as number[]);
    if (districtsPayload.length === 0 && citiesPayload.length === 0) {
      toast.error(
        form.level === "state"
          ? "Select at least one district."
          : "Select at least one city.",
      );
      return;
    }
    setBulkSubmitting(true);
    try {
      await api.post(franchiseBulkTerritoriesPath(fid), {
        districts: districtsPayload,
        cities: citiesPayload,
      });
      toast.success("Territories assigned.");
      setBulkDistrictIds([]);
      setBulkCityIds([]);
      await fetchFranchiseTerritories();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Could not assign territories.",
      );
    } finally {
      setBulkSubmitting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const fid = (id ?? "").trim();
    if (!fid || !form || !franchise) return;
    const serverActive = franchise.is_active === true;
    const desiredActive = form.is_active;
    setSaving(true);
    try {
      const result = await api.put<Record<string, unknown>>(
        franchisePath(fid),
        buildFranchiseUpdatePayload(form, permEdit),
      );
      if (result && typeof result === "object" && result.success === false) {
        toast.error(
          typeof result.message === "string"
            ? result.message
            : "Update was not accepted.",
        );
        return;
      }
      if (desiredActive !== serverActive) {
        await api.patch(franchiseToggleStatusPath(fid), {});
      }
      toast.success(
        typeof result.message === "string" && result.message
          ? result.message
          : "Franchise updated successfully.",
      );
      setForm((prev) => (prev ? { ...prev, password: "" } : prev));
      router.replace(`/staff/franchise-details?id=${encodeURIComponent(fid)}`);
      await fetchFranchise();
      await fetchFranchiseTerritories();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Unable to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const fid = (id ?? "").trim();
    if (!fid) return;
    const firstOk = await askConfirm({
      title: "Delete franchise?",
      message: "This permanently removes this franchise. This cannot be undone.",
      variant: "danger",
      confirmLabel: "Delete",
    });
    if (!firstOk) return;
    setDeleting(true);
    try {
      await api.delete(franchiseDeletePath(fid, false));
      router.push("/staff");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Delete failed.";
      const forceOk = await askConfirm({
        title: "Force delete?",
        message: `${msg}\n\nForce delete removes the franchise even if clinics are linked and may orphan clinics and staff.`,
        variant: "danger",
        confirmLabel: "Force delete",
      });
      if (!forceOk) return;
      try {
        await api.delete(franchiseDeletePath(fid, true));
        router.push("/staff");
      } catch (err2: unknown) {
        toast.error(
          err2 instanceof Error ? err2.message : "Force delete failed.",
        );
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleStatusBadge = async () => {
    if (!canEdit) return;
    const fid = (id ?? "").trim();
    if (!fid || togglingStatus || saving) return;
    setTogglingStatus(true);
    try {
      await api.patch(franchiseToggleStatusPath(fid), {});
      await fetchFranchise();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Could not update franchise status.",
      );
    } finally {
      setTogglingStatus(false);
    }
  };

  const handleToggleVerifyBadge = async () => {
    if (!canEdit || !franchise) return;
    const fid = (id ?? "").trim();
    if (!fid || togglingVerify || saving || togglingStatus) return;
    const nextVerified = franchise.is_verified !== true;
    setTogglingVerify(true);
    try {
      const result = await api.patch<Record<string, unknown>>(
        franchiseVerifyPath(fid),
        {
          is_verified: nextVerified,
          reason: nextVerified
            ? "Documents verified by admin"
            : "Verification revoked by admin",
        },
      );
      if (result && typeof result === "object" && result.success === false) {
        toast.error(
          typeof result.message === "string"
            ? result.message
            : "Verification update was not accepted.",
        );
        return;
      }
      if (
        typeof result.message === "string" &&
        result.message.trim()
      ) {
        toast.info(result.message);
      }
      await fetchFranchise();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Could not update franchise verification.",
      );
    } finally {
      setTogglingVerify(false);
    }
  };

  const togglePerm = (key: string) => {
    if (!canEdit) return;
    setPermEdit((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) {
    return (
      <div className="page-container flex-center">
        <Loader2 className="animate-spin" size={40} color="var(--primary)" />
        <p style={{ marginTop: 12, fontWeight: 600 }}>
          Loading franchise details…
        </p>
      </div>
    );
  }

  if (fetchError || !franchise || !form) {
    return (
      <div className="page-container" style={{ paddingTop: 24 }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => router.push("/staff")}
          style={{
            marginBottom: 24,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <ArrowLeft size={20} />
          Back to staff
        </button>
        <div className="card" style={{ padding: 32, maxWidth: 560 }}>
          <h1 className="page-title" style={{ fontSize: 20, marginBottom: 8 }}>
            Could not load franchise
          </h1>
          <p style={{ color: "var(--text-muted, #64748b)", marginBottom: 20 }}>
            {fetchError ?? "Unknown error."}
          </p>
          {id ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void fetchFranchise()}
            >
              Retry
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  const name = form.name.trim() || fmt(franchise.name);
  const isActive = form.is_active;
  const isVerified = franchise.is_verified === true;
  const statEntries = Object.entries(statistics);
  const permKeys = Object.keys(permEdit);
  const fid = (id ?? "").trim();

  const inputRo = (editable: boolean) =>
    editable
      ? {}
      : { background: "#f8fafc" as const, cursor: "default" as const };

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => router.push("/staff")}
            style={{ padding: 10 }}
            aria-label="Back to Platform Hierarchy"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="page-title">
              {canEdit ? "Edit franchise" : "View profile"}
            </h1>
            <p className="page-subtitle">
              {canEdit
                ? `Update franchise record for ${name || "this franchise"}.`
                : `Read-only franchise dossier for ${name || "this franchise"}.`}
            </p>
          </div>
        </div>
        <div
          className="header-actions"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          {!canEdit ? (
            <>
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
                    `/staff/franchise-details?id=${encodeURIComponent(fid)}&mode=edit`,
                  )
                }
              >
                <Edit2 size={18} />
                <span>Edit franchise</span>
              </button>
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
                disabled={deleting}
                onClick={() => void handleDelete()}
              >
                {deleting ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Trash2 size={18} />
                )}
                <span>Delete franchise</span>
              </button>
            </>
          ) : (
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
              disabled={deleting || saving || togglingVerify || togglingStatus}
              onClick={() => void handleDelete()}
            >
              {deleting ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <Trash2 size={18} />
              )}
              <span>Delete franchise</span>
            </button>
          )}
          {canEdit ? (
            <button
              type="button"
              title="Toggle active status"
              aria-label={
                togglingStatus
                  ? "Updating status"
                  : `Status: ${isActive ? "active" : "inactive"}. Click to toggle.`
              }
              disabled={togglingStatus || saving || togglingVerify}
              onClick={() => void handleToggleStatusBadge()}
              style={{
                font: "inherit",
                fontFamily: "inherit",
                margin: 0,
                background: isActive
                  ? "var(--success-light, #dcfce7)"
                  : "var(--danger-light, #fee2e2)",
                padding: "8px 16px",
                borderRadius: 12,
                border: "1px solid var(--border, #e5e7eb)",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                cursor:
                  togglingStatus || saving || togglingVerify
                    ? "not-allowed"
                    : "pointer",
                opacity:
                  togglingStatus || saving || togglingVerify ? 0.75 : 1,
              }}
            >
              {togglingStatus ? (
                <Loader2
                  className="animate-spin"
                  size={14}
                  color={isActive ? "var(--success, #15803d)" : "var(--danger, #b91c1c)"}
                />
              ) : (
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: isActive
                      ? "var(--success, #15803d)"
                      : "var(--danger, #b91c1c)",
                  }}
                />
              )}
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: isActive
                    ? "var(--success, #15803d)"
                    : "var(--danger, #b91c1c)",
                }}
              >
                {isActive ? "ACTIVE" : "INACTIVE"}
              </span>
            </button>
          ) : (
            <div
              style={{
                background: isActive
                  ? "var(--success-light, #dcfce7)"
                  : "var(--danger-light, #fee2e2)",
                padding: "8px 16px",
                borderRadius: 12,
                border: "1px solid var(--border, #e5e7eb)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: isActive
                    ? "var(--success, #15803d)"
                    : "var(--danger, #b91c1c)",
                }}
              />
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: isActive
                    ? "var(--success, #15803d)"
                    : "var(--danger, #b91c1c)",
                }}
              >
                {isActive ? "ACTIVE" : "INACTIVE"}
              </span>
            </div>
          )}
          {canEdit ? (
            <button
              type="button"
              title={
                isVerified
                  ? "Revoke verification (blocks login)"
                  : "Verify franchise (allows login)"
              }
              aria-label={
                togglingVerify
                  ? "Updating verification"
                  : isVerified
                    ? "Verified. Click to revoke verification."
                    : "Unverified. Click to verify."
              }
              disabled={togglingVerify || saving || togglingStatus}
              onClick={() => void handleToggleVerifyBadge()}
              style={{
                font: "inherit",
                fontFamily: "inherit",
                margin: 0,
                background: isVerified
                  ? "var(--success-light, #dcfce7)"
                  : "#fef3c7",
                padding: "8px 16px",
                borderRadius: 12,
                border: isVerified
                  ? "1px solid #bbf7d0"
                  : "1px solid #fde68a",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                cursor:
                  togglingVerify || saving || togglingStatus
                    ? "not-allowed"
                    : "pointer",
                opacity:
                  togglingVerify || saving || togglingStatus ? 0.75 : 1,
              }}
            >
              {togglingVerify ? (
                <Loader2
                  className="animate-spin"
                  size={14}
                  color={
                    isVerified ? "var(--success, #15803d)" : "#92400e"
                  }
                />
              ) : null}
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: isVerified
                    ? "var(--success, #15803d)"
                    : "#92400e",
                }}
              >
                {isVerified ? "VERIFIED" : "UNVERIFIED"}
              </span>
            </button>
          ) : isVerified ? (
            <div
              style={{
                background: "var(--success-light, #dcfce7)",
                padding: "8px 16px",
                borderRadius: 12,
                border: "1px solid #bbf7d0",
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--success, #15803d)",
                }}
              >
                VERIFIED
              </span>
            </div>
          ) : (
            <div
              style={{
                background: "#fef3c7",
                padding: "8px 16px",
                borderRadius: 12,
                border: "1px solid #fde68a",
              }}
            >
              <span
                style={{ fontSize: 12, fontWeight: 700, color: "#92400e" }}
              >
                UNVERIFIED
              </span>
            </div>
          )}
        </div>
      </div>

      {statEntries.length > 0 ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 20,
            marginBottom: 28,
          }}
        >
          <div className="card" style={{ padding: 24 }}>
            <h3
              style={{
                fontSize: 14,
                fontWeight: 800,
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "#1e293b",
              }}
            >
              <BarChart3 size={18} color="var(--primary)" /> Platform
              statistics
            </h3>
            <dl
              style={{
                margin: 0,
                display: "grid",
                gap: 8,
                fontSize: 13,
              }}
            >
              {statEntries.map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    borderBottom: "1px solid #f1f5f9",
                    paddingBottom: 6,
                  }}
                >
                  <dt style={{ color: "#64748b", fontWeight: 600 }}>
                    {k.replace(/_/g, " ")}
                  </dt>
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

      <form onSubmit={canEdit ? handleSave : (e) => e.preventDefault()}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 0.8fr",
            gap: 32,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div className="card" style={{ padding: 32 }}>
              <h3
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  marginBottom: 24,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <Store size={20} color="var(--primary)" /> Franchise profile
              </h3>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Franchise name</label>
                  <input
                    type="text"
                    className="form-input"
                    readOnly={!canEdit}
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => (f ? { ...f, name: e.target.value } : f))
                    }
                    style={inputRo(canEdit)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Franchise ID</label>
                  <input
                    type="text"
                    className="form-input"
                    readOnly
                    value={fmt(franchise.franchise_id)}
                    style={inputRo(false)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-input"
                    readOnly={!canEdit}
                    value={form.email}
                    onChange={(e) =>
                      setForm((f) => (f ? { ...f, email: e.target.value } : f))
                    }
                    style={inputRo(canEdit)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input
                    type="text"
                    className="form-input"
                    readOnly={!canEdit}
                    value={form.phone_number}
                    onChange={(e) =>
                      setForm((f) =>
                        f ? { ...f, phone_number: e.target.value } : f,
                      )
                    }
                    style={inputRo(canEdit)}
                  />
                </div>
                {canEdit ? (
                  <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                    <label className="form-label">
                      New password (optional)
                    </label>
                    <input
                      type="password"
                      className="form-input"
                      autoComplete="new-password"
                      value={form.password}
                      onChange={(e) =>
                        setForm((f) =>
                          f ? { ...f, password: e.target.value } : f,
                        )
                      }
                      placeholder="Leave blank to keep current password"
                    />
                  </div>
                ) : null}
                <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                  <label className="form-label">Logo URL</label>
                  <input
                    type="text"
                    className="form-input"
                    readOnly={!canEdit}
                    value={form.logo}
                    onChange={(e) =>
                      setForm((f) =>
                        f ? { ...f, logo: e.target.value } : f,
                      )
                    }
                    placeholder={canEdit ? "https://… (optional)" : "—"}
                    style={inputRo(!canEdit)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Level</label>
                  <input
                    type="text"
                    className="form-input"
                    readOnly
                    value={
                      form.level.charAt(0).toUpperCase() + form.level.slice(1)
                    }
                    title="Level is not part of the update-franchise API body"
                    style={inputRo(false)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Commission %</label>
                  <input
                    type="text"
                    className="form-input"
                    readOnly={!canEdit}
                    value={form.commission_percentage}
                    onChange={(e) =>
                      setForm((f) =>
                        f
                          ? { ...f, commission_percentage: e.target.value }
                          : f,
                      )
                    }
                    style={inputRo(canEdit)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Created</label>
                  <input
                    type="text"
                    className="form-input"
                    readOnly
                    value={fmt(franchise.created_at)}
                    style={inputRo(false)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Last login</label>
                  <input
                    type="text"
                    className="form-input"
                    readOnly
                    value={fmt(franchise.last_login)}
                    style={inputRo(false)}
                  />
                </div>
                {canEdit ? (
                  <div className="form-group">
                    <label
                      className="form-label"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={form.is_active}
                        onChange={(e) =>
                          setForm((f) =>
                            f ? { ...f, is_active: e.target.checked } : f,
                          )
                        }
                      />
                      Active franchise
                    </label>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="card" style={{ padding: 32 }}>
              <h3
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  marginBottom: 24,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <Briefcase size={20} color="var(--primary)" /> Registration &
                tax
              </h3>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Business registration</label>
                  <input
                    type="text"
                    className="form-input"
                    readOnly={!canEdit}
                    value={form.business_registration_number}
                    onChange={(e) =>
                      setForm((f) =>
                        f
                          ? {
                              ...f,
                              business_registration_number: e.target.value,
                            }
                          : f,
                      )
                    }
                    style={inputRo(canEdit)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">GST number</label>
                  <input
                    type="text"
                    className="form-input"
                    readOnly={!canEdit}
                    value={form.gst_number}
                    onChange={(e) =>
                      setForm((f) =>
                        f ? { ...f, gst_number: e.target.value } : f,
                      )
                    }
                    style={inputRo(canEdit)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">PAN</label>
                  <input
                    type="text"
                    className="form-input"
                    readOnly={!canEdit}
                    value={form.pan_number}
                    onChange={(e) =>
                      setForm((f) =>
                        f ? { ...f, pan_number: e.target.value } : f,
                      )
                    }
                    style={inputRo(canEdit)}
                  />
                </div>
              </div>
              <div style={{ marginTop: 16 }} className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-input"
                  readOnly={!canEdit}
                  rows={4}
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) =>
                      f ? { ...f, description: e.target.value } : f,
                    )
                  }
                  style={{
                    ...inputRo(canEdit),
                    resize: canEdit ? "vertical" : "none",
                  }}
                />
              </div>
            </div>

            <div className="card" style={{ padding: 32 }}>
              <h3
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  marginBottom: 24,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <MapPin size={20} color="var(--primary)" /> Assigned
                territories
              </h3>
              {territoriesLoading ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    color: "#64748b",
                    fontSize: 13,
                  }}
                >
                  <Loader2 className="animate-spin" size={18} />
                  Loading territories…
                </div>
              ) : territoriesError ? (
                <p style={{ color: "#b91c1c", fontSize: 13, margin: 0 }}>
                  {territoriesError}
                </p>
              ) : territories.length === 0 ? (
                <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>
                  No territories assigned to this franchise.
                </p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: 13,
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          borderBottom: "1px solid #e2e8f0",
                          textAlign: "left",
                        }}
                      >
                        <th
                          style={{
                            padding: "8px 12px 8px 0",
                            color: "#64748b",
                            fontWeight: 700,
                          }}
                        >
                          Type
                        </th>
                        <th
                          style={{
                            padding: "8px 12px",
                            color: "#64748b",
                            fontWeight: 700,
                          }}
                        >
                          Territory
                        </th>
                        <th
                          style={{
                            padding: "8px 12px",
                            color: "#64748b",
                            fontWeight: 700,
                          }}
                        >
                          ID
                        </th>
                        <th
                          style={{
                            padding: "8px 12px",
                            color: "#64748b",
                            fontWeight: 700,
                          }}
                        >
                          Assigned by
                        </th>
                        <th
                          style={{
                            padding: "8px 12px",
                            color: "#64748b",
                            fontWeight: 700,
                          }}
                        >
                          Assigned at
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {territories.map((t) => (
                        <tr
                          key={`${t.id}-${t.territory_type}-${t.territory_id}`}
                          style={{ borderBottom: "1px solid #f1f5f9" }}
                        >
                          <td
                            style={{
                              padding: "10px 12px 10px 0",
                              fontWeight: 600,
                            }}
                          >
                            {t.territory_type}
                          </td>
                          <td style={{ padding: "10px 12px", color: "#1e293b" }}>
                            {t.territory_name}
                          </td>
                          <td style={{ padding: "10px 12px", color: "#64748b" }}>
                            {t.territory_id}
                          </td>
                          <td style={{ padding: "10px 12px", color: "#475569" }}>
                            {t.assigned_by_name}
                          </td>
                          <td
                            style={{
                              padding: "10px 12px",
                              color: "#475569",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {formatAssignedAt(t.assigned_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {canEdit ? (
                <div
                  style={{
                    marginTop: 24,
                    paddingTop: 24,
                    borderTop: "1px solid #e2e8f0",
                  }}
                >
                  <h4
                    style={{
                      fontSize: 14,
                      fontWeight: 800,
                      marginBottom: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      color: "#1e293b",
                    }}
                  >
                    <Layers size={18} color="var(--primary)" /> Bulk assign
                    territories
                  </h4>
                  <p
                    style={{
                      fontSize: 12,
                      color: "#64748b",
                      marginBottom: 16,
                      lineHeight: 1.5,
                    }}
                  >
                    {form.level === "state"
                      ? "State-level franchise: select districts to assign."
                      : "District / city-level franchise: select cities to assign."}
                  </p>
                  {form.level === "state" ? (
                    effectiveStateId == null ? (
                      <p style={{ fontSize: 13, color: "#b45309", margin: 0 }}>
                        Could not resolve state (need state_id or a matching state
                        name from the locations directory). Load states failed or
                        franchise state is missing.
                      </p>
                    ) : bulkDistrictsLoading ? (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          color: "#64748b",
                          fontSize: 13,
                        }}
                      >
                        <Loader2 className="animate-spin" size={16} />
                        Loading districts…
                      </div>
                    ) : bulkDistrictOptions.length === 0 ? (
                      <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
                        No districts found for this state.
                      </p>
                    ) : (
                      <div
                        style={{
                          maxHeight: 240,
                          overflowY: "auto",
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                          marginBottom: 16,
                        }}
                      >
                        {bulkDistrictOptions.map((d) => (
                          <label
                            key={d.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              fontSize: 13,
                              cursor: "pointer",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={bulkDistrictIds.includes(d.id)}
                              onChange={() => toggleBulkDistrict(d.id)}
                            />
                            <span>
                              {d.name}{" "}
                              <span style={{ color: "#94a3b8" }}>(#{d.id})</span>
                            </span>
                          </label>
                        ))}
                      </div>
                    )
                  ) : effectiveStateCode === "" ? (
                    <p style={{ fontSize: 13, color: "#b45309", margin: 0 }}>
                      Could not resolve state code for loading cities.
                    </p>
                  ) : (form.level === "district" || form.level === "city") &&
                    pickNumericId(franchise.district_id) == null ? (
                    <p style={{ fontSize: 13, color: "#b45309", margin: 0 }}>
                      Franchise is missing district_id; cannot filter cities for
                      bulk assign.
                    </p>
                  ) : bulkCitiesLoading ? (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        color: "#64748b",
                        fontSize: 13,
                      }}
                    >
                      <Loader2 className="animate-spin" size={16} />
                      Loading cities…
                    </div>
                  ) : bulkCityOptions.length === 0 ? (
                    <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
                      No cities found for this district / state.
                    </p>
                  ) : (
                    <div
                      style={{
                        maxHeight: 240,
                        overflowY: "auto",
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                        marginBottom: 16,
                      }}
                    >
                      {bulkCityOptions.map((c) => (
                        <label
                          key={c.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            fontSize: 13,
                            cursor: "pointer",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={bulkCityIds.includes(c.id)}
                            onChange={() => toggleBulkCity(c.id)}
                          />
                          <span>
                            {c.name}{" "}
                            <span style={{ color: "#94a3b8" }}>(#{c.id})</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{
                      padding: "10px 18px",
                      fontWeight: 700,
                      fontSize: 13,
                    }}
                    disabled={
                      bulkSubmitting ||
                      saving ||
                      deleting ||
                      (form.level === "state" && bulkDistrictIds.length === 0) ||
                      ((form.level === "district" || form.level === "city") &&
                        bulkCityIds.length === 0)
                    }
                    onClick={() => void handleBulkAssignTerritories()}
                  >
                    {bulkSubmitting ? (
                      <>
                        <Loader2 className="animate-spin" size={16} /> Assigning…
                      </>
                    ) : (
                      "Assign selected territories"
                    )}
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div className="card" style={{ padding: 32 }}>
              <h3
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  marginBottom: 24,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <User size={20} color="var(--primary)" /> Owner
              </h3>
              <div className="form-group">
                <label className="form-label">Owner name</label>
                <input
                  type="text"
                  className="form-input"
                  readOnly={!canEdit}
                  value={form.owner_name}
                  onChange={(e) =>
                    setForm((f) =>
                      f ? { ...f, owner_name: e.target.value } : f,
                    )
                  }
                  style={inputRo(canEdit)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Owner email</label>
                <input
                  type="text"
                  className="form-input"
                  readOnly={!canEdit}
                  value={form.owner_email}
                  onChange={(e) =>
                    setForm((f) =>
                      f ? { ...f, owner_email: e.target.value } : f,
                    )
                  }
                  style={inputRo(canEdit)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Owner phone</label>
                <input
                  type="text"
                  className="form-input"
                  readOnly={!canEdit}
                  value={form.owner_phone}
                  onChange={(e) =>
                    setForm((f) =>
                      f ? { ...f, owner_phone: e.target.value } : f,
                    )
                  }
                  style={inputRo(canEdit)}
                />
              </div>
            </div>

            <div className="card" style={{ padding: 32 }}>
              <h3
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  marginBottom: 24,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <Globe size={20} color="var(--primary)" /> Location
              </h3>
              <div className="form-group">
                <label className="form-label">State</label>
                <input
                  type="text"
                  className="form-input"
                  readOnly
                  value={form.state}
                  title="Not updated via PUT franchise (display only)"
                  style={inputRo(false)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">District</label>
                <input
                  type="text"
                  className="form-input"
                  readOnly
                  value={form.district}
                  title="Not updated via PUT franchise (display only)"
                  style={inputRo(false)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">City</label>
                <input
                  type="text"
                  className="form-input"
                  readOnly
                  value={form.city}
                  title="Not updated via PUT franchise (display only)"
                  style={inputRo(false)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Address</label>
                <textarea
                  className="form-input"
                  readOnly={!canEdit}
                  rows={3}
                  value={form.address}
                  onChange={(e) =>
                    setForm((f) =>
                      f ? { ...f, address: e.target.value } : f,
                    )
                  }
                  style={{
                    ...inputRo(canEdit),
                    resize: canEdit ? "vertical" : "none",
                  }}
                />
              </div>
              <div className="form-group">
                <label className="form-label">PIN code</label>
                <input
                  type="text"
                  className="form-input"
                  readOnly={!canEdit}
                  value={form.pin_code}
                  onChange={(e) =>
                    setForm((f) =>
                      f ? { ...f, pin_code: e.target.value } : f,
                    )
                  }
                  style={inputRo(canEdit)}
                />
              </div>
            </div>

            {permKeys.length > 0 ? (
              <div className="card" style={{ padding: 32 }}>
                <h3
                  style={{
                    fontSize: 16,
                    fontWeight: 800,
                    marginBottom: 24,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <ShieldCheck size={20} color="var(--primary)" /> Permissions
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {permKeys.map((p) => (
                    <div
                      key={p}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 14px",
                        background: "white",
                        borderRadius: 10,
                        border: "1px solid #edf2f7",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
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
                        checked={permEdit[p] === true}
                        onChange={() => togglePerm(p)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {canEdit ? (
                <>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{
                      width: "100%",
                      padding: 16,
                      fontSize: 16,
                      fontWeight: 800,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
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
                    style={{ width: "100%", padding: 14 }}
                    disabled={saving || deleting}
                    onClick={() =>
                      router.replace(
                        `/staff/franchise-details?id=${encodeURIComponent(fid)}`,
                      )
                    }
                  >
                    Cancel
                  </button>
                </>
              ) : null}
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => router.push("/staff")}
                style={{ width: "100%", padding: 14 }}
              >
                Back to staff
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function FranchiseDetailsPage() {
  return (
    <Suspense
      fallback={
        <div className="page-container flex-center">
          <Loader2 className="animate-spin" />
        </div>
      }
    >
      <FranchiseDetailsContent />
    </Suspense>
  );
}
