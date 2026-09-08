import "server-only";

import { readFile } from "node:fs/promises";

import { ImageResponse } from "next/og";

import { formatLatency, formatSpeed } from "@/lib/format";

import { assetPath } from "./paths";
import type { SharedResult } from "./results";

/*
 * The share image.
 *
 * A result link is only half of sharing: most places a link gets pasted show a
 * preview card, and a speed test result is a fundamentally visual thing. This
 * renders that card server-side from the stored row, so it always shows what
 * the database actually holds rather than whatever the sharer's browser had on
 * screen at the time.
 *
 * Satori (behind next/og) supports a deliberate subset of CSS: flexbox only,
 * no grid, and every element with more than one child needs an explicit
 * display. The layout below is written to those rules rather than around them.
 */

const WIDTH = 1200;
const HEIGHT = 630;

const C_BG = "#141526";
const C_SURFACE = "#1a1b2e";
const C_LINE = "#26273b";
const C_TEXT = "#ffffff";
const C_DIM = "#9193a8";
const C_DOWNLOAD = "#1cbfff";
const C_UPLOAD = "#bf71ff";
const C_TEAL = "#00e0d7";

interface LoadedFont {
  name: string;
  data: ArrayBuffer;
  weight: 300 | 500 | 600;
  style: "normal";
}

// Read once per process: the same three files are re-read for every card
// otherwise, and they never change while the process is alive.
let fontCache: Promise<LoadedFont[]> | null = null;

function loadFonts(): Promise<LoadedFont[]> {
  if (!fontCache) {
    fontCache = Promise.all([
      readFile(assetPath("assets", "fonts", "Barlow-Light.ttf")),
      readFile(assetPath("assets", "fonts", "Barlow-Medium.ttf")),
      readFile(assetPath("assets", "fonts", "Barlow-SemiBold.ttf")),
    ]).then(([light, medium, semibold]) => [
      { name: "Barlow", data: light.buffer as ArrayBuffer, weight: 300 as const, style: "normal" as const },
      { name: "Barlow", data: medium.buffer as ArrayBuffer, weight: 500 as const, style: "normal" as const },
      { name: "Barlow", data: semibold.buffer as ArrayBuffer, weight: 600 as const, style: "normal" as const },
    ]);
  }
  return fontCache;
}

/**
 * The dial motif, as an inline SVG data URI.
 *
 * Satori renders images but not arbitrary SVG elements, so the one decorative
 * flourish on the card is passed as an image rather than as markup. The arc
 * sweeps in proportion to the download figure, which makes the picture say
 * something rather than just decorate.
 */
function dialDataUri(fraction: number): string {
  const clamped = Math.max(0, Math.min(1, fraction));
  const R = 92;
  const C = 100;
  const start = 135;
  const sweep = 270;
  const point = (deg: number) => {
    const rad = (deg * Math.PI) / 180;
    return `${(C + R * Math.cos(rad)).toFixed(2)} ${(C + R * Math.sin(rad)).toFixed(2)}`;
  };
  const end = start + sweep * clamped;
  const large = sweep * clamped > 180 ? 1 : 0;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
    <defs><linearGradient id="g" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0" stop-color="#6afff3"/><stop offset="1" stop-color="#bf71ff"/>
    </linearGradient></defs>
    <path d="M ${point(start)} A ${R} ${R} 0 1 1 ${point(start + sweep)}" fill="none" stroke="${C_LINE}" stroke-width="7" stroke-linecap="round"/>
    ${clamped > 0.004 ? `<path d="M ${point(start)} A ${R} ${R} 0 ${large} 1 ${point(end)}" fill="none" stroke="url(#g)" stroke-width="7" stroke-linecap="round"/>` : ""}
  </svg>`;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

/** A stable, locale-independent timestamp; the card has no viewer to localise for. */
function cardTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getUTCDate()} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()} · ` +
    `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())} UTC`
  );
}

function Metric({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: string;
  unit: string;
  color: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <div
        style={{
          display: "flex",
          fontSize: 22,
          fontWeight: 600,
          letterSpacing: 3,
          color,
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
        <div style={{ display: "flex", fontSize: 96, fontWeight: 500, color: C_TEXT, lineHeight: 1 }}>
          {value}
        </div>
        <div style={{ display: "flex", fontSize: 24, color: C_DIM, paddingBottom: 10 }}>{unit}</div>
      </div>
    </div>
  );
}

function SmallMetric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <div style={{ display: "flex", fontSize: 17, letterSpacing: 2, color: C_DIM }}>{label}</div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 6 }}>
        <div style={{ display: "flex", fontSize: 38, fontWeight: 500, color: C_TEXT }}>{value}</div>
        <div style={{ display: "flex", fontSize: 17, color: C_DIM, paddingBottom: 6 }}>ms</div>
      </div>
    </div>
  );
}

export async function renderShareCard(result: SharedResult, brandName: string) {
  const fonts = await loadFonts();
  // The dial is scaled against 1 Gbit/s, which is where the on-screen scale
  // tops out; anything faster simply fills it.
  const dial = dialDataUri(Math.min(1, result.download / 1000));

  const context = [result.isp, result.server, result.addressFamily].filter(Boolean).join("  ·  ");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          backgroundColor: C_BG,
          backgroundImage:
            "radial-gradient(900px 500px at 22% 8%, rgba(28,191,255,0.16), transparent 60%), radial-gradient(700px 500px at 88% 92%, rgba(191,113,255,0.14), transparent 60%)",
          fontFamily: "Barlow",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                display: "flex",
                width: 14,
                height: 14,
                borderRadius: 7,
                backgroundColor: C_TEAL,
              }}
            />
            <div style={{ display: "flex", fontSize: 30, fontWeight: 600, color: C_TEXT }}>
              {brandName}
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 22, color: C_DIM }}>{cardTimestamp(result.timestamp)}</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 40 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 44 }}>
            <Metric
              label="Download"
              value={formatSpeed(result.download)}
              unit="Mbps"
              color={C_DOWNLOAD}
            />
            <Metric label="Upload" value={formatSpeed(result.upload)} unit="Mbps" color={C_UPLOAD} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 26 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={dial} width={200} height={200} alt="" />
            <div style={{ display: "flex", gap: 40 }}>
              <SmallMetric label="PING" value={formatLatency(result.ping)} />
              <SmallMetric label="JITTER" value={formatLatency(result.jitter)} />
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 22,
            borderTop: `1px solid ${C_LINE}`,
          }}
        >
          <div style={{ display: "flex", fontSize: 22, color: C_DIM }}>{context || "Speed test result"}</div>
          <div
            style={{
              display: "flex",
              fontSize: 20,
              color: C_DIM,
              backgroundColor: C_SURFACE,
              border: `1px solid ${C_LINE}`,
              borderRadius: 999,
              padding: "8px 18px",
            }}
          >
            {result.id}
          </div>
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT, fonts }
  );
}

export const shareCardSize = { width: WIDTH, height: HEIGHT };
