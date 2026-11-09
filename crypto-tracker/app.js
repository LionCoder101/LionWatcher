App({
  globalData: {},
  onCreate(options) {
    console.log("LionTracker started", options);
  },

  onDestroy(options) {
    console.log("LionTracker stopped", options);
  },
});
