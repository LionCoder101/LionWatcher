import { BaseApp } from "@zeppos/zml/base-app";
import { notify } from "@zos/notification";

function formatPrice(value) {
  const digits = value >= 100 ? 2 : value >= 1 ? 3 : 5;
  return value.toFixed(digits);
}

AppService(
  BaseApp({
    onEvent() {
      this.request({ method: "GET_MARKET" })
        .then(({ prices }) => {
          const bitcoin = prices.find((coin) => coin.s === "BTC");
          if (!bitcoin) {
            return;
          }

          const sign = bitcoin.c > 0 ? "+" : "";
          notify({
            title: "LionTracker",
            content: `BTC $${formatPrice(bitcoin.p)} (${sign}${bitcoin.c.toFixed(2)}%)`,
            actions: [],
          });
        })
        .catch(() => {});
    },
  })
);
