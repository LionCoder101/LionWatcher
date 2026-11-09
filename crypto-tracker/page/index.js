import { BasePage } from "@zeppos/zml/base-page";
import { getDeviceInfo } from "@zos/device";
import { set as setAlarm, getAllAlarms, REPEAT_HOUR } from "@zos/alarm";
import { align, createWidget, prop, widget } from "@zos/ui";
import { px } from "@zos/utils";

const { width } = getDeviceInfo();
const COINS = ["BTC", "ETH", "SOL"];
const REFRESH_INTERVAL_MS = 30000;

function formatPrice(value) {
  const digits = value >= 100 ? 2 : value >= 1 ? 3 : 5;
  return value.toFixed(digits);
}

function formatClock(date) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function ensureHourlyAlarm() {
  try {
    const alarms = getAllAlarms();
    const alreadyScheduled = alarms.some(
      (alarm) => alarm.url === "app-service/index"
    );

    if (!alreadyScheduled) {
      setAlarm({
        url: "app-service/index",
        repeat_type: REPEAT_HOUR,
        store: true,
      });
    }
  } catch (error) {
    // The foreground price screen should still work if alarm APIs are unavailable.
  }
}

function textWidget(y, height, size, color) {
  return createWidget(widget.TEXT, {
    x: px(24),
    y: px(y),
    w: width - px(48),
    h: px(height),
    text: "",
    text_size: px(size),
    align_h: align.LEFT,
    color,
  });
}

Page(
  BasePage({
    state: {
      loading: false,
      priceWidgets: [],
      tradeWidgets: [],
    },

    build() {
      createWidget(widget.TEXT, {
        x: px(24),
        y: px(30),
        w: width - px(48),
        h: px(38),
        text: "LIONTRACKER",
        text_size: px(25),
        align_h: align.CENTER_H,
        color: 0xffffff,
      });

      this.statusWidget = textWidget(72, 26, 16, 0xffc857);
      this.state.priceWidgets = COINS.map((coin, index) => {
        const row = textWidget(118 + index * 48, 42, 20, 0xffffff);
        row.setProperty(prop.TEXT, `${coin}   --`);
        return row;
      });

      const tradesHeading = textWidget(273, 28, 17, 0x9ca9b9);
      tradesHeading.setProperty(prop.TEXT, "BTC RECENT TRADES");
      this.state.tradeWidgets = [0, 1, 2].map((index) => {
        const row = textWidget(307 + index * 34, 30, 16, 0xffffff);
        row.setProperty(prop.TEXT, "Waiting for market data");
        return row;
      });

      this.updatedWidget = createWidget(widget.TEXT, {
        x: px(24),
        y: px(421),
        w: width - px(48),
        h: px(24),
        text: "",
        text_size: px(14),
        align_h: align.CENTER_H,
        color: 0x9ca9b9,
      });

      ensureHourlyAlarm();
      this.loadMarket();
      this.timer = setInterval(
        () => this.loadMarket(),
        REFRESH_INTERVAL_MS
      );
    },

    loadMarket() {
      if (this.state.loading) {
        return;
      }

      this.state.loading = true;
      this.request({ method: "GET_MARKET" }).then(
        ({ prices, trades }) => {
          if (!Array.isArray(prices) || !Array.isArray(trades)) {
            this.statusWidget.setProperty(prop.TEXT, "Invalid market response");
            this.updatedWidget.setProperty(prop.TEXT, "Retrying shortly");
            this.state.loading = false;
            return;
          }

          const pricesBySymbol = {};
          prices.forEach((coin) => {
            if (coin && COINS.includes(coin.s)) {
              pricesBySymbol[coin.s] = coin;
            }
          });

          COINS.forEach((symbol, index) => {
            const coin = pricesBySymbol[symbol];
            if (!coin || !Number.isFinite(coin.p) || !Number.isFinite(coin.c)) {
              this.state.priceWidgets[index].setProperty(
                prop.TEXT,
                `${symbol}   unavailable`
              );
              this.state.priceWidgets[index].setProperty(prop.COLOR, 0xffc857);
              return;
            }

            const sign = coin.c > 0 ? "+" : "";
            const color = coin.c >= 0 ? 0x35d07f : 0xff5d68;
            this.state.priceWidgets[index].setProperty(
              prop.TEXT,
              `${coin.s}   $${formatPrice(coin.p)}   ${sign}${coin.c.toFixed(2)}%`
            );
            this.state.priceWidgets[index].setProperty(prop.COLOR, color);
          });

          this.state.tradeWidgets.forEach((row, index) => {
            const trade = trades[index];
            if (
              !trade ||
              !Number.isFinite(trade.p) ||
              !Number.isFinite(trade.q)
            ) {
              row.setProperty(prop.TEXT, "No trade data");
              row.setProperty(prop.COLOR, 0x9ca9b9);
              return;
            }

            const side = trade.buy ? "BUY" : "SELL";
            const color = trade.buy ? 0x35d07f : 0xff5d68;
            row.setProperty(
              prop.TEXT,
              `${side}   $${formatPrice(trade.p)}   ${Number(trade.q).toFixed(4)} BTC`
            );
            row.setProperty(prop.COLOR, color);
          });

          this.statusWidget.setProperty(
            prop.TEXT,
            `LIVE  |  refresh ${REFRESH_INTERVAL_MS / 1000}s`
          );
          this.updatedWidget.setProperty(
            prop.TEXT,
            `Updated ${formatClock(new Date())}`
          );
          this.state.loading = false;
        },
        () => {
          this.statusWidget.setProperty(prop.TEXT, "Phone or market API unavailable");
          this.updatedWidget.setProperty(prop.TEXT, "Reconnect phone and retry");
          this.state.loading = false;
        }
      );
    },

    onDestroy() {
      if (this.timer) {
        clearInterval(this.timer);
      }
    },
  })
);
