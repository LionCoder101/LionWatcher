import { BaseSideService } from "@zeppos/zml/base-side";

const API_HOSTS = ["api.binance.com", "api1.binance.com", "api2.binance.com"];
const PRICE_PATH =
  "/api/v3/ticker/24hr?symbols=%5B%22BTCUSDT%22%2C%22ETHUSDT%22%2C%22SOLUSDT%22%5D";
const TRADES_PATH = "/api/v3/trades?symbol=BTCUSDT&limit=3";

function parseFiniteNumber(value, fieldName) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new Error(`Invalid ${fieldName} in Binance response`);
  }
  return number;
}

function requestJson(path, hostIndex = 0) {
  return fetch({
    url: `https://${API_HOSTS[hostIndex]}${path}`,
    method: "GET",
  })
    .then((response) => {
      if (!response || response.status < 200 || response.status >= 300) {
        throw new Error(
          `Binance returned HTTP ${response ? response.status : "error"}`
        );
      }
      return typeof response.body === "string"
        ? JSON.parse(response.body)
        : response.body;
    })
    .catch((error) => {
      if (hostIndex + 1 >= API_HOSTS.length) {
        throw error;
      }
      return requestJson(path, hostIndex + 1);
    });
}

AppSideService(
  BaseSideService({
    onInit() {},

    onRequest(request, response) {
      if (request.method !== "GET_MARKET") {
        response(new Error(`Unsupported request: ${request.method}`));
        return;
      }

      Promise.all([requestJson(PRICE_PATH), requestJson(TRADES_PATH)])
        .then(([tickerData, tradeData]) => {
          if (!Array.isArray(tickerData) || !Array.isArray(tradeData)) {
            throw new Error("Unexpected market API response");
          }

          const prices = tickerData.map((ticker) => ({
            s: ticker.symbol.replace("USDT", ""),
            p: parseFiniteNumber(ticker.lastPrice, "price"),
            c: parseFiniteNumber(ticker.priceChangePercent, "change"),
          }));
          const trades = tradeData.map((trade) => ({
            p: parseFiniteNumber(trade.price, "trade price"),
            q: parseFiniteNumber(trade.qty, "trade quantity"),
            buy: !trade.isBuyerMaker,
            t: trade.time,
          }));

          response(null, { prices, trades });
        })
        .catch((error) => response(error));
    },
  })
);
