import { describe, expect, it } from "vitest";
import { MAX_DEPTH, MAX_NODES, formatErrors, validateDesign } from "./schema";
import { invalidFixtures, samples } from "./samples";
function leaf(id = "leaf") {
  return {
    id,
    type: "Text",
    props: { text: "Hello", color: "ink", size: 16, weight: "regular" },
  };
}
function design(root: unknown) {
  return { ...samples[0], root };
}
function expectError(candidate: unknown, path: string, code: string) {
  const result = validateDesign(candidate);
  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.errors).toContainEqual(
      expect.objectContaining({ path, code }),
    );
    expect(formatErrors(result.errors)).toContain(path);
  }
}
describe("IR validation", () => {
  it("accepts all representative samples and rejects invalid fixtures", () => {
    samples.forEach((sample) => expect(validateDesign(sample).ok).toBe(true));
    invalidFixtures.forEach((sample) =>
      expect(validateDesign(sample).ok).toBe(false),
    );
  });
  it("reports unknown types and versions at their exact paths", () => {
    expectError(invalidFixtures[0], "schemaVersion", "invalid_literal");
    expectError(invalidFixtures[1], "root.type", "invalid_union_discriminator");
  });
  it("rejects arbitrary props, style, handlers, classes, and HTML", () => {
    for (const name of ["colorTypo", "style", "className", "onClick", "html"])
      expectError(
        design({ ...leaf(), props: { ...leaf().props, [name]: "alert(1)" } }),
        `root.props.${name}`,
        "unrecognized_keys",
      );
    expectError({ ...samples[0], extra: true }, "extra", "unrecognized_keys");
  });
  it.each([
    "javascript:alert(1)",
    "data:text/html,test",
    "url(https://evil.test)",
    "https://evil.test",
    "rgb(256, 0, 0)",
    "toString",
    "#xxxxxx",
  ])("rejects forbidden color %s", (color) => {
    expectError(
      design({ ...leaf(), props: { ...leaf().props, color } }),
      "root.props.color",
      "custom",
    );
  });
  it.each(["accent", "#fff", "#123456", "#12345678", "rgb(0, 255, 127)"])(
    "accepts bounded color %s",
    (color) => {
      expect(
        validateDesign(design({ ...leaf(), props: { ...leaf().props, color } }))
          .ok,
      ).toBe(true);
    },
  );
  it("rejects children on leaves, missing container children, and duplicate IDs", () => {
    expectError(
      design({ ...leaf(), children: [] }),
      "root.children",
      "unrecognized_keys",
    );
    const root = samples[0].root;
    expectError(
      design({ ...root, children: undefined }),
      "root.children",
      "invalid_type",
    );
    expectError(
      design({ ...root, children: [leaf(), leaf()] }),
      "root.children[1].id",
      "duplicate_id",
    );
  });
  it("bounds depth, count, sizes, spacing, and text", () => {
    let root: unknown = leaf();
    for (let i = 0; i < MAX_DEPTH; i++)
      root = { ...samples[0].root, id: `level-${i}`, children: [root] };
    expectError(
      design(root),
      "root.children[0]".concat(".children[0]".repeat(MAX_DEPTH - 1)),
      "max_depth",
    );
    expectError(
      design({
        ...samples[0].root,
        children: Array.from({ length: MAX_NODES }, (_, i) =>
          leaf(`leaf-${i}`),
        ),
      }),
      `root.children[${MAX_NODES - 1}]`,
      "node_count",
    );
    expectError(
      design({ ...leaf(), props: { ...leaf().props, size: 100 } }),
      "root.props.size",
      "too_big",
    );
    expectError(
      design({ ...leaf(), props: { ...leaf().props, text: "x".repeat(2001) } }),
      "root.props.text",
      "too_big",
    );
    expectError(
      design({
        ...samples[0].root,
        props: { ...samples[0].root.props, padding: 97 },
      }),
      "root.props.padding",
      "too_big",
    );
  });
  it("safely rejects cyclic and shared node graphs", () => {
    const root = { ...samples[0].root, children: [] as unknown[] };
    root.children.push(root);
    expectError(design(root), "root.children[0]", "cycle");
  });
});
