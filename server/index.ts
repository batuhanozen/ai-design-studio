import { createServer } from "node:http";
import { readConfig } from "./config";
import { createOpenAIProvider } from "./openai";
import { createAPI } from "./api";
import { failure } from "./pipeline";
const config = readConfig();
const api = createAPI(
  config,
  config.apiKey ? createOpenAIProvider(config.apiKey) : undefined,
  (metadata) => console.info(JSON.stringify(metadata)),
);
const server = createServer(async (incoming, outgoing) => {
  const abort = new AbortController();
  outgoing.on("close", () => {
    if (!outgoing.writableEnded) abort.abort();
  });
  // Bound the raw transport body before adapting it to the testable Web Request handler.
  let size = 0;
  const chunks: Buffer[] = [];
  try {
    for await (const chunk of incoming) {
      size += chunk.length;
      if (size > config.maxPromptLength * 4 + 1024) {
        outgoing.writeHead(413, {
          "Content-Type": "application/json",
          Connection: "close",
        });
        outgoing.end(
          JSON.stringify(
            failure(
              "bad_request",
              "body_size",
              "Request body exceeds the byte limit.",
            ),
          ),
        );
        return;
      }
      chunks.push(chunk);
    }
    const headers = new Headers();
    for (const [name, value] of Object.entries(incoming.headers))
      if (value)
        headers.set(name, Array.isArray(value) ? value.join(",") : value);
    const request = new Request(
      `http://127.0.0.1:${config.port}${incoming.url ?? "/"}`,
      {
        method: incoming.method,
        headers,
        signal: abort.signal,
        ...(incoming.method === "POST"
          ? { body: Buffer.concat(chunks).toString("utf8") }
          : {}),
      },
    );
    const response = await api(request);
    outgoing.writeHead(
      response.status,
      Object.fromEntries(response.headers.entries()),
    );
    outgoing.end(await response.text());
  } catch {
    if (!outgoing.writableEnded) {
      outgoing.writeHead(400, { "Content-Type": "application/json" });
      outgoing.end(
        JSON.stringify(
          failure("bad_request", "request", "Request could not be processed."),
        ),
      );
    }
  }
});
server.requestTimeout = 10000;
server.headersTimeout = 10000;
server.listen(config.port, "127.0.0.1", () =>
  console.info("Local generation server ready."),
);
function close() {
  server.close();
  server.closeAllConnections();
}
process.on("SIGINT", close);
process.on("SIGTERM", close);
