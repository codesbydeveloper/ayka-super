import { api } from "./api";

export type IndianState = { code: string; name: string; id?: number };
export type IndianCity = {
  id: number;
  name: string;
  /** Present when the cities API includes parent district (required for franchise territories). */
  district_id?: number;
};

function parseStatesPayload(result: unknown): IndianState[] {
  if (!result || typeof result !== "object") return [];
  const r = result as Record<string, unknown>;
  const data = r.data;
  if (!Array.isArray(data)) return [];
  return data
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const o = row as Record<string, unknown>;
      const code = typeof o.code === "string" ? o.code.trim() : "";
      const name = typeof o.name === "string" ? o.name.trim() : "";
      if (!code || !name) return null;
      const idRaw = o.id;
      const idNum =
        typeof idRaw === "number"
          ? idRaw
          : idRaw != null && String(idRaw).trim() !== ""
            ? Number(idRaw)
            : NaN;
      const id = Number.isFinite(idNum) ? idNum : undefined;
      return id !== undefined ? { code, name, id } : { code, name };
    })
    .filter((x): x is IndianState => x != null);
}

function parseCitiesPayload(result: unknown): IndianCity[] {
  if (!result || typeof result !== "object") return [];
  const r = result as Record<string, unknown>;
  const data = r.data;
  if (!Array.isArray(data)) return [];
  return data
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const o = row as Record<string, unknown>;
      const id = typeof o.id === "number" ? o.id : Number(o.id);
      const name = typeof o.name === "string" ? o.name.trim() : "";
      if (!Number.isFinite(id) || !name) return null;
      const dRaw = o.district_id ?? (o as Record<string, unknown>).districtId;
      const dNum =
        typeof dRaw === "number"
          ? dRaw
          : dRaw != null && String(dRaw).trim() !== ""
            ? Number(dRaw)
            : NaN;
      const district_id = Number.isFinite(dNum) ? Math.trunc(dNum) : undefined;
      return district_id !== undefined
        ? { id, name, district_id }
        : { id, name };
    })
    .filter((x): x is IndianCity => x != null);
}

/** GET /api/v1/locations/states — API ID 16 */
export async function fetchIndianStates(): Promise<IndianState[]> {
  const result = await api.get("/api/v1/locations/states");
  return parseStatesPayload(result);
}

/** GET /api/v1/locations/cities?state_code= — API ID 17 */
export async function fetchCitiesByStateCode(stateCode: string): Promise<IndianCity[]> {
  const qs = new URLSearchParams({ state_code: stateCode.trim() });
  const result = await api.get(`/api/v1/locations/cities?${qs}`);
  return parseCitiesPayload(result);
}

/** District row from GET /api/v1/super-admin/franchises/districts?state_id= */
export type FranchiseDistrict = {
  id: number;
  name: string;
  state_id?: number;
};

function parseFranchiseDistrictsPayload(result: unknown): FranchiseDistrict[] {
  if (!result || typeof result !== "object") return [];
  const r = result as Record<string, unknown>;
  let raw: unknown[] = [];
  if (Array.isArray(r.data)) raw = r.data;
  else if (r.data && typeof r.data === "object") {
    const d = r.data as Record<string, unknown>;
    if (Array.isArray(d.districts)) raw = d.districts;
    else if (Array.isArray(d.items)) raw = d.items;
  } else if (Array.isArray(r.districts)) raw = r.districts;

  const out: FranchiseDistrict[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const id = typeof o.id === "number" ? o.id : Number(o.id);
    const nameRaw =
      typeof o.name === "string"
        ? o.name.trim()
        : typeof o.district_name === "string"
          ? o.district_name.trim()
          : "";
    if (!Number.isFinite(id) || !nameRaw) continue;
    const sidRaw = o.state_id ?? (o as Record<string, unknown>).stateId;
    const sidNum =
      typeof sidRaw === "number"
        ? sidRaw
        : sidRaw != null && String(sidRaw).trim() !== ""
          ? Number(sidRaw)
          : NaN;
    out.push({
      id: Math.trunc(id),
      name: nameRaw,
      state_id: Number.isFinite(sidNum) ? Math.trunc(sidNum) : undefined,
    });
  }
  return out;
}

/**
 * GET /api/v1/super-admin/franchises/districts?state_id=
 * Super Admin only — used when creating district-level franchises (numeric district_id).
 */
export async function fetchFranchiseDistrictsByStateId(
  stateId: number,
): Promise<FranchiseDistrict[]> {
  if (!Number.isFinite(stateId) || stateId <= 0) return [];
  const qs = new URLSearchParams({ state_id: String(Math.trunc(stateId)) });
  const result = await api.get(
    `/api/v1/super-admin/franchises/districts?${qs}`,
  );
  return parseFranchiseDistrictsPayload(result);
}
