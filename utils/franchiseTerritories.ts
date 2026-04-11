/** GET /api/v1/super-admin/territories/franchises/{id}/territories */
export type FranchiseTerritoryRow = {
  id: number;
  franchise_id: number;
  territory_type: string;
  territory_id: number;
  territory_name: string;
  assigned_by_name: string;
  assigned_at: string;
};

export function franchiseTerritoriesListUrl(franchiseId: number | string): string {
  return `/api/v1/super-admin/territories/franchises/${encodeURIComponent(String(franchiseId))}/territories`;
}

export function parseFranchiseTerritoriesList(
  result: unknown,
): FranchiseTerritoryRow[] {
  let raw: unknown[] = [];
  if (Array.isArray(result)) raw = result;
  else if (result && typeof result === "object") {
    const r = result as Record<string, unknown>;
    if (Array.isArray(r.data)) raw = r.data;
    else if (Array.isArray(r.territories)) raw = r.territories;
    else if (r.data && typeof r.data === "object" && !Array.isArray(r.data)) {
      const d = r.data as Record<string, unknown>;
      if (Array.isArray(d.territories)) raw = d.territories;
      else if (Array.isArray(d.items)) raw = d.items;
    }
  }
  const out: FranchiseTerritoryRow[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const idNum = typeof o.id === "number" ? o.id : Number(o.id);
    const fidNum =
      typeof o.franchise_id === "number" ? o.franchise_id : Number(o.franchise_id);
    const tidNum =
      typeof o.territory_id === "number"
        ? o.territory_id
        : Number(o.territory_id);
    out.push({
      id: Number.isFinite(idNum) ? idNum : 0,
      franchise_id: Number.isFinite(fidNum) ? fidNum : 0,
      territory_type:
        typeof o.territory_type === "string"
          ? o.territory_type
          : String(o.territory_type ?? "—"),
      territory_id: Number.isFinite(tidNum) ? tidNum : 0,
      territory_name:
        typeof o.territory_name === "string"
          ? o.territory_name
          : String(o.territory_name ?? "—"),
      assigned_by_name:
        typeof o.assigned_by_name === "string"
          ? o.assigned_by_name
          : o.assigned_by_name != null
            ? String(o.assigned_by_name)
            : "—",
      assigned_at:
        typeof o.assigned_at === "string"
          ? o.assigned_at
          : String(o.assigned_at ?? "—"),
    });
  }
  return out;
}

export function formatAssignedAt(iso: string): string {
  if (!iso || iso === "—") return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
