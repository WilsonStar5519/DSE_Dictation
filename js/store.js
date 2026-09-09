/** 最高分與設定的本機儲存。localStorage 不可用時全部退化為記憶體。 */
(function (global) {
  const KEY = "fanwen-snake/v2";
  let cache = null;

  function read() {
    if (cache) return cache;
    cache = { best: {}, settings: {} };
    try {
      const raw = global.localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          cache.best = parsed.best || {};
          cache.settings = parsed.settings || {};
        }
      }
    } catch (err) {
      /* 無痕模式或被封鎖：只用記憶體 */
    }
    return cache;
  }

  function write() {
    try {
      global.localStorage.setItem(KEY, JSON.stringify(read()));
    } catch (err) {
      /* 忽略寫入失敗 */
    }
  }

  function bestKey(mode, workId) {
    return mode + "::" + (workId || "-");
  }

  global.FanwenStore = {
    getBest: function (mode, workId) {
      return read().best[bestKey(mode, workId)] || 0;
    },
    submitScore: function (mode, workId, score) {
      const data = read();
      const key = bestKey(mode, workId);
      const prev = data.best[key] || 0;
      if (score > prev) {
        data.best[key] = score;
        write();
        return { record: true, best: score, previous: prev };
      }
      return { record: false, best: prev, previous: prev };
    },
    get: function (name, fallback) {
      const value = read().settings[name];
      return value === undefined ? fallback : value;
    },
    set: function (name, value) {
      read().settings[name] = value;
      write();
    },
  };
})(window);
