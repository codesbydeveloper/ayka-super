export type AddonDisplay = {
  id: number;
  name: string;
  description: string;
  monthly_price: number;
  offer_price: number;
  badge: string;
  features: string[];
  icon: string;
  is_active: boolean;
  is_featured: boolean;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function extractAddonArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!isRecord(payload)) return [];
  const directKeys = [
    "addon_services",
    "addons",
    "services",
    "items",
    "results",
    "data",
  ] as const;
  for (const key of directKeys) {
    const v = payload[key];
    if (Array.isArray(v)) return v;
  }
  const data = payload.data;
  if (Array.isArray(data)) return data;
  if (isRecord(data)) {
    for (const key of [
      "addon_services",
      "addons",
      "services",
      "items",
      "results",
      "plans",
    ] as const) {
      const v = data[key];
      if (Array.isArray(v)) return v;
    }
  }
  return [];
}

export function mapRawAddon(o: unknown): AddonDisplay | null {
  if (!isRecord(o)) return null;
  const idRaw = o.id;
  const id =
    typeof idRaw === "number"
      ? idRaw
      : typeof idRaw === "string" && idRaw.trim() !== ""
        ? Number(idRaw)
        : NaN;
  if (!Number.isFinite(id)) return null;
  const name =
    typeof o.name === "string" ? o.name : String(o.name ?? "").trim();
  if (!name) return null;
  return {
    id,
    name,
    description:
      typeof o.description === "string" ? o.description : String(o.description ?? ""),
    monthly_price: Number(o.monthly_price ?? 0),
    offer_price: Number(o.offer_price ?? 0),
    badge: typeof o.badge === "string" ? o.badge : String(o.badge ?? ""),
    features: Array.isArray(o.features)
      ? o.features.filter((x): x is string => typeof x === "string")
      : [],
    icon: typeof o.icon === "string" ? o.icon : String(o.icon ?? ""),
    is_active: Boolean(o.is_active ?? true),
    is_featured: Boolean(o.is_featured),
  };
}

export function parseAddonServicesPayload(payload: unknown): AddonDisplay[] {
  return extractAddonArray(payload)
    .map(mapRawAddon)
    .filter((x): x is AddonDisplay => x != null);
}

/** Unwrap a single-addon GET response (body or `data` field). */
export function parseAddonSinglePayload(payload: unknown): AddonDisplay | null {
  if (payload == null) return null;
  if (!isRecord(payload)) return mapRawAddon(payload);
  const data = payload.data;
  if (data !== undefined && data !== null) {
    const fromData = mapRawAddon(data);
    if (fromData) return fromData;
  }
  return mapRawAddon(payload);
}

export function findAddonInListPayload(
  payload: unknown,
  id: string,
): AddonDisplay | undefined {
  const target = Number(id);
  if (!Number.isFinite(target)) return undefined;
  return parseAddonServicesPayload(payload).find((a) => a.id === target);
}
