import { api } from "./api";

export type IndianState = { code: string; name: string; id?: number };
export type IndianCity = { id: number; name: string };

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
      return { id, name };
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
