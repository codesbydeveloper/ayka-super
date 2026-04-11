"use client";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  ShieldCheck, 
  Plus, 
  MoreVertical, 
  Mail, 
  UserPlus, 
  Clock, 
  Lock,
  Edit2,
  X,
  Loader2,
  User,
  ShieldAlert,
  AlertCircle,
  Eye,
  Trash2,
  MapPin,
  Globe,
  ArrowLeft,
  Briefcase,
  Layers,
  Compass,
  CheckCircle2,
  Settings,
  Phone,
  Store,
  ChevronDown,
} from 'lucide-react';
import { api } from '@/utils/api';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/components/ConfirmDialog';
import {
  fetchIndianStates,
  fetchCitiesByStateCode,
  fetchFranchiseDistrictsByStateId,
  type IndianState,
  type IndianCity,
} from '@/utils/locations';
import '../dashboard/Dashboard.css';
import './Staff.css';

/** City row with its state for building nested `territories` payloads. */
type FranchiseCityOption = IndianCity & { state_code: string };

/** District row from GET /super-admin/franchises/districts for create-franchise UI. */
type FranchiseDistrictOption = {
  state_id: number;
  state_code: string;
  id: number;
  name: string;
};

type FranchiseDistrictPick = { state_id: number; district_id: number };

async function fetchCitiesMergedForStateCodes(
  codes: string[],
): Promise<FranchiseCityOption[]> {
  if (codes.length === 0) return [];
  const lists = await Promise.all(
    codes.map((code) =>
      fetchCitiesByStateCode(code)
        .then((list) =>
          list.map(
            (c): FranchiseCityOption => ({ ...c, state_code: code }),
          ),
        )
        .catch(() => [] as FranchiseCityOption[]),
    ),
  );
  const byId = new Map<number, FranchiseCityOption>();
  for (const list of lists) {
    for (const c of list) {
      if (!byId.has(c.id)) byId.set(c.id, c);
    }
  }
  return Array.from(byId.values()).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
}

interface AdminUser {
  id: number;
  staff_id?: string;
  name: string;
  email: string;
  phone_number?: string;
  designation?: string;
  is_active: boolean;
  geographic_access?: {
    states: string[];
    cities: string[];
  };
  permissions?: Record<string, boolean>;
  created_at: string;
  last_login?: string | null;
}

function extractStaffList(payload: unknown): unknown[] {
  if (!payload || typeof payload !== "object") return [];
  const p = payload as Record<string, unknown>;

  if (Array.isArray(p)) return p;

  const data = p.data;
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    if (Array.isArray(d.staff)) return d.staff;
    if (Array.isArray(d.users)) return d.users;
    if (Array.isArray(d.items)) return d.items;
    if (Array.isArray(d.results)) return d.results;
  }

  const firstTopArray = Object.keys(p).find((k) => Array.isArray(p[k]));
  if (firstTopArray) return p[firstTopArray] as unknown[];

  return [];
}

function extractFranchiseList(payload: unknown): unknown[] {
  if (!payload || typeof payload !== "object") return [];
  const p = payload as Record<string, unknown>;

  if (Array.isArray(p)) return p;

  const data = p.data;
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    if (Array.isArray(d.franchises)) return d.franchises;
    if (Array.isArray(d.items)) return d.items;
    if (Array.isArray(d.results)) return d.results;
  }

  if (Array.isArray(p.franchises)) return p.franchises;

  const firstTopArray = Object.keys(p).find((k) => Array.isArray(p[k]));
  if (firstTopArray) return p[firstTopArray] as unknown[];

  return [];
}

interface FranchiseRecord {
  id: number;
  name: string;
  email: string;
  phone_number?: string;
  level?: string;
  is_active: boolean;
  is_verified?: boolean;
  owner_name?: string;
  state_name?: string;
  district_name?: string;
  city_name?: string;
  state_id?: number;
  district_id?: number;
  city_id?: number;
}

function normalizeFranchiseRow(raw: unknown): FranchiseRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === "number" ? r.id : Number(r.id);
  if (!Number.isFinite(id)) return null;

  const sid =
    r.state_id != null ? Number(r.state_id) : undefined;
  const did =
    r.district_id != null ? Number(r.district_id) : undefined;
  const cid = r.city_id != null ? Number(r.city_id) : undefined;

  return {
    id,
    name: typeof r.name === "string" ? r.name : "",
    email: typeof r.email === "string" ? r.email : "",
    phone_number:
      typeof r.phone_number === "string" ? r.phone_number : undefined,
    level: typeof r.level === "string" ? r.level : undefined,
    is_active: r.is_active === true || r.is_active === undefined,
    is_verified:
      typeof r.is_verified === "boolean" ? r.is_verified : undefined,
    owner_name:
      typeof r.owner_name === "string" ? r.owner_name : undefined,
    state_name:
      typeof r.state_name === "string"
        ? r.state_name
        : typeof r.state === "string"
          ? r.state
          : undefined,
    district_name:
      typeof r.district_name === "string"
        ? r.district_name
        : typeof r.district === "string"
          ? r.district
          : undefined,
    city_name:
      typeof r.city_name === "string"
        ? r.city_name
        : typeof r.city === "string"
          ? r.city
          : undefined,
    state_id: Number.isFinite(sid ?? NaN) ? sid : undefined,
    district_id: Number.isFinite(did ?? NaN) ? did : undefined,
    city_id: Number.isFinite(cid ?? NaN) ? cid : undefined,
  };
}

function franchiseGeoSummary(f: FranchiseRecord): string[] {
  const parts: string[] = [];
  if (f.state_name) parts.push(f.state_name);
  if (f.district_name) parts.push(f.district_name);
  if (f.city_name) parts.push(f.city_name);
  if (parts.length) return parts;
  if (f.state_id != null) parts.push(`State #${f.state_id}`);
  if (f.district_id != null) parts.push(`District #${f.district_id}`);
  if (f.city_id != null) parts.push(`City #${f.city_id}`);
  return parts.length ? parts : [];
}

type HierarchyTab = "roles" | "franchises";


