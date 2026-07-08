import { apiRequest } from "../api/client";
import type { Writing, WritingSummary, WritingUpsertBody } from "@archprep/shared";

const BASE = "/api/writings";

/** List the current user's thesis drafts (lightweight summary). */
export async function listWritings(): Promise<WritingSummary[]> {
  const data = await apiRequest<WritingSummary[] | { status: string; message: string }>(BASE);
  return Array.isArray(data) ? data : [];
}

/** Fetch the full content of one thesis. Returns null if not found. */
export function getWriting(id: string): Promise<Writing | null> {
  return apiRequest<Writing | null>(`${BASE}/${id}`);
}

/**
 * Create or update a thesis draft.
 * - No `id` in body -> server creates a new row.
 * - `id` present -> server updates the matching row (must belong to caller).
 */
export function upsertWriting(body: WritingUpsertBody): Promise<Writing> {
  return apiRequest<Writing>(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Delete a thesis draft. Resolves silently even if the row is already gone. */
export async function deleteWriting(id: string): Promise<void> {
  await apiRequest<{ ok: true }>(`${BASE}/${id}`, { method: "DELETE" });
}
