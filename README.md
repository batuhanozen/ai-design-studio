# Forma — AI Design Studio, Phase 2

A local prompt-to-interactive-UI studio with a validated JSON intermediate representation (IR) as its source of truth. Choose **Deterministic samples** (four keyword templates, no AI call) or **AI (server)** (one optional OpenAI provider). The model returns IR JSON only. Rendering, editing, persistence and controlled React exports use the same validated design.

## Requirements and setup

Use **Node 24.x** and npm >=8.15. `.nvmrc` and package engines enforce this requirement. The default shell on the development machine was Node 16; select Node 24 before running npm. No UI framework, database, or hosted service is required for deterministic mode.

```sh
nvm install
nvm use
npm ci
npm run dev
```

With another Node manager, select Node 24 using that manager instead. `npm run dev` starts the TypeScript API server on **127.0.0.1:3001** and Vite on **127.0.0.1:5173** together; stopping it stops both. Vite proxies `/api` to the API. Open http://127.0.0.1:5173. The browser uses same-origin API requests; no permissive CORS is enabled. Without a key the server still starts, reports AI disabled, and templates work normally. `npm run dev:server` and `npm run dev:client` start the two processes separately.

## Optional AI setup

```sh
cp .env.example .env
```

Edit `.env` locally: set `OPENAI_API_KEY` and `LLM_MODEL` to a model identifier available to your account that supports the Responses API JSON mode. There is deliberately no default/hardcoded model. Review the [official model catalog](https://developers.openai.com/api/docs/models) and the selected model's capabilities. Restart the dev processes after changing server settings. Never put secrets in a `VITE_*` variable or commit `.env`.

Choose **AI (server)** after availability is detected. AI sends your prompt to OpenAI, may incur costs, and is not deterministic. The accepted design stays browser-local; the prompt and generated IR cross the provider boundary. No live provider generation was verified during implementation because no key/model was configured. Mock-provider tests and offline evaluations are verified separately.

| Environment variable                                       | Default / constraint                                                            |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `OPENAI_API_KEY`                                           | Empty disables AI                                                               |
| `LLM_MODEL`                                                | No default; required with a key                                                 |
| `API_PORT`                                                 | 3001, 1024–65535; Vite proxy reads the same setting                             |
| `LLM_MAX_PROMPT_LENGTH`                                    | 4000, 1–8000 characters; UI accepts up to 4000                                  |
| `LLM_MAX_OUTPUT_TOKENS`                                    | 4096, 256–12000 per attempt                                                     |
| `LLM_TIMEOUT_MS`                                           | 30000, 100–120000 across generation and all repairs                             |
| `LLM_REPAIR_ATTEMPTS`                                      | 1, allowed 0–2                                                                  |
| `LLM_RATE_LIMIT` / `LLM_RATE_WINDOW_MS`                    | 6 per 60000 ms, global in-memory local limit; one active generation             |
| `LLM_MAX_OUTPUT_BYTES`                                     | 100000, 1000–200000                                                             |
| `LLM_REPAIR_BYTES`                                         | 12000, 1000–20000; bounded invalid-output excerpt                               |
| `LLM_SUPPORTS_TEMPERATURE`                                 | false; set true only if the chosen model supports temperature, then 0.2 is sent |
| `LLM_INPUT_USD_PER_MILLION` / `LLM_OUTPUT_USD_PER_MILLION` | Optional operator-supplied live-eval cost rates                                 |

SDK automatic retries and logging are disabled; `store:false` is requested. Provider errors are returned as safe structured errors, without raw exception text. This is a development server, not a public production API.

## Usage

1. Choose a generation mode. AI is disabled with an explanation if the local server has no key or cannot be reached.
2. Enter a prompt. **Generate sample** uses pricing/plan/subscription keywords first, then dashboard/header/overview, then contact/message, otherwise login. Prompt text is not embedded in sample designs. **Generate with AI** requests validated IR from the server. Loading/cancel controls are visible. Failure or cancellation preserves the existing design; final server responses are revalidated in the client.
3. Click a preview element (or use its keyboard Select button), then edit supported text, placeholder, color, gap or padding properties. Enter or blur applies an edit. Invalid drafts show path/code errors without replacing accepted state. Color tokens: `ink`, `muted`, `paper`, `surface`, `accent`, `line`. Spacing: 0–96 or `none`, `xs`, `sm`, `md`, `lg`, `xl`.
4. Accepted changes save to localStorage key `forma.design.v1`. Reload restores through migration/validation. Corruption, unknown versions and unavailable storage fall back visibly. Reset replaces the design with the login sample.
5. Inspect/copy/download JSON; open React export to copy/download deterministic TSX. Clipboard failures offer download. Generated components require a React 18+ TypeScript host. Preview inputs accept ephemeral local typing; buttons have no application action. These sample forms do not authenticate, subscribe, send messages or persist field values.

## Checks and evaluations

```sh
npm run build
npm run lint
npm run typecheck
npm test
npm run format:check
npm run eval:offline
npm audit
```

`npm run format` formats files. Build output is in `dist/`; it is the **client only**. There is no production deployment workflow. Tests include server/provider mocks, client AI controls, canary-secret bundle isolation, eval math and all original Phase 1 tests. CI runs formatting, lint, typecheck, tests, offline eval and build; it never calls OpenAI. Workflow YAML was checked locally; remote CI execution has not been observed.

`npm run eval:live` is manual and billable, requires key/model, and writes ignored local results. See [eval documentation](docs/EVALS.md) for the 30-prompt corpus, metrics, synthetic offline results and honest limitations.

## Scope and limitations

Five supported components: Stack, Text, Button, Input, Card. AI can compose only those components; unsupported requests must be approximated and invalid output rejected. No provider-side guarantee replaces Zod. Delimiters reduce prompt ambiguity but do not solve prompt injection; safety comes from validation and inert rendering/export templates.

No progress SSE is implemented; the client waits for a complete validated result. No multiple providers, chat editing, new components, authentication, collaboration, billing, database, uploads, plugins, animations, undo/redo, tree editor, drag/reorder, multi-select or generated responsive variants. The studio shell adapts to small screens, without adding a design breakpoint model.

One unencrypted browser-local design; no backup, cross-tab coordination or import UI. Generation/reset replaces it. Cancellation is best-effort upstream and cannot refund tokens already consumed. In-memory rate limiting is dev-grade and resets on server restart. CSP, production security/accessibility audits, observability, performance budgets and deployment remain planned.

See [architecture and threat model](docs/ARCHITECTURE.md), [roadmap](docs/ROADMAP.md), [Phase 2 verification](docs/PHASE2-VERIFICATION.md), and the historical [Phase 1 report](docs/VERIFICATION.md).
