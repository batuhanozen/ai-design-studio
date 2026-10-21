// @vitest-environment node
import { it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
it("keeps a server canary secret out of every client build artifact", () => {
  const directory = mkdtempSync(join(tmpdir(), "forma-isolation-"));
  const secret = "SERVER_CANARY_NOT_FOR_BROWSER_98b1c3";
  try {
    const dist = join(directory, "dist");
    execFileSync(
      process.execPath,
      ["node_modules/vite/bin/vite.js", "build", "--outDir", dist],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          OPENAI_API_KEY: secret,
          LLM_MODEL: "MODEL_CANARY_SERVER_ONLY_88d1",
        },
        stdio: "pipe",
      },
    );
    function inspect(path: string) {
      for (const item of readdirSync(path)) {
        const file = join(path, item);
        if (statSync(file).isDirectory()) inspect(file);
        else {
          const content = readFileSync(file).toString();
          expect(content).not.toContain(secret);
          expect(content).not.toContain("MODEL_CANARY_SERVER_ONLY_88d1");
          expect(content).not.toContain("api.openai.com");
        }
      }
    }
    inspect(dist);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}, 15000);
