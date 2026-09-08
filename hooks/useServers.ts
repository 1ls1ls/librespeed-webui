"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { loadEngine } from "@/lib/client/engine-loader";
import type { AppConfig } from "@/lib/config";
import type { TestServer } from "@/lib/types";

export interface UseServers {
  /** Empty in single-server deployments. */
  servers: TestServer[];
  selected: TestServer | null;
  selecting: boolean;
  select: (server: TestServer) => void;
  /** Re-measure every server and pick the closest again. */
  refresh: () => void;
}

/**
 * Chooses which measurement server to test against.
 *
 * The probing is done by LibreSpeed's own selector rather than by hand: it
 * already pings each candidate several times, keeps the best round trip, gives
 * up early on servers that answer slowly, and runs the list six at a time. The
 * instance used for it is thrown away afterwards, because the core allows
 * server selection exactly once per object.
 */
export function useServers(config: AppConfig, basePath: string): UseServers {
  const [servers, setServers] = useState<TestServer[]>(config.servers);
  const [selected, setSelected] = useState<TestServer | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [generation, setGeneration] = useState(0);

  // Config arrives as a prop from a server component, so its array identity is
  // not stable across renders; key the effect on the content instead.
  const serversKey = useMemo(
    () => config.servers.map((server) => `${server.name}|${server.server}`).join(","),
    [config.servers]
  );

  useEffect(() => {
    if (config.servers.length === 0) {
      setSelected(null);
      return;
    }

    let cancelled = false;
    setSelecting(true);

    // Cloned because the selector writes the measured ping back onto each entry,
    // and the configuration handed down as props should stay untouched.
    const candidates: TestServer[] = config.servers.map((server) => ({ ...server }));

    loadEngine(basePath)
      .then((Speedtest) => {
        const probe = new Speedtest();
        probe.addTestPoints(candidates);
        probe.selectServer((best) => {
          if (cancelled) return;
          setServers(candidates);
          setSelected(best ?? candidates[0] ?? null);
          setSelecting(false);
        });
      })
      .catch(() => {
        if (cancelled) return;
        // Without a working probe, the first configured server is a better
        // answer than refusing to run a test at all.
        setServers(candidates);
        setSelected(candidates[0] ?? null);
        setSelecting(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serversKey, basePath, generation]);

  const select = useCallback((server: TestServer) => setSelected(server), []);
  const refresh = useCallback(() => setGeneration((n) => n + 1), []);

  return { servers, selected, selecting, select, refresh };
}
