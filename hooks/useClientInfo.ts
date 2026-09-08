"use client";

import { useEffect, useState } from "react";

import type { IpInfoResponse } from "@/lib/types";

/**
 * Resolves who the visitor is as soon as the page loads.
 *
 * The measurement engine fetches this too, but only once a test starts, which
 * would leave the connection bar reading "Detecting…" for as long as the page
 * sits idle. Asking up front means the panel is populated before the first
 * click, and the engine's own later fetch simply confirms it.
 */
export function useClientInfo(basePath: string, enabled: boolean): string {
  const [client, setClient] = useState("");

  useEffect(() => {
    if (!enabled) return;

    const controller = new AbortController();

    fetch(`${basePath}/api/getIP?isp=true`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: IpInfoResponse | null) => {
        if (data?.processedString) setClient(data.processedString);
      })
      .catch(() => {
        // Nothing to do: the bar keeps its placeholder, and the test itself
        // does not depend on knowing the address.
      });

    return () => controller.abort();
  }, [basePath, enabled]);

  return client;
}
