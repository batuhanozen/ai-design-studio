# Forma — AI Design Studio, Phase 1

A local prompt-to-interactive-UI design studio built around a validated JSON intermediate representation (IR). Phase 1 uses a **deterministic sample generator, not AI**: keywords choose one of four templates. It requires no API key, performs no model calls, and does not interpret arbitrary instructions.

## Requirements and setup

Use **Node 24.x** and npm >=8.15. `.nvmrc` selects Node 24. The original shell had Node 16.17.0 / npm 8.15.0; the implementation uses an installed Node 24.19.0 runtime because the Node-16-compatible development tools had security advisories. See [architecture decisions](docs/ARCHITECTURE.md).

```sh
nvm install
nvm use
npm ci
npm run dev
```

If you use a different Node manager, select Node 24 with it before running npm. Open the local address printed by Vite (normally http://127.0.0.1:5173).

```sh
npm test
npm run lint
npm run typecheck
npm run build
```

`npm run format` formats sources and documentation. Build output is in `dist/`. The development server listens on loopback. No production deployment is included.

## Environment

No environment variables are required. `.env.example` documents this. No LLM endpoint exists in Phase 1. Never put secrets in browser-exposed `VITE_*` variables.

## Walkthrough

1. Enter a prompt and select **Generate sample**. Pricing/plan/subscription keywords select pricing; dashboard/header/overview select the header; contact/message select contact; all other prompts select login. Earlier categories take priority. The same prompt always produces the same validated IR; prompt text is not embedded in designs.
2. Click any preview element, or use its keyboard-accessible Select button, to select it. Its ID and editable properties appear in the inspector.
3. Edit text, placeholder, colors, gap, or padding when the selected type supports them. Press Enter or leave a field to apply. Invalid edits show a path-specific error and leave accepted state untouched. Color tokens: `ink`, `muted`, `paper`, `surface`, `accent`, `line`. Spacing tokens: `none`, `xs`, `sm`, `md`, `lg`, `xl`, or a number from 0 to 96.
4. Changes save to the versioned `forma.design.v1` localStorage key. Reload to restore. Invalid, unknown-version, or unavailable storage produces a visible fallback notice. **Reset to sample** replaces the current design with login and saves it.
5. Use **JSON** to inspect, copy, or download the current IR. **React** or **Export component** opens controlled TSX output with copy and download. Downloaded components require a React 18+ TypeScript host and contain inline styles, without studio dependencies. Clipboard access may depend on browser permissions; download remains available.

Preview inputs accept local typing; buttons have no application action. Input values are ephemeral, excluded from the IR and exports, and discarded on remount. Generated forms do not authenticate, send messages, subscribe, or persist input values.

## Boundaries and limitations

- Five components: Stack, Text, Button, Input, Card. Four templates: login, pricing, dashboard header, contact.
- No LLM, streaming, repair, arbitrary prompt layout, JSON import/editor, history, drag/reorder, tree panel, multi-select, or generated responsive variants.
- No authentication, collaboration, billing, database, providers, plugins, image upload, or animation features.
- One browser-local design; generation and reset replace it. No cross-tab conflict handling. Local storage is neither encrypted nor a backup; export work you want to keep.
- The studio shell adapts to smaller screens; the generated designs have no breakpoint model.
- Full security review, CSP deployment headers, observability, accessibility audit, performance budgets, and deployment remain planned. Automated component tests do not substitute for those audits.

See [architecture](docs/ARCHITECTURE.md), [roadmap](docs/ROADMAP.md), and [verification report](docs/VERIFICATION.md).
