import { expect, it } from "vitest";
import { migrateDesign } from "./schema";
import { samples } from "./samples";

it("migrates current designs through validation and rejects unknown versions", () => {
  const result = migrateDesign(samples[0]);
  expect(result).toEqual({ ok: true, design: samples[0] });
  if (result.ok) expect(result.design).not.toBe(samples[0]);
  const future = migrateDesign({ ...samples[0], schemaVersion: "2.0.0" });
  expect(future.ok).toBe(false);
  if (!future.ok)
    expect(future.errors).toContainEqual(
      expect.objectContaining({
        path: "schemaVersion",
        code: "invalid_literal",
      }),
    );
});
