# Third-party components

This project bundles the following works. Their licences are reproduced or
linked below, and each is redistributed under its own terms.

## LibreSpeed — the measurement engine

- **Files:** `public/librespeed/speedtest.js`, `public/librespeed/speedtest_worker.js`
- **Upstream:** <https://github.com/librespeed/speedtest> (v6.2.1)
- **Copyright:** Federico Dossena and LibreSpeed contributors
- **Licence:** GNU Lesser General Public License v3.0 — full text in [`LICENSE`](LICENSE)

**Modifications.** `speedtest.js` carries one change from upstream, marked in
the file under the heading `LOCAL MODIFICATION`. Upstream constructs its worker
from the literal URL `"speedtest_worker.js"`, resolved relative to the page.
This app serves the core from `/librespeed/` while serving the page from `/`,
so the URL is exposed as a settable static property, `Speedtest.WORKER_URL`,
defaulting to the original value. `speedtest_worker.js` is unmodified.

Both files are shipped as readable source. The LGPL's requirement that a user
be able to replace the library is satisfied by replacing these files on the
server; no rebuild of this application is needed.

The PHP backend and telemetry scripts that LibreSpeed also distributes are
**not** included. Their functionality has been reimplemented independently in
TypeScript under `app/api/`, preserving the wire format and database schema for
compatibility. The share-id scrambling in `lib/server/obfuscation.ts` is a
direct port of LibreSpeed's `results/idObfuscation.php` algorithm, kept
bit-compatible so existing share links continue to resolve.

## Barlow — typeface

- **Files:** `app/fonts/*.woff2`, `assets/fonts/*.ttf`
- **Upstream:** <https://github.com/jpt/barlow>
- **Copyright:** 2017 The Barlow Project Authors
- **Licence:** SIL Open Font License 1.1 — full text in
  [`assets/fonts/OFL.txt`](assets/fonts/OFL.txt)

Barlow is used in place of the proprietary typeface of the interface this
project's visual design references. The web files are the Latin and Latin
Extended subsets published by Google Fonts, self-hosted so that no request ever
leaves the origin.

## IP-to-ASN database

- **File:** `assets/geoip/country_asn.mmdb`
- **Source:** ipinfo.io free IP-to-Country-ASN database, as redistributed by the
  LibreSpeed project
- **Licence:** Creative Commons Attribution-ShareAlike 4.0 International
  (CC BY-SA 4.0)

Used only for offline lookups, so that naming a visitor's ISP never requires an
outbound request. It can be removed or replaced via `SPEEDTEST_GEOIP_DB`; with
no database present, results simply show the address alone.

## Trademarks

"Ookla" and "Speedtest" are trademarks of Ookla, LLC. This project is not
affiliated with, endorsed by, or sponsored by Ookla. Its interface deliberately
resembles a widely recognised layout, but contains none of Ookla's code, assets,
fonts or branding.
