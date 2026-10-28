import { z } from "zod";

export const MAX_DEPTH = 12;
export const MAX_NODES = 200;
export const tokens = {
  ink: "#17212f",
  muted: "#697586",
  paper: "#ffffff",
  surface: "#f3f5f8",
  accent: "#6854de",
  line: "#dfe3eb",
} as const;
export const spacing = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;
const rgb = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/;
export const colorSchema = z
  .string()
  .max(40)
  .refine((value) => {
    const match = rgb.exec(value);
    return (
      Object.prototype.hasOwnProperty.call(tokens, value) ||
      /^#(?:[\da-f]{3}|[\da-f]{6}|[\da-f]{8})$/i.test(value) ||
      Boolean(match && match.slice(1).every((v) => Number(v) <= 255))
    );
  }, "Use a design color token, hex color, or rgb(0–255, 0–255, 0–255).")
  .describe(
    `A color token (${Object.keys(tokens).join(", ")}), 3/6/8-digit hex, or rgb with integer channels 0–255; no URLs or raw CSS.`,
  );
const space = z.union([
  z.number().min(0).max(96),
  z.enum(["none", "xs", "sm", "md", "lg", "xl"]),
]);
const text = z.string().max(2000);
const id = z.string().regex(/^[A-Za-z][A-Za-z0-9_-]{0,63}$/);
const stackProps = z
  .object({
    direction: z.enum(["vertical", "horizontal"]),
    gap: space,
    padding: space,
    align: z.enum(["start", "center", "end", "stretch"]),
    justify: z.enum(["start", "center", "end", "between"]),
    background: colorSchema.optional(),
  })
  .strict();
const cardProps = z
  .object({
    padding: space,
    gap: space,
    background: colorSchema,
    color: colorSchema.optional(),
  })
  .strict();
const textProps = z
  .object({
    text,
    color: colorSchema,
    size: z.number().min(10).max(72),
    weight: z.enum(["regular", "medium", "bold"]),
  })
  .strict();
const buttonProps = z
  .object({ text, color: colorSchema, background: colorSchema, padding: space })
  .strict();
const inputProps = z
  .object({
    placeholder: text,
    color: colorSchema,
    background: colorSchema,
    padding: space,
  })
  .strict();
type Base<T extends string, P> = { id: string; type: T; props: P };
export type DesignNode =
  | (Base<"Stack", z.infer<typeof stackProps>> & { children: DesignNode[] })
  | (Base<"Card", z.infer<typeof cardProps>> & { children: DesignNode[] })
  | Base<"Text", z.infer<typeof textProps>>
  | Base<"Button", z.infer<typeof buttonProps>>
  | Base<"Input", z.infer<typeof inputProps>>;
export type Design = {
  schemaVersion: "1.0.0";
  id: string;
  name: string;
  root: DesignNode;
  meta?: { description?: string };
};
const nodeSchema: z.ZodType<DesignNode> = z.lazy(() =>
  z.discriminatedUnion("type", [
    z
      .object({
        id,
        type: z.literal("Stack"),
        props: stackProps,
        children: z.array(nodeSchema).max(MAX_NODES),
      })
      .strict(),
    z
      .object({
        id,
        type: z.literal("Card"),
        props: cardProps,
        children: z.array(nodeSchema).max(MAX_NODES),
      })
      .strict(),
    z.object({ id, type: z.literal("Text"), props: textProps }).strict(),
    z.object({ id, type: z.literal("Button"), props: buttonProps }).strict(),
    z.object({ id, type: z.literal("Input"), props: inputProps }).strict(),
  ]),
);
export const designSchema: z.ZodType<Design> = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    id,
    name: z.string().min(1).max(100),
    root: nodeSchema,
    meta: z
      .object({ description: z.string().max(500).optional() })
      .strict()
      .optional(),
  })
  .strict();
export type ValidationError = { path: string; code: string; message: string };
export type ValidationResult =
  | { ok: true; design: Design }
  | { ok: false; errors: ValidationError[] };
function pathString(parts: PropertyKey[]): string {
  return (
    parts.reduce<string>(
      (path, part) =>
        typeof part === "number"
          ? `${path}[${part}]`
          : path
            ? `${path}.${String(part)}`
            : String(part),
      "",
    ) || "$"
  );
}
// Preflight runs before recursive Zod parsing, bounding even malformed/cyclic candidates.
export function validateDesign(candidate: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  const ids = new Set<string>();
  const seen = new WeakSet<object>();
  let count = 0;
  function visit(value: unknown, depth: number, path: string): void {
    if (++count > MAX_NODES) {
      if (count === MAX_NODES + 1)
        errors.push({
          path,
          code: "node_count",
          message: `At most ${MAX_NODES} nodes are allowed.`,
        });
      return;
    }
    if (depth > MAX_DEPTH) {
      errors.push({
        path,
        code: "max_depth",
        message: `Maximum depth is ${MAX_DEPTH}.`,
      });
      return;
    }
    if (!value || typeof value !== "object") return;
    if (seen.has(value)) {
      errors.push({
        path,
        code: "cycle",
        message: "Nodes cannot be cyclic or shared.",
      });
      return;
    }
    seen.add(value);
    const node = value as Record<string, unknown>;
    if (typeof node.id === "string") {
      if (ids.has(node.id))
        errors.push({
          path: `${path}.id`,
          code: "duplicate_id",
          message: "Node IDs must be unique.",
        });
      ids.add(node.id);
    }
    if (Array.isArray(node.children)) {
      for (let i = 0; i < node.children.length && count <= MAX_NODES; i++)
        visit(node.children[i], depth + 1, `${path}.children[${i}]`);
    }
  }
  if (candidate && typeof candidate === "object")
    visit((candidate as Record<string, unknown>).root, 1, "root");
  if (errors.length) return { ok: false, errors };
  const result = designSchema.safeParse(candidate);
  if (result.success) return { ok: true, design: result.data };
  return {
    ok: false,
    errors: result.error.issues.flatMap<ValidationError>((issue) =>
      issue.code === "unrecognized_keys"
        ? issue.keys.map((key) => ({
            path: pathString([...issue.path, key]),
            code: issue.code,
            message: `Unknown property: ${key}.`,
          }))
        : [
            {
              path: pathString(issue.path),
              // Keep the public v1 diagnostic codes stable across the Zod upgrade.
              code:
                issue.code === "invalid_value"
                  ? issue.path[issue.path.length - 1] === "schemaVersion"
                    ? "invalid_literal"
                    : "invalid_enum_value"
                  : issue.code === "invalid_union" && "discriminator" in issue
                    ? "invalid_union_discriminator"
                    : issue.code,
              message: issue.message,
            },
          ],
    ),
  };
}
export function formatErrors(errors: ValidationError[]): string {
  return errors
    .map((error) => `${error.path}: ${error.message} (${error.code})`)
    .join("\n");
}
// Migration boundary: future versions must explicitly migrate before validation.
export function migrateDesign(candidate: unknown): ValidationResult {
  return validateDesign(candidate);
}
export function requireDesign(candidate: unknown): Design {
  const result = validateDesign(candidate);
  if (!result.ok) throw new Error(formatErrors(result.errors));
  return result.design;
}
