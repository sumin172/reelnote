import { createConnection } from "net";

declare global {
  // noinspection ES6ConvertVarToLetConst
  var __TEARDOWN_MESSAGE__: string | undefined;
}

const resolveEndpoint = (rawUrl: string) => {
  const url = new URL(rawUrl);
  const defaultPort = url.protocol === "https:" ? 443 : 80;
  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : defaultPort,
  };
};

function waitForPortOpen(
  port: number,
  options: { host: string },
): Promise<void> {
  return new Promise((resolve, reject) => {
    const maxAttempts = 60;
    let attempts = 0;
    const interval = 1000; // 1초

    const tryConnect = () => {
      const socket = createConnection(port, options.host);

      socket.on("connect", () => {
        socket.end();
        resolve();
      });

      socket.on("error", () => {
        attempts++;
        if (attempts >= maxAttempts) {
          reject(
            new Error(
              `Port ${port} on ${options.host} did not open within ${maxAttempts} seconds`,
            ),
          );
        } else {
          setTimeout(tryConnect, interval);
        }
      });
    };

    tryConnect();
  });
}

module.exports = async function globalSetup() {
  const baseUrl = process.env.CATALOG_BASE_URL ?? "http://localhost:4000";
  const { host, port } = resolveEndpoint(baseUrl);

  console.log(`\nWaiting for catalog service at ${host}:${port}...\n`);
  await waitForPortOpen(port, { host });

  globalThis.__TEARDOWN_MESSAGE__ = "\nCatalog E2E tests completed.\n";
};
