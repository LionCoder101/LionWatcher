import { MessageBuilder } from "../shared/message";

const messageBuilder = new MessageBuilder();
const API_URL = "https://api.coingecko.com/api/v3/coins/markets";

function requestJson(currency) {
  return fetch({
    url: `${API_URL}?vs_currency=${currency}&order=market_cap_desc&per_page=25&page=1&sparkline=false&price_change_percentage=24h`,
    method: "GET",
  })
    .then((response) => {
      if (!response || response.status < 200 || response.status >= 300) {
        throw new Error(`Market API request failed (${response ? response.status : "network"})`);
      }
      return typeof response.body === "string"
        ? JSON.parse(response.body)
        : response.body;
    });
}

function requestBtcChart(currency) {
  return fetch({
    url: `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=${currency}&days=1`,
    method: "GET",
  }).then((response) => {
    if (!response || response.status < 200 || response.status >= 300) {
      throw new Error("Chart request failed");
    }
    const data = typeof response.body === "string"
      ? JSON.parse(response.body)
      : response.body;
    if (!data || !Array.isArray(data.prices) || data.prices.length < 2) {
      throw new Error("No chart values");
    }
    const points = [];
    const count = Math.min(24, data.prices.length);
    for (let index = 0; index < count; index++) {
      const sourceIndex = Math.round((index * (data.prices.length - 1)) / (count - 1));
      const point = data.prices[sourceIndex];
      if (Array.isArray(point) && Number.isFinite(Number(point[1]))) {
        points.push([Number(point[0]), Number(point[1])]);
      }
    }
    return points;
  });
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

async function getMarket(ctx, request) {
  try {
    const currency = ["usd", "usdt", "jpy"].includes(request.currency)
      ? request.currency
      : "usd";
    const marketData = await requestJson(currency);
    if (!Array.isArray(marketData)) {
      throw new Error("Unexpected market API response");
    }

    const coins = marketData.map((coin) => ({
      id: coin.id,
      name: coin.name,
      symbol: String(coin.symbol || "").toUpperCase(),
      rank: Number(coin.market_cap_rank) || 0,
      price: numberOrNull(coin.current_price),
      change: numberOrNull(coin.price_change_percentage_24h),
      marketCap: numberOrNull(coin.market_cap),
      volume: numberOrNull(coin.total_volume),
      high: numberOrNull(coin.high_24h),
      low: numberOrNull(coin.low_24h),
    }));

    if (coins.some((coin) => !coin.id || !Number.isFinite(coin.price))) {
      throw new Error("Invalid market values");
    }
    ctx.response({ data: { coins, currency, fetchedAt: Date.now() } });
  } catch (error) {
    ctx.response({ data: { error: "Market data unavailable" } });
  }
}

AppSideService({
  onInit() {
    messageBuilder.listen(() => {});
    messageBuilder.on("request", (ctx) => {
      const request = messageBuilder.buf2Json(ctx.request.payload);
      if (request.method === "GET_MARKET") return getMarket(ctx, request);
      if (request.method === "GET_BTC_CHART") {
        const currency = ["usd", "usdt", "jpy"].includes(request.currency)
          ? request.currency
          : "usd";
        return requestBtcChart(currency)
          .then((points) => ctx.response({ data: { points, currency } }))
          .catch(() => ctx.response({ data: { error: "BTC chart unavailable" } }));
      }
      ctx.response({ data: { error: "Unsupported request" } });
    });
  },
});
