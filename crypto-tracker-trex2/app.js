import "./shared/device-polyfill";
import { MessageBuilder } from "./shared/message";

App({
  globalData: { messageBuilder: null },

  onCreate() {
    const appId = hmApp.packageInfo().appId;
    this.globalData.messageBuilder = new MessageBuilder({ appId });
    this.globalData.messageBuilder.connect();
  },

  onDestroy() {
    if (this.globalData.messageBuilder) {
      this.globalData.messageBuilder.disConnect();
    }
  },
});
