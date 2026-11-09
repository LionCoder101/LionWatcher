# LionTracker for Amazfit T-Rex 2

LionTracker is a native Zepp OS 1 app for the Amazfit T-Rex 2 (`t-rex2` and `t-rex2-w`). The T-Rex 2 build uses the legacy `hmUI` API and a phone-side message bridge. The circular market screen is designed for the watch's 454 px layout and uses a black background, compact dark cards, and green/red change colors.

## Features in this build

- Top 25 cryptocurrencies ranked by market capitalization.
- Current price, 24-hour change, 24-hour high/low, market cap, and volume.
- USD, USDT, and JPY display currency selection.
- Scrollable market list. Tap a coin row to add or remove it from the watchlist; use **ALL COINS / WATCHLIST** to switch views.
- Manual refresh and 60-second foreground refresh.
- A simple **Top 25 Pulse** based on the share of listed coins with positive 24-hour changes: Bullish at 65% or more, Bearish at 35% or less, Neutral otherwise. This is descriptive market breadth, not a forecast.
- Device-side cache for offline viewing, with the UI marked when cached values are shown.
- Tap BTC to open its dedicated price dashboard with current quote, 24-hour change/high/low, market cap, volume, and an API-fed 24-hour price trace.
- Dark hacker-terminal visual style with neon green/cyan accents.
- CoinGecko attribution in the app.
- The existing LionWatcher lion logo is preserved as the app icon.

Market data comes from CoinGecko's keyless public `/coins/markets` endpoint. Keyless access has shared rate limits and is intended for testing/prototyping rather than production or commercial traffic. A public store release should use a suitable licensed data plan or a compliant backend, with no secret key embedded in the watch package. Prices can be delayed; the app does not trade.

## Not included in this T-Rex 2 version

The brief also describes custom price alerts, portfolio entry and valuation, per-coin detail screens, charts, user coin search, volatility/volume alerts, Fear & Greed, whale data, macro events, and voice input. Those are **not implemented** in this build. They need additional screens, storage/input flows, reliable data providers, or supported APIs. In particular, OS 3 notification/background-service APIs are not available to this Zepp OS 1 target, so this app does not promise background alerts or vibration notifications. No wallet keys, seed phrases, or exchange credentials are requested.

The GTR 4 Zepp OS 3 version is in `../crypto-tracker/`; it is a separate target with a different implementation.

## Requirements

- Amazfit T-Rex 2 paired to the Zepp app
- A Zepp account
- Node.js and npm
- Zeus CLI and dependencies available in the sibling `crypto-tracker/node_modules`
- The phone and Zepp app connected to the internet for market data

## Build

Run in this directory:

```cmd
npm run build
```

The T-Rex 2 `.zab` package is written to `dist/`. Rebuild after changing the code or `app.json`.

## Install a preview on the T-Rex 2

Preview installation is for development/testing; it does not publish the app for other users.

1. Pair the watch with the Zepp app and keep it connected to the phone.
2. Enable Developer Mode in Zepp. The documented route is **Profile -> Settings -> About**, then tap the Zepp icon seven times. Labels can vary by app version.
3. Open Command Prompt or PowerShell in `crypto-tracker-trex2/` and run:

   ```cmd
   npm run preview
   ```

4. Select **Amazfit T-Rex 2** when asked. Wait for the QR code.
5. In Zepp, open the Developer Mode scan function and scan the computer screen. Follow the install prompt for the paired T-Rex 2.
6. Open **LionTracker** on the watch. Tap **REFRESH**, scroll the list, tap BTC for its dashboard, tap other rows to favorite them, switch to **WATCHLIST**, and cycle currencies.

The QR code expires at the time printed by Zeus. Generate another preview if it expires. QR generation needs internet access to Zepp's preview service. `npm run dev` is for simulator preview and requires a running simulator; use `npm run preview` for a physical watch.

## Publish in the Zepp app for other users

To list the app in the Zepp app's App Store, register the app and submit a release for review through the [Zepp Developer Console](https://console.zepp.com/). A preview QR code is not a public listing.

1. Register an app in the Developer Console. It assigns the official app ID.
2. Replace `app.appId` in `app.json` with the assigned ID. The current `20001` is a development/sample value and must not be assumed to be your registered release ID.
3. Increment `app.version.code` and update `app.version.name` for each new release.
4. Build with `npm run build`, then upload the resulting `.zab` from `dist/`. Its app ID must match the Console registration.
5. Complete the listing fields: region, category, supported devices, language, name, description, permissions, SDK disclosure, and privacy statement.
6. Explain the app-side connection to CoinGecko in the privacy statement. This app reads public market data and stores only cached market data, watchlist IDs, and the selected currency on the watch; it does not collect wallet keys or place trades.
7. Prepare the store icon and T-Rex 2 listing screenshots. The official guide specifies a 240 x 240 transparent PNG icon and recommends three or more 360 x 360 transparent PNG screenshots for the round watch template.
8. Submit for review and address any feedback in the Console. The app becomes available to users only after approval and publication.

Check the current Console fields and the [official app submission guide](https://docs.zepp.com/docs/distribute/) because review requirements may change.

## Add more cryptocurrencies

The app requests the first 25 coins ordered by market cap. To display more, change the `per_page=25` value in `app-side/index.js` to a supported CoinGecko page size and consider the extra Bluetooth payload and watch memory use. The UI rank and card values are mapped from the API response; do not hardcode live prices.

## Official references

- [Zepp OS 1 SCROLL_LIST](https://docs.zepp.com/docs/1.0/reference/device-app-api/hmUI/widget/SCROLL_LIST/)
- [Zepp preview on a watch](https://docs.zepp.com/docs/guides/quick-start/preview/)
- [Zepp app submission](https://docs.zepp.com/docs/distribute/)
- [CoinGecko keyless public API](https://docs.coingecko.com/docs/keyless-public-api)
- [CoinGecko coins market endpoint](https://docs.coingecko.com/reference/coins-markets)
