import { type Design, type DesignNode, requireDesign } from "./schema";
const text = (
  id: string,
  content: string,
  size = 16,
  color = "ink",
): DesignNode => ({
  id,
  type: "Text",
  props: {
    text: content,
    size,
    color,
    weight: size >= 24 ? "bold" : "regular",
  },
});
const button = (id: string, content: string): DesignNode => ({
  id,
  type: "Button",
  props: { text: content, color: "paper", background: "accent", padding: "md" },
});
const input = (id: string, placeholder: string): DesignNode => ({
  id,
  type: "Input",
  props: { placeholder, color: "ink", background: "surface", padding: "md" },
});
function sample(id: string, name: string, children: DesignNode[]): Design {
  return requireDesign({
    schemaVersion: "1.0.0",
    id,
    name,
    root: {
      id: `${id}-root`,
      type: "Card",
      props: { padding: "xl", gap: "lg", background: "paper" },
      children,
    },
  });
}
export const samples: Design[] = [
  sample("login", "Welcome back", [
    text("login-eyebrow", "YOUR SPACE, REIMAGINED", 12, "accent"),
    text("login-title", "Welcome back.", 32),
    text(
      "login-subtitle",
      "A little focus. A lot of possibility.",
      16,
      "muted",
    ),
    input("login-email", "Email address"),
    input("login-password", "Password"),
    button("login-submit", "Continue to workspace"),
    text("login-note", "A sample form — no account is created.", 12, "muted"),
  ]),
  sample("pricing", "A plan for your next idea", [
    text("pricing-label", "FOR THE INDEPENDENT MIND", 12, "accent"),
    text("pricing-title", "Make room for more.", 32),
    text("pricing-price", "$24 / month", 24),
    text(
      "pricing-detail",
      "Unlimited ideas. One beautifully simple workspace.",
      16,
      "muted",
    ),
    button("pricing-button", "Choose this plan"),
  ]),
  sample("dashboard", "Workspace overview", [
    text("dash-label", "WORKSPACE / OVERVIEW", 12, "accent"),
    text("dash-title", "Good things start here.", 32),
    text(
      "dash-subtitle",
      "Your ideas, with a little more clarity.",
      16,
      "muted",
    ),
    {
      id: "dash-row",
      type: "Stack",
      props: {
        direction: "horizontal",
        gap: "lg",
        padding: "sm",
        align: "center",
        justify: "between",
      },
      children: [
        text("dash-count", "12 active projects", 18),
        button("dash-new", "New project"),
      ],
    },
  ]),
  sample("contact", "Let’s make something", [
    text("contact-title", "Let’s make something.", 32),
    text(
      "contact-subtitle",
      "Start a conversation about your next idea.",
      16,
      "muted",
    ),
    input("contact-email", "Your email"),
    input("contact-message", "What are you thinking?"),
    button("contact-send", "Send a message"),
  ]),
];
export const invalidFixtures = [
  { ...samples[0], schemaVersion: "9.0.0" },
  { ...samples[0], root: { id: "bad", type: "Script", props: {} } },
  {
    ...samples[0],
    root: {
      id: "bad",
      type: "Text",
      props: {
        text: "Hello",
        color: "javascript:alert(1)",
        size: 16,
        weight: "regular",
      },
    },
  },
];
