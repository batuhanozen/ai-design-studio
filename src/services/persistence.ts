import { samples } from "../ir/samples";
import { type Design, migrateDesign, requireDesign } from "../ir/schema";
export const STORAGE_KEY = "forma.design.v1";
export type StoragePort = Pick<Storage, "getItem" | "setItem">;
export function restoreDesign(storage: StoragePort): {
  design: Design;
  notice: string;
} {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw === null) return { design: requireDesign(samples[0]), notice: "" };
    const result = migrateDesign(JSON.parse(raw));
    if (result.ok) return { design: result.design, notice: "" };
  } catch {
    /* Unavailable storage and malformed JSON use the same safe fallback. */
  }
  return {
    design: requireDesign(samples[0]),
    notice:
      "Saved design could not be restored (invalid data, unsupported version, or unavailable storage). A sample was loaded.",
  };
}
export function saveDesign(storage: StoragePort, design: Design): string {
  const valid = requireDesign(design);
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(valid));
    return "";
  } catch {
    return "Your design could not be saved locally. Export it to keep a copy.";
  }
}
