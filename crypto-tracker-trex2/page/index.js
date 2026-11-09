const { width: DEVICE_WIDTH } = hmSetting.getDeviceInfo();
const { messageBuilder } = getApp()._options.globalData;
function makeText(y, height, size, text, color = 0xffffff) {
  return hmUI.createWidget(hmUI.widget.TEXT, {
    x: px(28),
    y: px(y),
    w: DEVICE_WIDTH - px(56),
    h: px(height),
    color,
    text_size: px(size),
    align_h: hmUI.align.CENTER_H,
    align_v: hmUI.align.CENTER_V,
    text_style: hmUI.text_style.NONE,
    text,
  });
}

Page({
  state: { loading: false, timer: null },

  build() {
    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: 0, y: 0, w: DEVICE_WIDTH, h: px(454), color: 0x000000,
    });
    this.title = makeText(13, 34, 25, "> LIONTRACKER_", 0x20ff75);
    this.status = makeText(47, 24, 15, "Market data loading", 0x20ff75);
    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: px(34), y: px(73), w: DEVICE_WIDTH - px(68), h: px(2), color: 0x0d6b35,
    });
    this.refreshButton = hmUI.createWidget(hmUI.widget.BUTTON, {
      x: px(14), y: px(77), w: px(132), h: px(36), radius: px(12),
      normal_color: 0x082516, press_color: 0x0f4a2a,
      text: "[ REFRESH ]",
      text_size: px(16),
      color: 0x20ff75,
      click_func: () => this.loadMarket(),
    });
    this.watchButton = hmUI.createWidget(hmUI.widget.BUTTON, {
      x: px(160), y: px(77), w: px(132), h: px(36), radius: px(12),
      normal_color: 0x091a15, press_color: 0x0b3324,
      text: "[ ALL ]", text_size: px(15), color: 0x20ff75,
      click_func: () => this.toggleWatchlist(),
    });
    this.currencyButton = hmUI.createWidget(hmUI.widget.BUTTON, {
      x: px(306), y: px(77), w: px(132), h: px(36), radius: px(12),
      normal_color: 0x071a22, press_color: 0x0a3442,
      text: "USD", text_size: px(15), color: 0x00d9ff,
      click_func: () => this.cycleCurrency(),
    });
    const cached = this.readCache();
    this.state.coins = cached.coins || [];
    this.state.watchlist = cached.watchlist || [];
    this.state.showWatchlist = false;
    this.state.currency = cached.currency || "usd";
    this.state.updatedAt = cached.updatedAt || 0;
    this.state.loading = false;
    this.currencyButton.setProperty(hmUI.prop.TEXT, this.state.currency.toUpperCase());
    this.watchButton.setProperty(hmUI.prop.TEXT, "[ ALL ]");
    this.createCoinList(this.state.coins);
    this.updated = makeText(410, 22, 12, "// COINGECKO | CACHE ENABLED", 0x00d9ff);
    this.createDashboard();
    this.showCacheStatus();
    this.loadMarket();
    this.state.timer = setInterval(() => this.loadMarket(), 60000);
  },

  readCache() {
    try {
      const [stat, error] = hmFS.stat("liontracker-cache.json");
      if (error !== 0 || !stat || !stat.size) return {};
      const file = hmFS.open("liontracker-cache.json", hmFS.O_RDONLY);
      const data = new Uint16Array(new ArrayBuffer(stat.size));
      hmFS.read(file, data.buffer, 0, stat.size);
      hmFS.close(file);
      return JSON.parse(String.fromCharCode.apply(null, data));
    } catch (error) {
      return {};
    }
  },

  writeCache() {
    try {
      const json = JSON.stringify({
        coins: this.state.coins,
        watchlist: this.state.watchlist,
        currency: this.state.currency,
        updatedAt: this.state.updatedAt,
      });
      const buffer = new Uint16Array(json.length);
      for (let i = 0; i < json.length; i++) buffer[i] = json.charCodeAt(i);
      const file = hmFS.open(
        "liontracker-cache.json",
        hmFS.O_CREAT | hmFS.O_RDWR | hmFS.O_TRUNC
      );
      hmFS.write(file, buffer.buffer, 0, buffer.byteLength);
      hmFS.close(file);
    } catch (error) {
      // Keep the market view usable if device storage is unavailable.
    }
  },

  showCacheStatus() {
    const coinCount = this.state.coins.length;
    if (!coinCount) {
      this.status.setProperty(hmUI.prop.TEXT, "Tap REFRESH to load market");
      return;
    }
    const validChanges = this.state.coins.filter((coin) => Number.isFinite(coin.change));
    const up = validChanges.filter((coin) => coin.change >= 0).length;
    const breadth = validChanges.length
      ? Math.round((up / validChanges.length) * 100)
      : 50;
    const pulse = breadth >= 65 ? "BULLISH" : breadth <= 35 ? "BEARISH" : "NEUTRAL";
    this.status.setProperty(hmUI.prop.TEXT, `TOP 25 ${pulse} | ${up}/${validChanges.length} up 24h`);
  },

  formatCompact(value) {
    if (!Number.isFinite(value)) return "--";
    if (value >= 1e12) return `${(value / 1e12).toFixed(1)}T`;
    if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
    return value.toFixed(0);
  },

  currencySymbol() {
    if (this.state.currency === "jpy") return "JPY ";
    return this.state.currency === "usdt" ? "USDT " : "$";
  },

  visibleCoins() {
    if (!this.state.showWatchlist) return this.state.coins;
    return this.state.coins.filter((coin) => this.state.watchlist.includes(coin.id));
  },

  createCoinList(coins) {
    const data = coins.length
      ? coins.map((coin) => this.formatCoinRow(coin))
      : [{ id: "", rank: "", name: "No coins in this view", change: "", price: "Tap ALL COINS", marketCap: "", rangeVolume: "" }];
    const ranges = data.map((row, index) => ({
      start: index,
      end: index,
      type_id: row.change === "--" ? 3 : Number.parseFloat(row.change) >= 0 ? 1 : 2,
    }));
    const config = [1, 2, 3].map((typeId) => ({
      type_id: typeId,
      item_bg_color: 0x071b12,
      item_bg_radius: px(9),
      item_height: px(82),
      text_view: [
        { x: px(12), y: px(5), w: px(34), h: px(24), key: "rank", color: 0x00d9ff, text_size: px(14) },
        { x: px(48), y: px(4), w: px(226), h: px(26), key: "name", color: 0xd4ffe1, text_size: px(16) },
        { x: px(278), y: px(4), w: px(138), h: px(26), key: "change", color: typeId === 1 ? 0x20ff75 : typeId === 2 ? 0xff465d : 0x9ca9b9, text_size: px(15) },
        { x: px(48), y: px(31), w: px(165), h: px(22), key: "price", color: 0xffffff, text_size: px(14) },
        { x: px(218), y: px(31), w: px(198), h: px(22), key: "marketCap", color: 0xaeb4c0, text_size: px(12) },
        { x: px(48), y: px(54), w: px(368), h: px(20), key: "rangeVolume", color: 0x8c93a1, text_size: px(12) },
      ],
      text_view_count: 6,
    }));
    const options = {
      x: px(12), y: px(119), w: DEVICE_WIDTH - px(24), h: px(284),
      item_space: px(7), item_config: config, item_config_count: config.length,
      data_array: data, data_count: data.length,
      data_type_config: ranges, data_type_config_count: ranges.length,
      item_click_func: (list, index) => this.onCoinTap(index),
    };
    if (this.coinList) {
      this.coinList.setProperty(hmUI.prop.UPDATE_DATA, {
        data_type_config: ranges,
        data_type_config_count: ranges.length,
        data_array: data,
        data_count: data.length,
        on_page: 1,
      });
    } else {
      this.coinList = hmUI.createWidget(hmUI.widget.SCROLL_LIST, options);
    }
    if (this.state && this.state.showWatchlist) {
      this.watchButton.setProperty(hmUI.prop.TEXT, "[ WATCH ]");
    }
  },

  formatCoinRow(coin) {
    const change = Number.isFinite(coin.change) ? coin.change : null;
    const prefix = change > 0 ? "+" : "";
    const sign = this.currencySymbol();
    const price = this.formatPrice(coin.price);
    return {
      id: coin.id,
      rank: `#${coin.rank || "--"}`,
      name: `${coin.name} (${coin.symbol.toUpperCase()})${this.state.watchlist.includes(coin.id) ? " [W]" : ""}`,
      change: change === null ? "--" : `${prefix}${change.toFixed(2)}%`,
      price: `${sign}${price}`,
      marketCap: `MCap ${sign}${this.formatCompact(coin.marketCap)}`,
      rangeVolume: `H ${sign}${this.formatPrice(coin.high)}  L ${sign}${this.formatPrice(coin.low)}  Vol ${this.formatCompact(coin.volume)}`,
    };
  },

  onCoinTap(index) {
    const coin = this.visibleCoins()[index];
    if (!coin) return;
    if (coin.id === "bitcoin") {
      this.openBtcDashboard(coin);
      return;
    }
    this.toggleFavorite(index);
  },

  createDashboard() {
    this.dashboardWidgets = [];
    const addRect = (x, y, width, height, color) => {
      const rect = hmUI.createWidget(hmUI.widget.FILL_RECT, {
        x: px(x), y: px(y), w: px(width), h: px(height), color,
      });
      rect.setProperty(hmUI.prop.VISIBLE, false);
      this.dashboardWidgets.push(rect);
      return rect;
    };
    const addText = (y, height, size, text, color, x = 24, width = DEVICE_WIDTH - 48) => {
      const widget = hmUI.createWidget(hmUI.widget.TEXT, {
        x: px(x), y: px(y), w: px(width), h: px(height), text,
        color, text_size: px(size),
        align_h: hmUI.align.CENTER_H, align_v: hmUI.align.CENTER_V,
        text_style: hmUI.text_style.ELLIPSIS,
      });
      widget.setProperty(hmUI.prop.VISIBLE, false);
      this.dashboardWidgets.push(widget);
      return widget;
    };

    addRect(28, 151, DEVICE_WIDTH - 56, 104, 0x06110c);
    addRect(36, 177, DEVICE_WIDTH - 72, 1, 0x12321f);
    addRect(36, 205, DEVICE_WIDTH - 72, 1, 0x12321f);
    addRect(36, 233, DEVICE_WIDTH - 72, 1, 0x12321f);
    this.dashTitle = addText(15, 30, 21, "BTC // MARKET NODE", 0x20ff75);
    this.dashPrice = addText(48, 53, 36, "--", 0x20ff75);
    this.dashChange = addText(99, 26, 17, "24H CHANGE --", 0x00d9ff);
    this.dashChartLabel = addText(129, 20, 12, "[ PRICE TRACE / 24H ]", 0x00d9ff);
    this.dashHigh = addText(260, 26, 14, "HIGH --", 0xd4ffe1, 18, 200);
    this.dashLow = addText(260, 26, 14, "LOW --", 0xd4ffe1, 236, 200);
    this.dashMarketCap = addText(289, 24, 13, "MARKET CAP --", 0x9ca9b9);
    this.dashVolume = addText(314, 24, 13, "24H VOLUME --", 0x9ca9b9);
    this.dashMeta = addText(341, 26, 12, "SOURCE: COINGECKO // DELAYED DATA", 0x00d9ff);
    this.dashStatus = addText(367, 24, 12, "CHART: WAITING FOR FEED", 0x9ca9b9);

    this.backButton = hmUI.createWidget(hmUI.widget.BUTTON, {
      x: px(24), y: px(399), w: px(178), h: px(40), radius: px(8),
      normal_color: 0x082516, press_color: 0x0f4a2a,
      text: "[ BACK ]", text_size: px(16), color: 0x20ff75,
      click_func: () => this.closeBtcDashboard(),
    });
    this.backButton.setProperty(hmUI.prop.VISIBLE, false);
    this.dashboardWidgets.push(this.backButton);
    this.chartRefreshButton = hmUI.createWidget(hmUI.widget.BUTTON, {
      x: px(224), y: px(399), w: px(206), h: px(40), radius: px(8),
      normal_color: 0x071a22, press_color: 0x0a3442,
      text: "[ RESCAN ]", text_size: px(16), color: 0x00d9ff,
      click_func: () => {
        this.loadMarket();
        this.loadBtcChart();
      },
    });
    this.chartRefreshButton.setProperty(hmUI.prop.VISIBLE, false);
    this.dashboardWidgets.push(this.chartRefreshButton);
    this.chartBars = [];
  },

  openBtcDashboard(coin) {
    this.state.dashboardOpen = true;
    [this.title, this.status, this.refreshButton, this.watchButton,
      this.currencyButton, this.coinList, this.updated].forEach((widget) => {
      if (widget) widget.setProperty(hmUI.prop.VISIBLE, false);
    });
    this.dashboardWidgets.forEach((widget) => widget.setProperty(hmUI.prop.VISIBLE, true));
    this.updateBtcDashboard(coin);
    this.dashStatus.setProperty(hmUI.prop.TEXT, "CHART: REQUESTING 24H PRICE TRACE...");
    this.loadBtcChart();
  },

  updateBtcDashboard(coin) {
    this.dashTitle.setProperty(hmUI.prop.TEXT, "BTC // MARKET NODE");
    this.dashPrice.setProperty(hmUI.prop.TEXT, `${this.currencySymbol()}${this.formatPrice(coin.price)}`);
    const validChange = Number.isFinite(coin.change);
    this.dashChange.setProperty(
      hmUI.prop.TEXT,
      `24H CHANGE  ${validChange && coin.change > 0 ? "+" : ""}${validChange ? coin.change.toFixed(2) : "--"}%`
    );
    this.dashChange.setProperty(hmUI.prop.COLOR, coin.change >= 0 ? 0x20ff75 : 0xff465d);
    this.dashHigh.setProperty(hmUI.prop.TEXT, `HIGH  ${this.currencySymbol()}${this.formatPrice(coin.high)}`);
    this.dashLow.setProperty(hmUI.prop.TEXT, `LOW  ${this.currencySymbol()}${this.formatPrice(coin.low)}`);
    this.dashMarketCap.setProperty(hmUI.prop.TEXT, `MARKET CAP  ${this.currencySymbol()}${this.formatCompact(coin.marketCap)}`);
    this.dashVolume.setProperty(hmUI.prop.TEXT, `24H VOLUME  ${this.currencySymbol()}${this.formatCompact(coin.volume)}`);
    const updated = this.state.updatedAt ? new Date(this.state.updatedAt) : new Date();
    const clock = `${String(updated.getHours()).padStart(2, "0")}:${String(updated.getMinutes()).padStart(2, "0")}`;
    this.dashMeta.setProperty(hmUI.prop.TEXT, `SOURCE: COINGECKO // ${clock} // DELAYED`);
  },

  closeBtcDashboard() {
    this.state.dashboardOpen = false;
    this.dashboardWidgets.forEach((widget) => widget.setProperty(hmUI.prop.VISIBLE, false));
    [this.title, this.status, this.refreshButton, this.watchButton,
      this.currencyButton, this.coinList, this.updated].forEach((widget) => {
      if (widget) widget.setProperty(hmUI.prop.VISIBLE, true);
    });
  },

  loadBtcChart() {
    if (this.state.chartLoading) return;
    this.state.chartLoading = true;
    this.dashStatus.setProperty(hmUI.prop.TEXT, "CHART: REQUESTING 24H PRICE TRACE...");
    messageBuilder
      .request({ method: "GET_BTC_CHART", currency: this.state.currency }, { timeout: 20000 })
      .then((result) => {
        if (!result || result.error || !Array.isArray(result.points) || result.points.length < 2) {
          throw new Error("Chart data unavailable");
        }
        this.renderBtcChart(result.points);
        this.dashStatus.setProperty(hmUI.prop.TEXT, `TRACE READY // ${result.points.length} SAMPLES`);
      })
      .catch(() => {
        this.dashStatus.setProperty(hmUI.prop.TEXT, "TRACE OFFLINE // RETRY RESCAN");
      })
      .finally(() => {
        this.state.chartLoading = false;
      });
  },

  renderBtcChart(points) {
    this.chartBars.forEach((bar) => {
      hmUI.deleteWidget(bar);
      const widgetIndex = this.dashboardWidgets.indexOf(bar);
      if (widgetIndex >= 0) this.dashboardWidgets.splice(widgetIndex, 1);
    });
    this.chartBars = [];
    const values = points.map((point) => point[1]).filter((value) => Number.isFinite(value));
    if (values.length < 2) return;
    const min = Math.min.apply(null, values);
    const max = Math.max.apply(null, values);
    const span = Math.max(max - min, 0.000001);
    points.forEach((point, index) => {
      const value = point[1];
      if (!Number.isFinite(value)) return;
      const height = Math.max(5, Math.round(((value - min) / span) * 66));
      const bar = hmUI.createWidget(hmUI.widget.FILL_RECT, {
        x: px(33 + index * 16), y: px(249 - height), w: px(8), h: px(height),
        color: value >= values[0] ? 0x20ff75 : 0x00d9ff,
      });
      bar.setProperty(hmUI.prop.VISIBLE, !!this.state.dashboardOpen);
      this.chartBars.push(bar);
      this.dashboardWidgets.push(bar);
    });
  },

  toggleFavorite(index) {
    const coin = this.visibleCoins()[index];
    if (!coin) return;
    const favorites = this.state.watchlist;
    const position = favorites.indexOf(coin.id);
    if (position >= 0) favorites.splice(position, 1);
    else favorites.push(coin.id);
    this.writeCache();
    this.createCoinList(this.visibleCoins());
  },

  toggleWatchlist() {
    this.state.showWatchlist = !this.state.showWatchlist;
    this.watchButton.setProperty(
      hmUI.prop.TEXT,
      this.state.showWatchlist ? "[ WATCH ]" : "[ ALL ]"
    );
    this.createCoinList(this.visibleCoins());
  },

  cycleCurrency() {
    const currencies = ["usd", "usdt", "jpy"];
    const index = currencies.indexOf(this.state.currency);
    this.state.currency = currencies[(index + 1) % currencies.length];
    this.currencyButton.setProperty(hmUI.prop.TEXT, this.state.currency.toUpperCase());
    this.writeCache();
    this.createCoinList(this.visibleCoins());
    this.loadMarket();
  },

  loadMarket() {
    if (this.state.loading) return;
    const elapsed = Date.now() - (this.state.lastRequestAt || 0);
    const waitMs = Math.max(0, 12000 - elapsed);
    if (waitMs > 0) {
      if (this.state.pendingRefresh) clearTimeout(this.state.pendingRefresh);
      this.updated.setProperty(hmUI.prop.TEXT, `Please wait ${Math.ceil(waitMs / 1000)}s before refreshing`);
      this.state.pendingRefresh = setTimeout(() => this.loadMarket(), waitMs);
      return;
    }
    this.state.loading = true;
    this.state.lastRequestAt = Date.now();
    this.status.setProperty(hmUI.prop.TEXT, "Loading CoinGecko market data...");
    messageBuilder
      .request({ method: "GET_MARKET", currency: this.state.currency }, { timeout: 20000 })
      .then((result) => {
        const data = result || {};
        if (data.error || !Array.isArray(data.coins)) {
          throw new Error(data.error || "Invalid response");
        }
        this.state.coins = data.coins;
        this.state.updatedAt = Date.now();
        this.writeCache();
        this.createCoinList(this.visibleCoins());
        this.showCacheStatus();
        if (this.state.dashboardOpen) {
          const bitcoin = this.state.coins.find((coin) => coin.id === "bitcoin");
          if (bitcoin) this.updateBtcDashboard(bitcoin);
        }
        const now = new Date();
        const clock = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
        this.updated.setProperty(hmUI.prop.TEXT, `Updated ${clock} | CoinGecko`);
      })
      .catch(() => {
        if (this.state.coins.length) {
          this.createCoinList(this.visibleCoins());
          this.showCacheStatus();
          this.updated.setProperty(hmUI.prop.TEXT, "Offline | showing cached market data");
        } else {
          this.status.setProperty(hmUI.prop.TEXT, "Phone/API unavailable");
          this.updated.setProperty(hmUI.prop.TEXT, "Reconnect Zepp app and retry");
        }
      })
      .finally(() => {
        this.state.loading = false;
      });
  },

  formatPrice(value) {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) return "--";
    const digits = number >= 1000 ? 0 : number >= 1 ? 2 : 5;
    return number.toFixed(digits);
  },

  onDestroy() {
    if (this.state.timer) clearInterval(this.state.timer);
    if (this.state.pendingRefresh) clearTimeout(this.state.pendingRefresh);
  },
});