type CreateStaffPermissions = {
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


const STAFF_ROLE_OPTIONS = [
  "Executive",
  "Manager",
  "L1",
  "L2",
  "L3",
  "L4",
  "L5",
] as const;


const STAFF_DESIGNATION_OPTIONS = [
  "Company Employee",
  "State Franchise",
  "District Franchise",
  "City Franchise",
] as const;

type StaffFormState = {
  name: string;
  email: string;
  phone_number: string;
  password: string;
  role: string;
  designation: string;
  department: string;
  notes: string;
  geographic_access: { states: string[]; cities: string[] };
  permissions: CreateStaffPermissions;
};

type FranchiseLevel = "state" | "district" | "city";

type FranchiseFormState = {
  name: string;
  email: string;
  phone_number: string;
  password: string;
  owner_name: string;
  owner_email: string;
  owner_phone: string;
  level: FranchiseLevel;
  address: string;
  pin_code: string;
  business_registration_number: string;
  gst_number: string;
  pan_number: string;
  commission_percentage: string;
  description: string;
};

const initialFranchiseForm = (): FranchiseFormState => ({
  name: "",
  email: "",
  phone_number: "",
  password: "",
  owner_name: "",
  owner_email: "",
  owner_phone: "",
  level: "state",
  address: "",
  pin_code: "",
  business_registration_number: "",
  gst_number: "",
  pan_number: "",
  commission_percentage: "10",
  description: "",
});

type FranchiseTerritoryDistrict = {
  district_id: number;
  city_ids: number[];
};

type FranchiseTerritoryState = {
  state_id: number;
  districts: FranchiseTerritoryDistrict[];
};

/**
 * Builds `territories` for POST /api/v1/super-admin/franchises/franchises.
 * Backend rules (auto-derives multi_state / state / district / city):
 * - `districts: []` → whole state
 * - `city_ids: []` under a district → whole district
 * - City rows must belong to their district + state (validated server-side).
 *
 * UI "Franchise level" only drives how we fill this shape; we do not send `level` in JSON.
 */
function buildFranchiseTerritories(
  level: FranchiseLevel,
  selectedStateCodes: string[],
  locationStates: IndianState[],
  selectedCityIds: number[],
  citiesList: FranchiseCityOption[],
  districtPicks: FranchiseDistrictPick[] | null,
):
  | { ok: true; territories: FranchiseTerritoryState[] }
  | { ok: false; message: string } {
  const cityById = new Map(citiesList.map((c) => [c.id, c]));
  const stateIdByCode = new Map<string, number>();
  for (const code of selectedStateCodes) {
    const s = locationStates.find((x) => x.code === code);
    if (s?.id == null || !Number.isFinite(s.id)) {
      return {
        ok: false,
        message: `State "${code}" has no numeric ID in the directory. The locations API must return an id for each state.`,
      };
    }
    stateIdByCode.set(code, s.id);
  }

  if (level === "state") {
    const territories: FranchiseTerritoryState[] = selectedStateCodes.map(
      (code) => ({
        state_id: stateIdByCode.get(code)!,
        districts: [],
      }),
    );
    return { ok: true, territories };
  }

  if (level === "district") {
    if (!districtPicks || districtPicks.length === 0) {
      return {
        ok: false,
        message:
          "Select at least one district in each selected state (from the franchise districts list).",
      };
    }
    const byState = new Map<number, Set<number>>();
    for (const p of districtPicks) {
      if (!byState.has(p.state_id)) byState.set(p.state_id, new Set());
      byState.get(p.state_id)!.add(p.district_id);
    }
    for (const code of selectedStateCodes) {
      const sid = stateIdByCode.get(code);
      if (sid == null) continue;
      const set = byState.get(sid);
      if (!set || set.size === 0) {
        return {
          ok: false,
          message:
            "Select at least one district in each selected state (from the franchise districts list).",
        };
      }
    }
    const territories: FranchiseTerritoryState[] = selectedStateCodes.map(
      (code) => {
        const sid = stateIdByCode.get(code)!;
        const dset = byState.get(sid) ?? new Set<number>();
        return {
          state_id: sid,
          districts: [...dset].map((did) => ({
            district_id: did,
            city_ids: [] as number[],
          })),
        };
      },
    );
    return { ok: true, territories };
  }

  if (level === "city") {
  if (selectedCityIds.length === 0) {
    return {
      ok: false,
      message: "Select at least one city.",
    };
  }

  const selectedCities = selectedCityIds
    .map((id) => cityById.get(id))
    .filter((c): c is FranchiseCityOption => c != null);

  if (selectedCities.length !== selectedCityIds.length) {
    return {
      ok: false,
      message: "Some selected cities are no longer valid. Refresh and try again.",
    };
  }

  const statesFromCities = new Set(selectedCities.map((c) => c.state_code));
  for (const code of selectedStateCodes) {
    if (!statesFromCities.has(code)) {
      return {
        ok: false,
        message:
          "For city level, pick at least one city in every selected state.",
      };
    }
  }

  const groups = new Map<
    string,
    { state_id: number; district_id: number; city_ids: number[] }
  >();
  for (const c of selectedCities) {
    if (c.district_id == null || !Number.isFinite(c.district_id)) {
      return {
        ok: false,
        message:
          "Each city must include district_id from the locations API for city-level franchises.",
      };
    }
    const sid = stateIdByCode.get(c.state_code)!;
    const key = `${sid}:${c.district_id}`;
    if (!groups.has(key)) {
      groups.set(key, {
        state_id: sid,
        district_id: c.district_id,
        city_ids: [],
      });
    }
    groups.get(key)!.city_ids.push(c.id);
  }

  const districtsByStateId = new Map<number, FranchiseTerritoryDistrict[]>();
  for (const g of groups.values()) {
    if (!districtsByStateId.has(g.state_id)) {
      districtsByStateId.set(g.state_id, []);
    }
    districtsByStateId.get(g.state_id)!.push({
      district_id: g.district_id,
      city_ids: g.city_ids,
    });
  }

  const territories: FranchiseTerritoryState[] = selectedStateCodes.map(
    (code) => {
      const sid = stateIdByCode.get(code)!;
      return {
        state_id: sid,
        districts: districtsByStateId.get(sid) ?? [],
      };
    },
  );
  return { ok: true, territories };
  }

  return {
    ok: false,
    message: "Unsupported franchise level.",
  };
}

/** Body for POST /api/v1/super-admin/franchises/franchises — matches multi-state / district / city territory schema. */
function buildCreateFranchisePayload(
  form: FranchiseFormState,
  territories: FranchiseTerritoryState[],
): Record<string, unknown> {
  const commission = Number(form.commission_percentage);

  return {
    name: form.name.trim(),
    email: form.email.trim(),
    phone_number: form.phone_number.replace(/\s/g, ""),
    password: form.password,
    owner_name: form.owner_name.trim(),
    owner_email: form.owner_email.trim(),
    owner_phone: form.owner_phone.replace(/\s/g, ""),
    address: form.address.trim(),
    pin_code: form.pin_code.trim(),
    business_registration_number: form.business_registration_number.trim(),
    gst_number: form.gst_number.trim(),
    pan_number: form.pan_number.trim(),
    commission_percentage: Number.isFinite(commission) ? commission : 0,
    description: form.description.trim(),
    territories,
    permissions: {},
  };
}

function buildCreateStaffPayload(form: StaffFormState): Record<string, unknown> {
  const states = form.geographic_access.states.map((s) => s.trim()).filter(Boolean);
  const cities = form.geographic_access.cities.map((c) => c.trim()).filter(Boolean);
  const notes = form.notes.trim();

  return {
    name: form.name.trim(),
    email: form.email.trim(),
    phone_number: form.phone_number.replace(/\s/g, ""),
    password: form.password,
    role: form.role.trim() || STAFF_ROLE_OPTIONS[0],
    designation: form.designation.trim() || STAFF_DESIGNATION_OPTIONS[0],
    department: form.department.trim(),
    geographic_access: {
      states,
      cities,
    },
    permissions: { ...form.permissions },
    ...(notes ? { notes } : {}),
  };
}

/** Path param for GET /admin-staff-management/staff/{staff_id} — prefer numeric staff_id from API when present. */
function staffDetailPathId(user: AdminUser): number {
  if (user.staff_id != null && String(user.staff_id).trim() !== "") {
    const n = Number(user.staff_id);
    if (Number.isFinite(n)) return n;
  }
  return user.id;
}

function normalizeStaffRow(raw: unknown): AdminUser | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === "number" ? r.id : Number(r.id);
  if (!Number.isFinite(id)) return null;

  const statesRaw = r.geographic_access;
  let states: string[] = [];
  let cities: string[] = [];
  if (statesRaw && typeof statesRaw === "object" && !Array.isArray(statesRaw)) {
    const g = statesRaw as Record<string, unknown>;
    if (Array.isArray(g.states)) states = g.states.filter((x): x is string => typeof x === "string");
    if (Array.isArray(g.cities)) cities = g.cities.filter((x): x is string => typeof x === "string");
  }
  if (Array.isArray(r.accessible_states)) {
    states = r.accessible_states.filter((x): x is string => typeof x === "string");
  }
  if (Array.isArray(r.accessible_cities)) {
    cities = r.accessible_cities.filter((x): x is string => typeof x === "string");
  }

  return {
    id,
    staff_id:
      typeof r.staff_id === "string"
        ? r.staff_id
        : typeof r.staff_id === "number" && Number.isFinite(r.staff_id)
          ? String(r.staff_id)
          : undefined,
    name: typeof r.name === "string" ? r.name : "",
    email: typeof r.email === "string" ? r.email : "",
    phone_number: typeof r.phone_number === "string" ? r.phone_number : undefined,
    designation: typeof r.designation === "string" ? r.designation : undefined,
    is_active: r.is_active === true,
    geographic_access: { states, cities },
    permissions:
      r.permissions && typeof r.permissions === "object" && !Array.isArray(r.permissions)
        ? (r.permissions as Record<string, boolean>)
        : undefined,
    created_at: typeof r.created_at === "string" ? r.created_at : "",
    last_login: typeof r.last_login === "string" || r.last_login === null ? (r.last_login as string | null) : undefined,
  };
}

