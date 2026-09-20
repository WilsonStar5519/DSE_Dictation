/**
 * 連線對戰：用 PeerJS（MIT）做 WebRTC 點對點連接，靠公用 signaling 伺服器交換連線資訊，
 * 遊戲資料直接在兩位玩家之間傳輸，所以放在 GitHub Pages 這類純靜態主機也能對戰。
 *
 * 由「主機」負責運算整局遊戲，「客機」只送輸入、收畫面，避免雙方各自模擬而不同步。
 */
(function (global) {
  const ID_PREFIX = "fwsnake-";
  const CODE_CHARS = "ACDEFGHJKLMNPQRSTUVWXY345789";

  function randomCode(len) {
    let out = "";
    for (let i = 0; i < len; i++) {
      out += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    }
    return out;
  }

  function FanwenNet() {
    this.peer = null;
    this.conn = null;
    this.role = null;
    this.code = null;
    this.handlers = {};
  }

  FanwenNet.prototype.on = function (name, fn) {
    this.handlers[name] = fn;
    return this;
  };

  FanwenNet.prototype.emit = function (name, payload) {
    if (this.handlers[name]) this.handlers[name](payload);
  };

  FanwenNet.prototype.available = function () {
    return typeof global.Peer === "function";
  };

  FanwenNet.prototype.reset = function () {
    if (this.conn) {
      try {
        this.conn.close();
      } catch (err) {
        /* 已斷開 */
      }
    }
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch (err) {
        /* 已銷毀 */
      }
    }
    this.peer = null;
    this.conn = null;
    this.role = null;
  };

  FanwenNet.prototype.bindConn = function (conn) {
    const self = this;
    this.conn = conn;
    conn.on("open", function () {
      self.emit("connected", { role: self.role });
    });
    conn.on("data", function (data) {
      self.emit("data", data);
    });
    conn.on("close", function () {
      self.emit("closed");
    });
    conn.on("error", function (err) {
      self.emit("error", (err && err.message) || "連線發生問題");
    });
  };

  FanwenNet.prototype.host = function () {
    if (!this.available()) {
      this.emit("error", "連線元件未載入，請重新整理頁面再試。");
      return;
    }
    this.reset();
    this.role = "host";
    const code = randomCode(4);
    this.code = code;
    const self = this;
    this.peer = new global.Peer(ID_PREFIX + code, { debug: 0 });
    this.peer.on("open", function () {
      self.emit("ready", { code: code, role: "host" });
    });
    this.peer.on("connection", function (conn) {
      if (self.conn) {
        conn.close();
        return;
      }
      self.bindConn(conn);
    });
    this.peer.on("error", function (err) {
      const type = err && err.type;
      if (type === "unavailable-id") {
        self.host();
        return;
      }
      self.emit(
        "error",
        type === "peer-unavailable"
          ? "找不到這個房間號，請確認後再試。"
          : "無法連上對戰伺服器，請檢查網絡後再試。"
      );
    });
  };

  FanwenNet.prototype.join = function (code) {
    if (!this.available()) {
      this.emit("error", "連線元件未載入，請重新整理頁面再試。");
      return;
    }
    const clean = String(code || "").trim().toUpperCase();
    if (clean.length !== 4) {
      this.emit("error", "房間號是 4 個字，請重新輸入。");
      return;
    }
    this.reset();
    this.role = "guest";
    this.code = clean;
    const self = this;
    this.peer = new global.Peer(ID_PREFIX + clean + "-" + randomCode(4), { debug: 0 });
    this.peer.on("open", function () {
      self.emit("ready", { code: clean, role: "guest" });
      self.bindConn(self.peer.connect(ID_PREFIX + clean));
    });
    this.peer.on("error", function (err) {
      const type = err && err.type;
      self.emit(
        "error",
        type === "peer-unavailable"
          ? "找不到這個房間號，請確認後再試。"
          : "無法連上對戰伺服器，請檢查網絡後再試。"
      );
    });
  };

  FanwenNet.prototype.send = function (msg) {
    if (this.conn && this.conn.open) {
      try {
        this.conn.send(msg);
      } catch (err) {
        /* 丟棄這一格畫面 */
      }
    }
  };

  FanwenNet.prototype.isConnected = function () {
    return !!(this.conn && this.conn.open);
  };

  global.FanwenNet = FanwenNet;
})(window);
