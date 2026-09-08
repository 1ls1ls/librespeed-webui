import type { SpeedtestConstructor } from "@/types/librespeed";

/**
 * Loads the vendored LibreSpeed core.
 *
 * It is a classic script that installs a global, not a module, so it is
 * injected rather than imported — which also keeps it out of the app bundle and
 * lets it be replaced on the server when LibreSpeed is updated, without
 * rebuilding this frontend.
 */

let pending: Promise<SpeedtestConstructor> | null = null;

export function engineUrls(basePath: string) {
  return {
    script: `${basePath}/librespeed/speedtest.js`,
    worker: `${basePath}/librespeed/speedtest_worker.js`,
  };
}

export function loadEngine(basePath: string): Promise<SpeedtestConstructor> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("The measurement engine only runs in a browser."));
  }

  const { script, worker } = engineUrls(basePath);

  if (window.Speedtest) {
    window.Speedtest.WORKER_URL = worker;
    return Promise.resolve(window.Speedtest);
  }

  if (!pending) {
    pending = new Promise<SpeedtestConstructor>((resolve, reject) => {
      const element = document.createElement("script");
      element.src = script;
      element.async = true;
      element.onload = () => {
        if (!window.Speedtest) {
          reject(new Error("speedtest.js loaded but did not define Speedtest"));
          return;
        }
        window.Speedtest.WORKER_URL = worker;
        resolve(window.Speedtest);
      };
      element.onerror = () => {
        // Allow a later retry rather than caching the failure forever.
        pending = null;
        reject(new Error(`Could not load ${script}`));
      };
      document.head.appendChild(element);
    });
  }

  return pending;
}