export default function StaffPage() {
  const router = useRouter();
  const toast = useToast();
  const askConfirm = useConfirm();
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [hierarchyTab, setHierarchyTab] = useState<HierarchyTab>("roles");
  const [franchises, setFranchises] = useState<FranchiseRecord[]>([]);
  const [franchisesLoading, setFranchisesLoading] = useState(false);
  const [deletingStaffId, setDeletingStaffId] = useState<number | null>(null);
  const [deletingFranchiseId, setDeletingFranchiseId] = useState<number | null>(
    null,
  );
  const [showForm, setShowForm] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  
  const initialFormData: StaffFormState = {
    name: '',
    email: '',
    phone_number: '',
    password: '',
    role: STAFF_ROLE_OPTIONS[0],
    designation: STAFF_DESIGNATION_OPTIONS[0],
    department: '',
    notes: '',
    geographic_access: {
      states: [] as string[],
      cities: [] as string[],
    },
    permissions: {
      can_view_clinics: true,
      can_edit_clinics: false,
      can_delete_clinics: false,
      can_view_doctors: true,
      can_edit_doctors: false,
      can_view_patients: true,
      can_view_appointments: true,
      can_edit_appointments: false,
      can_view_payments: true,
      can_view_subscriptions: true,
      can_view_staff: true,
      can_edit_staff: false,
      can_view_analytics: true,
    },
  };

  const [formData, setFormData] = useState<StaffFormState>(initialFormData);
  const [locationStates, setLocationStates] = useState<IndianState[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [locationsError, setLocationsError] = useState<string | null>(null);
  const [selectedStateCode, setSelectedStateCode] = useState('');
  const [citiesList, setCitiesList] = useState<IndianCity[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);

  const [showFranchiseForm, setShowFranchiseForm] = useState(false);
  const [franchiseForm, setFranchiseForm] = useState<FranchiseFormState>(
    initialFranchiseForm,
  );
  const [franchiseSubmitting, setFranchiseSubmitting] = useState(false);
  const [franchiseLocationStates, setFranchiseLocationStates] = useState<
    IndianState[]
  >([]);
  const [franchiseLocationsLoading, setFranchiseLocationsLoading] =
    useState(false);
  const [franchiseLocationsError, setFranchiseLocationsError] = useState<
    string | null
  >(null);
  const [franchiseSelectedStateCodes, setFranchiseSelectedStateCodes] =
    useState<string[]>([]);
  const [franchiseStateDropdownOpen, setFranchiseStateDropdownOpen] =
    useState(false);
  const franchiseStateDropdownRef = useRef<HTMLDivElement>(null);
  const [franchiseCitiesList, setFranchiseCitiesList] = useState<
    FranchiseCityOption[]
  >([]);
  const [franchiseCitiesLoading, setFranchiseCitiesLoading] = useState(false);
  const [franchiseSelectedCityIds, setFranchiseSelectedCityIds] = useState<
    number[]
  >([]);
  const [franchiseCityDropdownOpen, setFranchiseCityDropdownOpen] =
    useState(false);
  const franchiseCityDropdownRef = useRef<HTMLDivElement>(null);
  const [franchiseDistrictOptions, setFranchiseDistrictOptions] = useState<
    FranchiseDistrictOption[]
  >([]);
  const [franchiseDistrictsLoading, setFranchiseDistrictsLoading] =
    useState(false);
  const [franchiseSelectedDistrictKeys, setFranchiseSelectedDistrictKeys] =
    useState<string[]>([]);
  const [franchiseDistrictDropdownOpen, setFranchiseDistrictDropdownOpen] =
    useState(false);
  const franchiseDistrictDropdownRef = useRef<HTMLDivElement>(null);

  const togglePermission = (key: keyof CreateStaffPermissions) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: !prev.permissions[key]
      }
    }));
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.get("/api/v1/admin-staff-management/staff");
      const rows = extractStaffList(result);
      const normalized = rows
        .map(normalizeStaffRow)
        .filter((u): u is AdminUser => u != null);
      setAdminUsers(normalized);
    } catch (err: unknown) {
      console.error("Fetch staff error:", err);
      setAdminUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchFranchises = useCallback(async () => {
    setFranchisesLoading(true);
    try {
      const qs = new URLSearchParams({
        skip: "0",
        limit: "100",
      });
      const result = await api.get(
        `/api/v1/super-admin/franchises/franchises?${qs}`,
      );
      const rows = extractFranchiseList(result);
      const normalized = rows
        .map(normalizeFranchiseRow)
        .filter((f): f is FranchiseRecord => f != null);
      setFranchises(normalized);
    } catch (err: unknown) {
      console.error("Fetch franchises error:", err);
      setFranchises([]);
    } finally {
      setFranchisesLoading(false);
    }
  }, []);


  const handleFranchiseViewProfile = (f: FranchiseRecord) => {
    if (!Number.isFinite(f.id)) return;
    router.push(
      `/staff/franchise-details?id=${encodeURIComponent(String(f.id))}`,
    );
  };

  const franchiseDeletePath = (franchiseId: number, force: boolean) =>
    `/api/v1/super-admin/franchises/franchises/${encodeURIComponent(String(franchiseId))}${
      force ? "?force=true" : ""
    }`;

  const handleDeleteFranchise = async (f: FranchiseRecord) => {
    const label = f.name?.trim() || f.email || "this franchise";
    const ok1 = await askConfirm({
      title: "Delete franchise",
      message: `Delete ${label}? This cannot be undone.`,
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      variant: "danger",
    });
    if (!ok1) return;
    setDeletingFranchiseId(f.id);
    try {
      await api.delete(franchiseDeletePath(f.id, false));
      setFranchises((prev) => prev.filter((x) => x.id !== f.id));
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : "Could not delete franchise.";
      const ok2 = await askConfirm({
        title: "Force delete?",
        message: `${msg}\n\nForce delete? This may orphan associated clinics and staff.`,
        confirmLabel: "Force delete",
        cancelLabel: "Cancel",
        variant: "danger",
      });
      if (!ok2) return;
      try {
        await api.delete(franchiseDeletePath(f.id, true));
        setFranchises((prev) => prev.filter((x) => x.id !== f.id));
      } catch (e2: unknown) {
        toast.error(
          e2 instanceof Error ? e2.message : "Force delete failed.",
        );
      }
    } finally {
      setDeletingFranchiseId(null);
    }
  };

  const handleDeleteStaffMember = useCallback(
    async (user: AdminUser) => {
      const sid = staffDetailPathId(user);
      const ok = await askConfirm({
        title: "Delete staff member",
        message: `Delete ${user.name}? This removes the account and all associated activity logs.`,
        confirmLabel: "Delete",
        cancelLabel: "Cancel",
        variant: "danger",
      });
      if (!ok) return;
      setDeletingStaffId(sid);
      try {
        await api.delete(`/api/v1/admin-staff-management/staff/${sid}`);
        setAdminUsers((prev) =>
          prev.filter((u) => staffDetailPathId(u) !== sid),
        );
      } catch (err: unknown) {
        toast.error(
          err instanceof Error ? err.message : "Could not delete staff member.",
        );
      } finally {
        setDeletingStaffId(null);
      }
    },
    [toast, askConfirm],
  );

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    if (hierarchyTab === "franchises") void fetchFranchises();
  }, [hierarchyTab, fetchFranchises]);

  useEffect(() => {
    if (!showForm) return;
    let cancelled = false;
    setLocationsLoading(true);
    setLocationsError(null);
    void fetchIndianStates()
      .then((list) => {
        if (!cancelled) setLocationStates(list);
      })
      .catch(() => {
        if (!cancelled) {
          setLocationsError("Could not load states.");
          setLocationStates([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLocationsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showForm]);

  useEffect(() => {
    if (!showForm || !selectedStateCode) {
      setCitiesList([]);
      setFormData((prev) => {
        if (prev.geographic_access.cities.length === 0) return prev;
        return {
          ...prev,
          geographic_access: { ...prev.geographic_access, cities: [] },
        };
      });
      return;
    }

    let cancelled = false;
    setCitiesLoading(true);
    void fetchCitiesByStateCode(selectedStateCode)
      .then((list) => {
        if (cancelled) return;
        setCitiesList(list);
        setFormData((prev) => {
          const allowed = new Set(list.map((c) => c.name));
          const cities = prev.geographic_access.cities.filter((n) =>
            allowed.has(n),
          );
          return {
            ...prev,
            geographic_access: { ...prev.geographic_access, cities },
          };
        });
      })
      .catch(() => {
        if (!cancelled) setCitiesList([]);
      })
      .finally(() => {
        if (!cancelled) setCitiesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showForm, selectedStateCode]);

  useEffect(() => {
    if (!showFranchiseForm) return;
    let cancelled = false;
    setFranchiseLocationsLoading(true);
    setFranchiseLocationsError(null);
    void fetchIndianStates()
      .then((list) => {
        if (!cancelled) setFranchiseLocationStates(list);
      })
      .catch(() => {
        if (!cancelled) {
          setFranchiseLocationsError("Could not load states.");
          setFranchiseLocationStates([]);
        }
      })
      .finally(() => {
        if (!cancelled) setFranchiseLocationsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showFranchiseForm]);

  useEffect(() => {
    if (!showFranchiseForm || franchiseSelectedStateCodes.length === 0) {
      setFranchiseCitiesList([]);
      setFranchiseSelectedCityIds([]);
      return;
    }
    if (franchiseForm.level === "district") {
      setFranchiseCitiesList([]);
      setFranchiseSelectedCityIds([]);
      return;
    }

    let cancelled = false;
    setFranchiseCitiesLoading(true);
    void fetchCitiesMergedForStateCodes(franchiseSelectedStateCodes)
      .then((list) => {
        if (cancelled) return;
        setFranchiseCitiesList(list);
        const idSet = new Set(list.map((c) => c.id));
        setFranchiseSelectedCityIds((prev) =>
          prev.filter((id) => idSet.has(id)),
        );
      })
      .catch(() => {
        if (!cancelled) {
          setFranchiseCitiesList([]);
          setFranchiseSelectedCityIds([]);
        }
      })
      .finally(() => {
        if (!cancelled) setFranchiseCitiesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showFranchiseForm, franchiseSelectedStateCodes, franchiseForm.level]);

  useEffect(() => {
    if (
      !showFranchiseForm ||
      franchiseForm.level !== "district" ||
      franchiseSelectedStateCodes.length === 0
    ) {
      setFranchiseDistrictOptions([]);
      setFranchiseSelectedDistrictKeys([]);
      return;
    }

    let cancelled = false;
    setFranchiseDistrictsLoading(true);
    void (async () => {
      const merged: FranchiseDistrictOption[] = [];
      for (const code of franchiseSelectedStateCodes) {
        const st = franchiseLocationStates.find((x) => x.code === code);
        if (st?.id == null || !Number.isFinite(st.id)) continue;
        try {
          const rows = await fetchFranchiseDistrictsByStateId(st.id);
          if (cancelled) return;
          for (const d of rows) {
            merged.push({
              state_id: st.id,
              state_code: code,
              id: d.id,
              name: d.name,
            });
          }
        } catch {
          /* skip state on failure */
        }
      }
      if (cancelled) return;
      merged.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      );
      setFranchiseDistrictOptions(merged);
      setFranchiseSelectedDistrictKeys((prev) =>
        prev.filter((key) =>
          merged.some((o) => `${o.state_id}:${o.id}` === key),
        ),
      );
    })().finally(() => {
      if (!cancelled) setFranchiseDistrictsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [
    showFranchiseForm,
    franchiseForm.level,
    franchiseSelectedStateCodes,
    franchiseLocationStates,
  ]);

  useEffect(() => {
    if (!showFranchiseForm) {
      setFranchiseStateDropdownOpen(false);
      setFranchiseCityDropdownOpen(false);
      setFranchiseDistrictDropdownOpen(false);
    }
  }, [showFranchiseForm]);

  useEffect(() => {
    if (!franchiseStateDropdownOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const el = franchiseStateDropdownRef.current;
      if (!el || el.contains(e.target as Node)) return;
      setFranchiseStateDropdownOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFranchiseStateDropdownOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [franchiseStateDropdownOpen]);

  useEffect(() => {
    if (!franchiseCityDropdownOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const el = franchiseCityDropdownRef.current;
      if (!el || el.contains(e.target as Node)) return;
      setFranchiseCityDropdownOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFranchiseCityDropdownOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [franchiseCityDropdownOpen]);

  useEffect(() => {
    if (!franchiseDistrictDropdownOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const el = franchiseDistrictDropdownRef.current;
      if (!el || el.contains(e.target as Node)) return;
      setFranchiseDistrictDropdownOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFranchiseDistrictDropdownOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [franchiseDistrictDropdownOpen]);

  const handleRegisterUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = buildCreateStaffPayload(formData);
      const result = await api.post<{
        success?: boolean;
        message?: string;
      }>("/api/v1/admin-staff-management/staff", payload);

      if (result && typeof result === "object" && result.success === false) {
        toast.error(
          typeof result.message === "string"
            ? result.message
            : "Could not create admin staff.",
        );
        return;
      }

      toast.success(
        typeof result.message === "string" && result.message
          ? result.message
          : "Admin staff created successfully.",
      );
      setShowForm(false);
      setFormData(initialFormData);
      setSelectedStateCode('');
      setCitiesList([]);
      void fetchUsers();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Request failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFranchise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (franchiseSelectedStateCodes.length === 0) {
      toast.error("Select at least one state.");
      return;
    }

    const districtPicksForPayload: FranchiseDistrictPick[] | null =
      franchiseForm.level === "district"
        ? franchiseSelectedDistrictKeys
            .map((key) => {
              const parts = key.split(":");
              if (parts.length !== 2) return null;
              const state_id = Number(parts[0]);
              const district_id = Number(parts[1]);
              if (!Number.isFinite(state_id) || !Number.isFinite(district_id)) {
                return null;
              }
              return { state_id, district_id };
            })
            .filter((x): x is FranchiseDistrictPick => x != null)
        : null;

    const territoryResult = buildFranchiseTerritories(
      franchiseForm.level,
      franchiseSelectedStateCodes,
      franchiseLocationStates,
      franchiseSelectedCityIds,
      franchiseCitiesList,
      districtPicksForPayload,
    );
    if (!territoryResult.ok) {
      toast.error(territoryResult.message);
      return;
    }

    setFranchiseSubmitting(true);
    try {
      const payload = buildCreateFranchisePayload(
        franchiseForm,
        territoryResult.territories,
      );
      const result = await api.post<{
        success?: boolean;
        message?: string;
      }>("/api/v1/super-admin/franchises/franchises", payload);

      if (result && typeof result === "object" && result.success === false) {
        toast.error(
          typeof result.message === "string" && result.message.trim()
            ? result.message
            : "Franchise was not created.",
        );
        return;
      }

      toast.success(
        typeof result?.message === "string" && result.message.trim()
          ? result.message
          : "Franchise created successfully.",
      );
      setShowFranchiseForm(false);
      setFranchiseForm(initialFranchiseForm());
      setFranchiseSelectedStateCodes([]);
      setFranchiseCitiesList([]);
      setFranchiseSelectedCityIds([]);
      setFranchiseDistrictOptions([]);
      setFranchiseSelectedDistrictKeys([]);
      void fetchUsers();
      void fetchFranchises();
      setHierarchyTab("franchises");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Could not create franchise.",
      );
    } finally {
      setFranchiseSubmitting(false);
    }
  };

  return (
    <div className="page-container staff-page">
      <div className="page-header staff-page-header">
        <div className="staff-page-header-text">
          <h1 className="page-title">Platform Hierarchy</h1>
          <p className="page-subtitle">Security Architecture & Jurisdictional Access Control</p>
          <div
            className="staff-hierarchy-tabs"
            role="tablist"
            aria-label="Hierarchy view"
          >
            <button
              type="button"
              role="tab"
              aria-selected={hierarchyTab === "roles"}
              className={`staff-hierarchy-tab${hierarchyTab === "roles" ? " staff-hierarchy-tab-active" : ""}`}
              onClick={() => setHierarchyTab("roles")}
            >
              <Users size={16} aria-hidden />
              Roles
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={hierarchyTab === "franchises"}
              className={`staff-hierarchy-tab${hierarchyTab === "franchises" ? " staff-hierarchy-tab-active" : ""}`}
              onClick={() => setHierarchyTab("franchises")}
            >
              <Store size={16} aria-hidden />
              Franchises
            </button>
          </div>
        </div>
        <div className="staff-page-header-actions">
          <button
            type="button"
            className="btn btn-primary staff-page-header-action"
            onClick={() => {
              setFranchiseForm(initialFranchiseForm());
              setFranchiseSelectedStateCodes([]);
              setFranchiseCitiesList([]);
              setFranchiseSelectedCityIds([]);
              setFranchiseDistrictOptions([]);
              setFranchiseSelectedDistrictKeys([]);
              setFranchiseLocationsError(null);
              setShowFranchiseForm(true);
            }}
          >
            <Store size={18} />
            <span>Create Franchise</span>
          </button>
          <button type="button" className="btn btn-primary staff-page-header-action" onClick={() => {
          setModalMode('create');
          setFormData(initialFormData);
          setSelectedStateCode('');
          setCitiesList([]);
          setLocationsError(null);
          setShowForm(true);
        }}>
          <UserPlus size={18} />
          <span>Provision New Role</span>
        </button>
        </div>
      </div>

      {/* Error & Access Restricted State (roles only) */}
      {hierarchyTab === "roles" && !loading && adminUsers.length === 0 && (
         <div className="card" style={{ padding: '80px 24px', textAlign: 'center', background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)' }}>
            <div style={{ background: '#fef2f2', color: '#ef4444', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
               <ShieldAlert size={32} />
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>Security Handshake Required</h2>
            <p style={{ color: '#64748b', maxWidth: '400px', margin: '0 auto 24px', fontSize: '14px' }}>
               Your current authorization tier does not permit access to the platform's security hierarchy. Please verify super-admin credentials or check backend synchronization logs.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
               <button className="btn btn-secondary" onClick={() => fetchUsers()}>Re-target API</button>
               <button className="btn btn-primary" style={{ background: '#ef4444' }} onClick={() => router.push('/')}>Return to Dashboard</button>
            </div>
         </div>
      )}

      {hierarchyTab === "roles" && (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '24px' }}>
        {loading && adminUsers.length === 0 ? (
          Array(6).fill(0).map((_, i) => (
            <div key={i} className="card" style={{ height: '220px', background: '#f8fafc', animation: 'pulse 1.5s infinite ease-in-out' }}></div>
          ))
        ) : adminUsers.map((user) => (
          <div key={user.id} className="card staff-card-premium" style={{ position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, right: 0, width: '120px', height: '120px', background: 'linear-gradient(225deg, rgba(99, 102, 241, 0.05) 0%, transparent 70%)', borderRadius: '0 0 0 100%' }}></div>
            
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div className="staff-avatar" style={{ width: '56px', height: '56px', fontSize: '20px', borderRadius: '16px' }}>
                    {user.name.charAt(0)}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#1e293b', marginBottom: '2px' }}>{user.name}</h3>
                    <p style={{ fontSize: '13px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Mail size={12} /> {user.email}
                    </p>
                    <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Phone size={12} /> {user.phone_number || 'No contact sync'}
                    </p>
                  </div>
                </div>
                <span className={`badge badge-${user.is_active ? 'success' : 'danger'}`} style={{ fontSize: '10px' }}>
                  {user.is_active ? 'ACTIVE' : 'RESTRICTED'}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                   <span style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Designation</span>
                   <span className="role-badge primary-light" style={{ margin: 0 }}>{user.designation}</span>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                   <span style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Geo Jurisdiction</span>
                   <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {user.geographic_access?.states.map(s => <span key={s} className="geo-tag" style={{ background: '#f5f3ff', color: '#2A4638' }}><Globe size={10} style={{marginRight: 4}}/> {s}</span>)}
                      {user.geographic_access?.cities.map(c => <span key={c} className="geo-tag" style={{ background: '#f0f9ff', color: '#0ea5e9' }}><MapPin size={10} style={{marginRight: 4}}/> {c}</span>)}
                      {(!user.geographic_access?.states?.length && !user.geographic_access?.cities?.length) && <span style={{ fontSize: '12px', color: '#64748b' }}>Full India Authority</span>}
                   </div>
                </div>
              </div>

              <div className="staff-card-actions">
                <button
                  type="button"
                  className="btn btn-secondary staff-card-actions-primary"
                  onClick={() =>
                    router.push(
                      `/staff/details?id=${staffDetailPathId(user)}&mode=view`,
                    )
                  }
                >
                  View Profile
                </button>
                <div className="staff-card-actions-icons">
                  <button
                    type="button"
                    className="btn btn-primary staff-card-icon-btn"
                    aria-label="Edit staff"
                    onClick={() =>
                      router.push(
                        `/staff/details?id=${staffDetailPathId(user)}&mode=edit`,
                      )
                    }
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary staff-card-icon-btn staff-card-icon-btn-danger"
                    aria-label="Remove staff"
                    disabled={deletingStaffId === staffDetailPathId(user)}
                    onClick={() => void handleDeleteStaffMember(user)}
                  >
                    {deletingStaffId === staffDetailPathId(user) ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : (
                      <Trash2 size={16} />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      )}

      {hierarchyTab === "franchises" && !franchisesLoading && franchises.length === 0 && (
        <div
          className="card"
          style={{
            padding: "56px 24px",
            textAlign: "center",
            background: "rgba(255,255,255,0.85)",
            backdropFilter: "blur(10px)",
            marginBottom: 24,
          }}
        >
          <div
            style={{
              background: "#f5f3ff",
              color: "#2A4638",
              width: "64px",
              height: "64px",
              borderRadius: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
            }}
          >
            <Store size={28} />
          </div>
          <h2
            style={{
              fontSize: "18px",
              fontWeight: 800,
              color: "#1e293b",
              marginBottom: "8px",
            }}
          >
            No franchises yet
          </h2>
          <p
            style={{
              color: "#64748b",
              maxWidth: "420px",
              margin: "0 auto 20px",
              fontSize: "14px",
            }}
          >
            Create a franchise partner with the button above, or refresh if you
            expect data from the API.
          </p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => void fetchFranchises()}
          >
            Refresh list
          </button>
        </div>
      )}

      {hierarchyTab === "franchises" && (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '24px' }}>
        {franchisesLoading && franchises.length === 0 ? (
          Array(6).fill(0).map((_, i) => (
            <div key={i} className="card" style={{ height: '220px', background: '#f8fafc', animation: 'pulse 1.5s infinite ease-in-out' }}></div>
          ))
        ) : (
          franchises.map((f) => {
            const displayName = f.name.trim() || f.email || "Franchise";
            const initial = displayName.charAt(0).toUpperCase();
            const levelLabel = (f.level || "—").toString().toUpperCase();
            const geoParts = franchiseGeoSummary(f);
            return (
              <div
                key={f.id}
                className="card staff-card-premium"
                style={{ position: "relative", overflow: "hidden" }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    width: "120px",
                    height: "120px",
                    background:
                      "linear-gradient(225deg, rgba(42, 70, 56, 0.08) 0%, transparent 70%)",
                    borderRadius: "0 0 0 100%",
                  }}
                />
                <div style={{ padding: "24px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      marginBottom: "20px",
                    }}
                  >
                    <div style={{ display: "flex", gap: "16px" }}>
                      <div
                        className="staff-avatar"
                        style={{
                          width: "56px",
                          height: "56px",
                          fontSize: "20px",
                          borderRadius: "16px",
                        }}
                      >
                        {initial}
                      </div>
                      <div>
                        <h3
                          style={{
                            fontSize: "16px",
                            fontWeight: 800,
                            color: "#1e293b",
                            marginBottom: "2px",
                          }}
                        >
                          {displayName}
                        </h3>
                        <p
                          style={{
                            fontSize: "13px",
                            color: "#64748b",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <Mail size={12} /> {f.email || "—"}
                        </p>
                        <p
                          style={{
                            fontSize: "12px",
                            color: "#64748b",
                            marginTop: "4px",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <Phone size={12} />{" "}
                          {f.phone_number || "No contact sync"}
                        </p>
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-end",
                        gap: "6px",
                      }}
                    >
                      <span
                        className={`badge badge-${f.is_active ? "success" : "danger"}`}
                        style={{ fontSize: "10px" }}
                      >
                        {f.is_active ? "ACTIVE" : "INACTIVE"}
                      </span>
                      {f.is_verified === false && (
                        <span
                          className="badge"
                          style={{
                            fontSize: "9px",
                            background: "#fef3c7",
                            color: "#92400e",
                          }}
                        >
                          UNVERIFIED
                        </span>
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                      borderTop: "1px solid #f1f5f9",
                      paddingTop: "16px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: 700,
                          color: "#94a3b8",
                          textTransform: "uppercase",
                        }}
                      >
                        Level
                      </span>
                      <span
                        className="role-badge primary-light"
                        style={{ margin: 0 }}
                      >
                        {levelLabel}
                      </span>
                    </div>
                    {f.owner_name ? (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "12px",
                            fontWeight: 700,
                            color: "#94a3b8",
                            textTransform: "uppercase",
                          }}
                        >
                          Owner
                        </span>
                        <span
                          style={{
                            fontSize: "12px",
                            fontWeight: 600,
                            color: "#475569",
                          }}
                        >
                          {f.owner_name}
                        </span>
                      </div>
                    ) : null}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: 700,
                          color: "#94a3b8",
                          textTransform: "uppercase",
                        }}
                      >
                        Geo scope
                      </span>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "4px",
                        }}
                      >
                        {geoParts.length > 0 ? (
                          geoParts.map((g) => (
                            <span
                              key={g}
                              className="geo-tag"
                              style={{
                                background: "#f5f3ff",
                                color: "#2A4638",
                              }}
                            >
                              <MapPin
                                size={10}
                                style={{ marginRight: 4 }}
                                aria-hidden
                              />{" "}
                              {g}
                            </span>
                          ))
                        ) : (
                          <span
                            style={{ fontSize: "12px", color: "#64748b" }}
                          >
                            Not specified
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="staff-card-actions">
                    <button
                      type="button"
                      className="btn btn-secondary staff-card-actions-primary"
                      onClick={() => handleFranchiseViewProfile(f)}
                    >
                      View profile
                    </button>
                    <div className="staff-card-actions-icons">
                      <button
                        type="button"
                        className="btn btn-primary staff-card-icon-btn"
                        aria-label="Edit franchise"
                        onClick={() =>
                          router.push(
                            `/staff/franchise-details?id=${encodeURIComponent(String(f.id))}&mode=edit`,
                          )
                        }
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary staff-card-icon-btn staff-card-icon-btn-danger"
                        aria-label="Delete franchise"
                        disabled={deletingFranchiseId === f.id}
                        onClick={() => void handleDeleteFranchise(f)}
                      >
                        {deletingFranchiseId === f.id ? (
                          <Loader2 className="animate-spin" size={16} />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      )}

      {showForm && (
        <div className="modal-overlay animate-in" style={{ zIndex: 9999 }}>
          <div className="modal-content glass-modal animate-in" style={{ maxWidth: '950px', width: '100%', maxHeight: '95vh', overflowY: 'auto' }}>
            <div className="modal-header" style={{ padding: '24px 32px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ background: '#f5f3ff', color: '#2A4638', padding: '10px', borderRadius: '12px' }}><UserPlus size={24} /></div>
                  <h3 style={{ fontSize: '20px', fontWeight: 800 }}>Provision System Authorization</h3>
               </div>
               <button onClick={() => setShowForm(false)}><X size={24} color="#94a3b8" /></button>
            </div>
            
            <form onSubmit={handleRegisterUser} style={{ padding: '32px' }}>
               <div className="form-grid" style={{ gridTemplateColumns: '1.2fr 0.8fr' }}>
                  
                  {/* Left Column: Data Input */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div className="form-group">
                        <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 700, color: '#475569' }}>Full Name</label>
                        <input type="text" className="form-input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Rahul Sharma" required />
                      </div>
                      <div className="form-group">
                        <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 700, color: '#475569' }}>Email Address</label>
                        <input type="email" className="form-input" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="rahul@aykacare.com" required />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div className="form-group">
                        <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 700, color: '#475569' }}>Contact Number</label>
                        <input type="text" className="form-input" value={formData.phone_number} onChange={e => setFormData({...formData, phone_number: e.target.value})} placeholder="+91 9876543210" required />
                      </div>
                      <div className="form-group">
                        <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 700, color: '#475569' }}>Access Password</label>
                        <input type="password" className="form-input" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="••••••••" required />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div className="form-group">
                        <label htmlFor="staff-role-select" style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 700, color: '#475569' }}>Role</label>
                        <select
                          id="staff-role-select"
                          className="form-input staff-form-select"
                          value={formData.role}
                          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                          required
                        >
                          {STAFF_ROLE_OPTIONS.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label htmlFor="staff-designation-select" style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 700, color: '#475569' }}>Designation</label>
                        <select
                          id="staff-designation-select"
                          className="form-input staff-form-select"
                          value={
                            (STAFF_DESIGNATION_OPTIONS as readonly string[]).includes(
                              formData.designation,
                            )
                              ? formData.designation
                              : formData.designation || STAFF_DESIGNATION_OPTIONS[0]
                          }
                          onChange={(e) =>
                            setFormData({ ...formData, designation: e.target.value })
                          }
                          required
                        >
                          {!(STAFF_DESIGNATION_OPTIONS as readonly string[]).includes(
                            formData.designation,
                          ) && formData.designation ? (
                            <option value={formData.designation}>{formData.designation}</option>
                          ) : null}
                          {STAFF_DESIGNATION_OPTIONS.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="form-group">
                      <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 700, color: '#475569' }}>Department</label>
                      <input type="text" className="form-input" value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })} placeholder="Operations, Support, …" />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'start' }}>
                      <div className="form-group">
                        <label htmlFor="staff-state-select" style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 700, color: '#475569' }}>
                          Authorized state
                        </label>
                        {locationsLoading ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12, color: '#64748b' }}>
                            <Loader2 className="animate-spin" size={18} />
                            <span style={{ fontSize: 13 }}>Loading states…</span>
                          </div>
                        ) : locationsError ? (
                          <p style={{ color: '#b91c1c', fontSize: 13 }}>{locationsError}</p>
                        ) : (
                          <select
                            id="staff-state-select"
                            className="form-input staff-form-select"
                            value={selectedStateCode}
                            onChange={(e) => {
                              const code = e.target.value;
                              setSelectedStateCode(code);
                              const st = locationStates.find((s) => s.code === code);
                              setFormData((prev) => ({
                                ...prev,
                                geographic_access: {
                                  states: st ? [st.name] : [],
                                  cities: [],
                                },
                              }));
                            }}
                          >
                            <option value="">Select state</option>
                            {locationStates.map((s) => (
                              <option key={s.code} value={s.code}>
                                {s.name} ({s.code})
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                      <div className="form-group">
                        <label htmlFor="staff-city-select" style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 700, color: '#475569' }}>
                          Authorized city
                        </label>
                        {!selectedStateCode ? (
                          <select id="staff-city-select" className="form-input staff-form-select" disabled value="">
                            <option value="">Select a state first</option>
                          </select>
                        ) : citiesLoading ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12, color: '#64748b' }}>
                            <Loader2 className="animate-spin" size={18} />
                            <span style={{ fontSize: 13 }}>Loading cities…</span>
                          </div>
                        ) : citiesList.length === 0 ? (
                          <select id="staff-city-select" className="form-input staff-form-select" disabled value="">
                            <option value="">No cities for this state</option>
                          </select>
                        ) : (
                          <select
                            id="staff-city-select"
                            className="form-input staff-form-select"
                            value={formData.geographic_access.cities[0] ?? ''}
                            onChange={(e) => {
                              const name = e.target.value;
                              setFormData((prev) => ({
                                ...prev,
                                geographic_access: {
                                  ...prev.geographic_access,
                                  cities: name ? [name] : [],
                                },
                              }));
                            }}
                          >
                            <option value="">Select city (optional)</option>
                            {citiesList.map((c) => (
                              <option key={c.id} value={c.name}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>

                    <div className="form-group">
                      <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 700, color: '#475569' }}>Notes</label>
                      <textarea className="form-input" rows={2} value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder="Optional internal notes" style={{ resize: 'vertical' }} />
                    </div>
                  </div>

                  {/* Right Column: Permissions */}
                  <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: 13, fontWeight: 800, color: '#2A4638', textTransform: 'uppercase' }}>
                      <ShieldCheck size={16} /> Administrative Rights
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: 'min(52vh, 420px)', overflowY: 'auto' }}>
                      {(Object.keys(formData.permissions) as (keyof CreateStaffPermissions)[]).map((p) => (
                        <div key={p} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'white', borderRadius: '10px', border: '1px solid #edf2f7', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                           <span style={{ fontSize: 12, fontWeight: 600, color: '#475569', textTransform: 'capitalize' }}>{p.replace(/_/g, ' ')}</span>
                           <input 
                             type="checkbox" 
                             style={{ width: 18, height: 18, cursor: 'pointer' }}
                             checked={formData.permissions[p]} 
                             onChange={() => togglePermission(p)} 
                           />
                        </div>
                      ))}
                    </div>
                  </div>
               </div>

               <div style={{ marginTop: 32, display: 'flex', justifyContent: 'flex-end', gap: 12, borderTop: '1px solid #f1f5f9', paddingTop: '24px' }}>
                  <button type="button" className="btn btn-secondary" style={{ padding: '12px 24px' }} onClick={() => setShowForm(false)}>Discard</button>
                  <button type="submit" className="btn btn-primary" style={{ background: '#2A4638', padding: '12px 32px', fontWeight: 700 }} disabled={loading}>
                     {loading ? <Loader2 className="animate-spin" size={18} /> : "Finalize Authorization"}
                  </button>
               </div>
            </form>
          </div>
        </div>
      )}

      {showFranchiseForm && (
        <div className="modal-overlay animate-in" style={{ zIndex: 9999 }}>
          <div
            className="modal-content glass-modal animate-in"
            style={{
              maxWidth: "920px",
              width: "100%",
              maxHeight: "95vh",
              overflowY: "auto",
            }}
          >
            <div
              className="modal-header"
              style={{
                padding: "24px 32px",
                borderBottom: "1px solid #f1f5f9",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div
                  style={{
                    background: "#f5f3ff",
                    color: "#2A4638",
                    padding: "10px",
                    borderRadius: "12px",
                  }}
                >
                  <Store size={24} />
                </div>
                <h3 style={{ fontSize: "20px", fontWeight: 800 }}>
                  Create Franchise Partner
                </h3>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setShowFranchiseForm(false)}
              >
                <X size={24} color="#94a3b8" />
              </button>
            </div>

            <form onSubmit={handleCreateFranchise} style={{ padding: "32px" }}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "20px",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "16px",
                  }}
                >
                  <div className="form-group">
                    <label
                      style={{
                        display: "block",
                        marginBottom: 8,
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#475569",
                      }}
                    >
                      Franchise name
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={franchiseForm.name}
                      onChange={(e) =>
                        setFranchiseForm((p) => ({ ...p, name: e.target.value }))
                      }
                      placeholder="Karnataka Franchise"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label
                      style={{
                        display: "block",
                        marginBottom: 8,
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#475569",
                      }}
                    >
                      Franchise email
                    </label>
                    <input
                      type="email"
                      className="form-input"
                      value={franchiseForm.email}
                      onChange={(e) =>
                        setFranchiseForm((p) => ({ ...p, email: e.target.value }))
                      }
                      placeholder="franchise@example.com"
                      required
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "16px",
                  }}
                >
                  <div className="form-group">
                    <label
                      style={{
                        display: "block",
                        marginBottom: 8,
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#475569",
                      }}
                    >
                      Phone number
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={franchiseForm.phone_number}
                      onChange={(e) =>
                        setFranchiseForm((p) => ({
                          ...p,
                          phone_number: e.target.value,
                        }))
                      }
                      placeholder="9876543210"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label
                      style={{
                        display: "block",
                        marginBottom: 8,
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#475569",
                      }}
                    >
                      Password
                    </label>
                    <input
                      type="password"
                      className="form-input"
                      value={franchiseForm.password}
                      onChange={(e) =>
                        setFranchiseForm((p) => ({
                          ...p,
                          password: e.target.value,
                        }))
                      }
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: "16px",
                  }}
                >
                  <div className="form-group">
                    <label
                      style={{
                        display: "block",
                        marginBottom: 8,
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#475569",
                      }}
                    >
                      Owner name
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={franchiseForm.owner_name}
                      onChange={(e) =>
                        setFranchiseForm((p) => ({
                          ...p,
                          owner_name: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label
                      style={{
                        display: "block",
                        marginBottom: 8,
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#475569",
                      }}
                    >
                      Owner email
                    </label>
                    <input
                      type="email"
                      className="form-input"
                      value={franchiseForm.owner_email}
                      onChange={(e) =>
                        setFranchiseForm((p) => ({
                          ...p,
                          owner_email: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label
                      style={{
                        display: "block",
                        marginBottom: 8,
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#475569",
                      }}
                    >
                      Owner phone
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={franchiseForm.owner_phone}
                      onChange={(e) =>
                        setFranchiseForm((p) => ({
                          ...p,
                          owner_phone: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "16px",
                    alignItems: "start",
                  }}
                >
                  <div className="form-group">
                    <label
                      htmlFor="franchise-level"
                      style={{
                        display: "block",
                        marginBottom: 8,
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#475569",
                      }}
                    >
                      Franchise level
                    </label>
                    <select
                      id="franchise-level"
                      className="form-input staff-form-select"
                      value={franchiseForm.level}
                      onChange={(e) => {
                        const level = e.target.value as FranchiseLevel;
                        setFranchiseForm((prev) => ({
                          ...prev,
                          level,
                        }));
                        setFranchiseSelectedCityIds([]);
                        setFranchiseSelectedDistrictKeys([]);
                      }}
                      required
                    >
                      <option value="state">State</option>
                      <option value="district">District</option>
                      <option value="city">City</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label
                      id="franchise-state-label"
                      style={{
                        display: "block",
                        marginBottom: 8,
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#475569",
                      }}
                    >
                      State(s)
                    </label>
                    {franchiseLocationsLoading ? (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: 12,
                          color: "#64748b",
                        }}
                      >
                        <Loader2 className="animate-spin" size={18} />
                        <span style={{ fontSize: 13 }}>Loading states…</span>
                      </div>
                    ) : franchiseLocationsError ? (
                      <p style={{ color: "#b91c1c", fontSize: 13 }}>
                        {franchiseLocationsError}
                      </p>
                    ) : (
                      <div
                        ref={franchiseStateDropdownRef}
                        style={{ position: "relative", width: "100%" }}
                      >
                        <button
                          type="button"
                          id="franchise-state-trigger"
                          className="form-input staff-form-select"
                          aria-haspopup="listbox"
                          aria-expanded={franchiseStateDropdownOpen}
                          aria-labelledby="franchise-state-label franchise-state-trigger"
                          onClick={() =>
                            setFranchiseStateDropdownOpen((o) => !o)
                          }
                          style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 8,
                            textAlign: "left",
                            cursor: "pointer",
                            background: "#fff",
                          }}
                        >
                          <span
                            style={{
                              flex: 1,
                              minWidth: 0,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              fontSize: 14,
                              color:
                                franchiseSelectedStateCodes.length === 0
                                  ? "#94a3b8"
                                  : "#334155",
                            }}
                          >
                            {franchiseSelectedStateCodes.length === 0
                              ? "Select state(s)"
                              : franchiseSelectedStateCodes.length === 1
                                ? (() => {
                                    const st =
                                      franchiseLocationStates.find(
                                        (x) =>
                                          x.code ===
                                          franchiseSelectedStateCodes[0],
                                      );
                                    return st
                                      ? `${st.name} (${st.code})`
                                      : franchiseSelectedStateCodes[0];
                                  })()
                                : `${franchiseSelectedStateCodes.length} states selected`}
                          </span>
                          <ChevronDown
                            size={18}
                            aria-hidden
                            style={{
                              flexShrink: 0,
                              color: "#64748b",
                              transform: franchiseStateDropdownOpen
                                ? "rotate(180deg)"
                                : undefined,
                              transition: "transform 0.15s ease",
                            }}
                          />
                        </button>
                        {franchiseStateDropdownOpen && (
                          <div
                            role="listbox"
                            aria-multiselectable
                            style={{
                              position: "absolute",
                              left: 0,
                              right: 0,
                              top: "calc(100% + 4px)",
                              zIndex: 50,
                              border: "1px solid #cbd5e1",
                              borderRadius: 8,
                              padding: "8px 10px",
                              maxHeight: 220,
                              overflowY: "auto",
                              background: "#fff",
                              boxShadow:
                                "0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.08)",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "flex-end",
                                marginBottom: 6,
                                gap: 8,
                              }}
                            >
                              <button
                                type="button"
                                className="btn btn-secondary"
                                style={{
                                  fontSize: 12,
                                  padding: "4px 10px",
                                }}
                                onClick={() => {
                                  const all = franchiseLocationStates.map(
                                    (s) => s.code,
                                  );
                                  const allSelected =
                                    franchiseSelectedStateCodes.length ===
                                      all.length && all.length > 0;
                                  setFranchiseSelectedStateCodes(
                                    allSelected ? [] : all,
                                  );
                                  setFranchiseSelectedCityIds([]);
                                  setFranchiseSelectedDistrictKeys([]);
                                }}
                              >
                                {franchiseSelectedStateCodes.length > 0 &&
                                franchiseSelectedStateCodes.length ===
                                  franchiseLocationStates.length
                                  ? "Clear all"
                                  : "Select all"}
                              </button>
                            </div>
                      
                            {franchiseLocationStates.map((s) => {
                              const checked =
                                franchiseSelectedStateCodes.includes(s.code);
                              return (
                                <label
                                  key={s.code}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                    padding: "4px 2px",
                                    cursor: "pointer",
                                    fontSize: 13,
                                    color: "#334155",
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => {
                                      setFranchiseSelectedStateCodes(
                                        (prev) => {
                                          const order =
                                            franchiseLocationStates.map(
                                              (x) => x.code,
                                            );
                                          const set = new Set(prev);
                                          if (set.has(s.code)) {
                                            set.delete(s.code);
                                          } else {
                                            set.add(s.code);
                                          }
                                          return order.filter((c) =>
                                            set.has(c),
                                          );
                                        },
                                      );
                                      setFranchiseSelectedCityIds([]);
                                      setFranchiseSelectedDistrictKeys([]);
                                    }}
                                  />
                                  <span>
                                    {s.name} ({s.code})
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {franchiseForm.level === "district" && (
                  <div className="form-group">
                    <label
                      id="franchise-district-label"
                      style={{
                        display: "block",
                        marginBottom: 8,
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#475569",
                      }}
                    >
                      Districts
                    </label>
                 
                    {franchiseSelectedStateCodes.length === 0 ? (
                      <select
                        id="franchise-district"
                        className="form-input staff-form-select"
                        disabled
                        value=""
                      >
                        <option value="">Select state(s) first</option>
                      </select>
                    ) : franchiseDistrictsLoading ? (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: 12,
                          color: "#64748b",
                        }}
                      >
                        <Loader2 className="animate-spin" size={18} />
                        <span style={{ fontSize: 13 }}>Loading districts…</span>
                      </div>
                    ) : franchiseDistrictOptions.length === 0 ? (
                      <select
                        id="franchise-district"
                        className="form-input staff-form-select"
                        disabled
                        value=""
                      >
                        <option value="">
                          No districts for selected state(s) — check API or state
                          IDs
                        </option>
                      </select>
                    ) : (
                      <div
                        ref={franchiseDistrictDropdownRef}
                        style={{ position: "relative", width: "100%" }}
                      >
                        <button
                          type="button"
                          id="franchise-district-trigger"
                          className="form-input staff-form-select"
                          aria-haspopup="listbox"
                          aria-expanded={franchiseDistrictDropdownOpen}
                          aria-labelledby="franchise-district-label franchise-district-trigger"
                          onClick={() =>
                            setFranchiseDistrictDropdownOpen((o) => !o)
                          }
                          style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 8,
                            textAlign: "left",
                            cursor: "pointer",
                            background: "#fff",
                          }}
                        >
                          <span
                            style={{
                              flex: 1,
                              minWidth: 0,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              fontSize: 14,
                              color:
                                franchiseSelectedDistrictKeys.length === 0
                                  ? "#94a3b8"
                                  : "#334155",
                            }}
                          >
                            {franchiseSelectedDistrictKeys.length === 0
                              ? "Select district(s)"
                              : franchiseSelectedDistrictKeys.length === 1
                                ? (() => {
                                    const k =
                                      franchiseSelectedDistrictKeys[0];
                                    const o = franchiseDistrictOptions.find(
                                      (x) => `${x.state_id}:${x.id}` === k,
                                    );
                                    return o
                                      ? `${o.name} (${o.state_code})`
                                      : k;
                                  })()
                                : `${franchiseSelectedDistrictKeys.length} districts selected`}
                          </span>
                          <ChevronDown
                            size={18}
                            aria-hidden
                            style={{
                              flexShrink: 0,
                              color: "#64748b",
                              transform: franchiseDistrictDropdownOpen
                                ? "rotate(180deg)"
                                : undefined,
                              transition: "transform 0.15s ease",
                            }}
                          />
                        </button>
                        {franchiseDistrictDropdownOpen && (
                          <div
                            role="listbox"
                            aria-multiselectable
                            style={{
                              position: "absolute",
                              left: 0,
                              right: 0,
                              top: "calc(100% + 4px)",
                              zIndex: 50,
                              border: "1px solid #cbd5e1",
                              borderRadius: 8,
                              padding: "8px 10px",
                              maxHeight: 220,
                              overflowY: "auto",
                              background: "#fff",
                              boxShadow:
                                "0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.08)",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "flex-end",
                                marginBottom: 6,
                              }}
                            >
                              <button
                                type="button"
                                className="btn btn-secondary"
                                style={{
                                  fontSize: 12,
                                  padding: "4px 10px",
                                }}
                                onClick={() => {
                                  const allKeys = franchiseDistrictOptions.map(
                                    (d) => `${d.state_id}:${d.id}`,
                                  );
                                  const allSelected =
                                    franchiseSelectedDistrictKeys.length ===
                                      allKeys.length && allKeys.length > 0;
                                  setFranchiseSelectedDistrictKeys(
                                    allSelected ? [] : allKeys,
                                  );
                                }}
                              >
                                {franchiseSelectedDistrictKeys.length > 0 &&
                                franchiseSelectedDistrictKeys.length ===
                                  franchiseDistrictOptions.length
                                  ? "Clear all"
                                  : "Select all"}
                              </button>
                            </div>

                            {franchiseDistrictOptions.map((d) => {
                              const rowKey = `${d.state_id}:${d.id}`;
                              const checked =
                                franchiseSelectedDistrictKeys.includes(rowKey);
                              return (
                                <label
                                  key={rowKey}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                    padding: "4px 2px",
                                    cursor: "pointer",
                                    fontSize: 13,
                                    color: "#334155",
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => {
                                      setFranchiseSelectedDistrictKeys(
                                        (prev) => {
                                          const order =
                                            franchiseDistrictOptions.map(
                                              (x) => `${x.state_id}:${x.id}`,
                                            );
                                          const set = new Set(prev);
                                          if (set.has(rowKey)) {
                                            set.delete(rowKey);
                                          } else {
                                            set.add(rowKey);
                                          }
                                          return order.filter((k) =>
                                            set.has(k),
                                          );
                                        },
                                      );
                                    }}
                                  />
                                  <span>
                                    {d.name}{" "}
                                    <span style={{ color: "#94a3b8" }}>
                                      ({d.state_code})
                                    </span>
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {franchiseForm.level === "city" && (
                  <div className="form-group">
                    <label
                      id="franchise-city-label"
                      style={{
                        display: "block",
                        marginBottom: 8,
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#475569",
                      }}
                    >
                      Cities
                    </label>
                    {franchiseSelectedStateCodes.length === 0 ? (
                      <select
                        id="franchise-city"
                        className="form-input staff-form-select"
                        disabled
                        value=""
                      >
                        <option value="">Select state(s) first</option>
                      </select>
                    ) : franchiseCitiesLoading ? (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: 12,
                          color: "#64748b",
                        }}
                      >
                        <Loader2 className="animate-spin" size={18} />
                        <span style={{ fontSize: 13 }}>Loading cities…</span>
                      </div>
                    ) : franchiseCitiesList.length === 0 ? (
                      <select
                        id="franchise-city"
                        className="form-input staff-form-select"
                        disabled
                        value=""
                      >
                        <option value="">No cities for selected state(s)</option>
                      </select>
                    ) : (
                      <div
                        ref={franchiseCityDropdownRef}
                        style={{ position: "relative", width: "100%" }}
                      >
                        <button
                          type="button"
                          id="franchise-city-trigger"
                          className="form-input staff-form-select"
                          aria-haspopup="listbox"
                          aria-expanded={franchiseCityDropdownOpen}
                          aria-labelledby="franchise-city-label franchise-city-trigger"
                          onClick={() =>
                            setFranchiseCityDropdownOpen((o) => !o)
                          }
                          style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 8,
                            textAlign: "left",
                            cursor: "pointer",
                            background: "#fff",
                          }}
                        >
                          <span
                            style={{
                              flex: 1,
                              minWidth: 0,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              fontSize: 14,
                              color:
                                franchiseSelectedCityIds.length === 0
                                  ? "#94a3b8"
                                  : "#334155",
                            }}
                          >
                            {franchiseSelectedCityIds.length === 0
                              ? "Select city / cities"
                              : franchiseSelectedCityIds.length === 1
                                ? (() => {
                                    const c = franchiseCitiesList.find(
                                      (x) =>
                                        x.id === franchiseSelectedCityIds[0],
                                    );
                                    return c
                                      ? c.name
                                      : String(franchiseSelectedCityIds[0]);
                                  })()
                                : `${franchiseSelectedCityIds.length} cities selected`}
                          </span>
                          <ChevronDown
                            size={18}
                            aria-hidden
                            style={{
                              flexShrink: 0,
                              color: "#64748b",
                              transform: franchiseCityDropdownOpen
                                ? "rotate(180deg)"
                                : undefined,
                              transition: "transform 0.15s ease",
                            }}
                          />
                        </button>
                        {franchiseCityDropdownOpen && (
                          <div
                            role="listbox"
                            aria-multiselectable
                            style={{
                              position: "absolute",
                              left: 0,
                              right: 0,
                              top: "calc(100% + 4px)",
                              zIndex: 50,
                              border: "1px solid #cbd5e1",
                              borderRadius: 8,
                              padding: "8px 10px",
                              maxHeight: 220,
                              overflowY: "auto",
                              background: "#fff",
                              boxShadow:
                                "0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.08)",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "flex-end",
                                marginBottom: 6,
                              }}
                            >
                              <button
                                type="button"
                                className="btn btn-secondary"
                                style={{
                                  fontSize: 12,
                                  padding: "4px 10px",
                                }}
                                onClick={() => {
                                  const allIds = franchiseCitiesList.map(
                                    (c) => c.id,
                                  );
                                  const allSelected =
                                    franchiseSelectedCityIds.length ===
                                      allIds.length && allIds.length > 0;
                                  setFranchiseSelectedCityIds(
                                    allSelected ? [] : allIds,
                                  );
                                }}
                              >
                                {franchiseSelectedCityIds.length > 0 &&
                                franchiseSelectedCityIds.length ===
                                  franchiseCitiesList.length
                                  ? "Clear all"
                                  : "Select all"}
                              </button>
                            </div>
                          
                            {franchiseCitiesList.map((c) => {
                              const checked =
                                franchiseSelectedCityIds.includes(c.id);
                              return (
                                <label
                                  key={c.id}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                    padding: "4px 2px",
                                    cursor: "pointer",
                                    fontSize: 13,
                                    color: "#334155",
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => {
                                      setFranchiseSelectedCityIds((prev) => {
                                        const order = franchiseCitiesList.map(
                                          (x) => x.id,
                                        );
                                        const set = new Set(prev);
                                        if (set.has(c.id)) {
                                          set.delete(c.id);
                                        } else {
                                          set.add(c.id);
                                        }
                                        return order.filter((id) =>
                                          set.has(id),
                                        );
                                      });
                                    }}
                                  />
                                  <span>{c.name}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="form-group">
                  <label
                    style={{
                      display: "block",
                      marginBottom: 8,
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#475569",
                    }}
                  >
                    Address
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={franchiseForm.address}
                    onChange={(e) =>
                      setFranchiseForm((p) => ({ ...p, address: e.target.value }))
                    }
                    placeholder="123 Main St, Bangalore"
                    required
                  />
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: "16px",
                  }}
                >
                  <div className="form-group">
                    <label
                      style={{
                        display: "block",
                        marginBottom: 8,
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#475569",
                      }}
                    >
                      PIN code
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={franchiseForm.pin_code}
                      onChange={(e) =>
                        setFranchiseForm((p) => ({
                          ...p,
                          pin_code: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label
                      style={{
                        display: "block",
                        marginBottom: 8,
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#475569",
                      }}
                    >
                      Business registration no.
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={franchiseForm.business_registration_number}
                      onChange={(e) =>
                        setFranchiseForm((p) => ({
                          ...p,
                          business_registration_number: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label
                      style={{
                        display: "block",
                        marginBottom: 8,
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#475569",
                      }}
                    >
                      Commission %
                    </label>
                    <input
                      type="number"
                      className="form-input"
                      min={0}
                      max={100}
                      step={0.1}
                      value={franchiseForm.commission_percentage}
                      onChange={(e) =>
                        setFranchiseForm((p) => ({
                          ...p,
                          commission_percentage: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "16px",
                  }}
                >
                  <div className="form-group">
                    <label
                      style={{
                        display: "block",
                        marginBottom: 8,
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#475569",
                      }}
                    >
                      GST number
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={franchiseForm.gst_number}
                      onChange={(e) =>
                        setFranchiseForm((p) => ({
                          ...p,
                          gst_number: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label
                      style={{
                        display: "block",
                        marginBottom: 8,
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#475569",
                      }}
                    >
                      PAN number
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={franchiseForm.pan_number}
                      onChange={(e) =>
                        setFranchiseForm((p) => ({
                          ...p,
                          pan_number: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label
                    style={{
                      display: "block",
                      marginBottom: 8,
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#475569",
                    }}
                  >
                    Description
                  </label>
                  <textarea
                    className="form-input"
                    rows={2}
                    value={franchiseForm.description}
                    onChange={(e) =>
                      setFranchiseForm((p) => ({
                        ...p,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Franchise scope and notes"
                    style={{ resize: "vertical" }}
                  />
                </div>
              </div>

              <div
                style={{
                  marginTop: 32,
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 12,
                  borderTop: "1px solid #f1f5f9",
                  paddingTop: "24px",
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: "12px 24px" }}
                  onClick={() => setShowFranchiseForm(false)}
                >
                  Discard
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    background: "#2A4638",
                    padding: "12px 32px",
                    fontWeight: 700,
                  }}
                  disabled={franchiseSubmitting}
                >
                  {franchiseSubmitting ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    "Create franchise"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
