import { api } from "@/utils/api";

const LABELS_PATH = "/api/v1/super-admin/leads/labels/";

export type LeadLabel = {
  id: number;
  label_name: string;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

function parseLabelsList(payload: unknown): LeadLabel[] {
  if (Array.isArray(payload)) {
    return payload.filter(
      (row): row is LeadLabel =>
        row != null &&
        typeof row === "object" &&
        typeof (row as LeadLabel).id === "number" &&
        typeof (row as LeadLabel).label_name === "string",
    );
  }
  if (payload && typeof payload === "object") {
    const p = payload as Record<string, unknown>;
    if (Array.isArray(p.data)) return parseLabelsList(p.data);
    if (Array.isArray(p.results)) return parseLabelsList(p.results);
  }
  return [];
}

export async function listLeadLabels(
  includeInactive = false,
): Promise<LeadLabel[]> {
  const q = new URLSearchParams({
    include_inactive: String(includeInactive),
  });
  const payload = await api.get(`${LABELS_PATH}?${q.toString()}`);
  return parseLabelsList(payload);
}

export type CreateLeadLabelBody = {
  label_name: string;
  color: string;
};

function parseCreatedLabel(payload: unknown): LeadLabel {
  if (
    payload &&
    typeof payload === "object" &&
    typeof (payload as LeadLabel).id === "number" &&
    typeof (payload as LeadLabel).label_name === "string"
  ) {
    return payload as LeadLabel;
  }
  if (payload && typeof payload === "object") {
    const p = payload as Record<string, unknown>;
    if (p.data && typeof p.data === "object") {
      return parseCreatedLabel(p.data);
    }
  }
  throw new Error("Unexpected response when creating lead label");
}

export async function createLeadLabel(
  body: CreateLeadLabelBody,
): Promise<LeadLabel> {
  const payload = await api.post(LABELS_PATH, body);
  return parseCreatedLabel(payload);
}
