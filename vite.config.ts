import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "API_");
  const port = Number(process.env.API_PORT ?? env.API_PORT ?? 3001);
  if (!Number.isInteger(port) || port < 1024 || port > 65535)
    throw new Error("Invalid API_PORT.");
  return {
    plugins: [react()],
    server: {
      host: "127.0.0.1",
      strictPort: true,
      proxy: {
        "/api": { target: `http://127.0.0.1:${port}`, changeOrigin: true },
      },
    },
    test: {
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
      maxWorkers: 1,
      fileParallelism: false,
    },
  };
});
