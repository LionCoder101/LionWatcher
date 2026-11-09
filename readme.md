# LionTracker | Zepp OS Watch App

LionTracker is a cryptocurrency market monitor for Zepp OS watches. The T-Rex 2 build now provides a scrollable market-cap ranking and watchlist; the GTR 4 build remains a separate Zepp OS 3 app.

> **Device compatibility:** `crypto-tracker/` is the Zepp OS 3 build for GTR 4. A separate Zepp OS 1 implementation for Amazfit T-Rex 2 (`t-rex2` and `t-rex2-w`) is now available in `crypto-tracker-trex2/`. These builds use different platform APIs and must be previewed and packaged from their own folders.

## Current features

- Fetches BTC, ETH, and SOL 24-hour tickers from Binance through the paired phone's Zepp app.
- Displays the latest three BTC trades.
- Refreshes market data every 30 seconds while the watch app is open.
- Schedules an hourly alarm that attempts to show a BTC price notification.
- Retries Binance requests against `api.binance.com`, `api1.binance.com`, and `api2.binance.com`.

The watch app depends on the phone and Zepp app connection for network access. Prices are informational and may be delayed or unavailable when the phone is disconnected, the Zepp app is restricted in the background, or Binance is unreachable. Polling is foreground polling, not a guaranteed live feed.

## Project layout

```text
crypto-tracker/
|-- app.json              # Zepp OS version, permissions, and device targets
|-- app.js                # Watch app lifecycle
|-- app-side/index.js     # Phone-side Binance requests and response mapping
|-- app-service/index.js  # Hourly notification handler
|-- page/index.js         # Market screen and foreground refresh
|-- assets/               # Device icons and images
`-- dist/                 # Previously generated package; rebuild after changes
```

## Requirements

- Node.js and npm
- Zeus CLI (`@zeppos/zeus-cli`)
- A Zepp developer account and Zepp app
- For the current app configuration: a supported Zepp OS 3 device, such as GTR 4

Install the CLI if needed:

```bash
npm install -g @zeppos/zeus-cli
zeus --version
zeus login
```

Install project dependencies from the app directory:

```bash
cd crypto-tracker
npm install
```

## Develop and package

Run these commands from `crypto-tracker/`:

```bash
npm run dev       # Start the Zeus development preview
npm run preview   # Create a preview installation
npm run build     # Build a .zab package
```

Pair the watch with the Zepp app and enable developer mode and Bluetooth debugging before using a device preview. Confirm runtime behavior on the physical target watch; simulator support for alarms, notifications, app-side networking, and services may differ.

## T-Rex 2 support

The T-Rex 2 implementation is in `crypto-tracker-trex2/`. It uses legacy `hmUI` and the OS 1 message bridge. Features include the top 25 by market cap, current price, 24-hour change/high/low, market cap, volume, USD/USDT/JPY selection, a persistent watchlist, offline cache, manual refresh, 60-second foreground refresh, a transparent Top 25 breadth pulse, and a BTC dashboard with a 24-hour price trace. Its interface uses a black background with neon green and cyan terminal styling. It does not include background notifications.

### Install a development preview on the watch

1. Pair the T-Rex 2 in the Zepp app and enable Developer Mode from **Profile → Settings → About** by tapping the Zepp icon seven times.
2. From `crypto-tracker-trex2/`, run:

   ```cmd
   npm run preview
   ```

3. Choose **Amazfit T-Rex 2** when asked. When the QR code appears, scan it from the Zepp app's Developer Mode scan function and follow the install prompts.
4. Open LionTracker on the watch, tap the BTC row to open its dashboard, then check the market ranking, **REFRESH**, watchlist, and currency controls.

The QR code is a temporary developer preview and is not a public store listing. Run `npm run preview` again if it expires. QR generation needs an internet connection to the Zepp preview service.

### Publish it for other Zepp app users

To list the app in the Zepp app's App Store, register it in the [Zepp Developer Console](https://console.zepp.com/), use the `appId` assigned by the console in `crypto-tracker-trex2/app.json`, then rebuild and upload the resulting `.zab` package for review. Complete the requested release regions, category, language, listing description, supported-device, permission, and privacy information. Prepare the required store icon and watch screenshots, then submit for approval. Other users can find and install it through the Zepp app only after approval and publication.

The T-Rex 2-specific README has the full installation and publishing checklist, including listing image sizes and privacy details: [`crypto-tracker-trex2/README.md`](crypto-tracker-trex2/README.md).

Build the T-Rex 2 version from its directory:

```bash
cd crypto-tracker-trex2
npm run build
```

The Zeus CLI is reused from the sibling `crypto-tracker/node_modules` installation. See the project README for how to preview it on a paired T-Rex 2 and publish it for other Zepp app users.

## Known issues and recommended fixes

1. **The screen layout has not been checked on physical devices.** Both builds use fixed screen coordinates; verify clipping and readability on the intended round watch display.
2. **The refresh interval can still create unnecessary requests.** Each refresh makes two API requests. The app refreshes every 30 seconds while open; consider refreshing only when the page is visible.
3. **The request path has no explicit timeout.** HTTP status and numeric price and trade fields are validated in the GTR 4 build. Add a bounded timeout if the Zepp OS fetch API supports it consistently on the target device.
4. **T-Rex 2 has no hourly notification feature.** The OS 1 build intentionally provides foreground updates only.
5. **The generated package can become stale.** Rebuild from the relevant project directory after source or manifest changes and verify the package on the intended physical device.

## Data source and privacy

The GTR 4 build uses the public Binance Spot REST API:

- `GET /api/v3/ticker/24hr` for BTCUSDT, ETHUSDT, and SOLUSDT
- `GET /api/v3/trades?symbol=BTCUSDT&limit=3` for recent BTC trades

No API key is configured. Do not add a private API key to the app bundle; distributed `.zab` packages can be inspected. This app only reads public market data and does not place trades.

The T-Rex 2 build uses CoinGecko's keyless public `/coins/markets` endpoint. CoinGecko documents shared rate limits of approximately 5 calls/minute for keyless requests and says this access is for testing/prototyping, not production workloads; attribution is required. Use a suitable licensed API plan or compliant backend before a public release. The watch app does not embed API secrets. See the T-Rex 2 README for feature limitations and publishing instructions.

## Source references

- [Zepp OS documentation](https://docs.zepp.com/docs/intro/)
- [Zepp OS device app API](https://docs.zepp.com/docs/reference/device-app-api/intro/)
- [Zepp OS sample apps](https://github.com/zepp-health/zeppos-samples)
- [Binance Spot API documentation](https://developers.binance.com/docs/binance-spot-api-docs/rest-api)
