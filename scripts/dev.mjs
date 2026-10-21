import { spawn } from "node:child_process";
const commands = [
  ["--env-file-if-exists=.env", "--import", "tsx", "server/index.ts"],
  ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--strictPort"],
];
const children = commands.map((args) =>
  spawn(process.execPath, args, { stdio: "inherit", env: process.env }),
);
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill("SIGTERM");
  process.exitCode = code;
}
for (const child of children) {
  child.on("error", () => stop(1));
  child.on("exit", (code) => stop(code ?? 1));
}
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
