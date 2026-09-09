/** 介面流程：模式 → 篇章 → 篇目 → 對局，以及連線房間與結算。 */
(function () {
  const Data = window.FanwenData;
  const Audio = window.FanwenAudio;
  const Store = window.FanwenStore;

  const MODES = [
    {
      id: "classic",
      badge: "壹",
      name: "經典背默",
      desc: "依範文順序吃字，撞牆或咬到自己即結束。每完成一組句子便蛻皮重來。",
      tag: "基本",
      engine: "classic",
      tone: "classic",
    },
    {
      id: "timed",
      badge: "貳",
      name: "限時挑戰",
      desc: "九十秒倒數，四邊可以穿牆，比誰在鐘響前搶得多。",
      tag: "計時",
      engine: "classic",
      tone: "classic",
    },
    {
      id: "strict",
      badge: "參",
      name: "零錯挑戰",
      desc: "吃錯一個字即出局，專門磨準確度。",
      tag: "高難",
      engine: "classic",
      tone: "classic",
    },
    {
      id: "arena",
      badge: "肆",
      name: "群蛇亂鬥",
      desc: "slither.io 玩法：自由轉向、按住加速，與電腦蛇爭雄，撞人身體即死。",
      tag: "亂鬥",
      engine: "arena",
      layout: "solo",
      bots: 5,
      tone: "arena",
    },
    {
      id: "duel",
      badge: "伍",
      name: "同機雙人",
      desc: "一機兩人：朱蛇用方向鍵，青蛇用 A／D，最後生存者勝。",
      tag: "雙人",
      engine: "arena",
      layout: "local2",
      bots: 2,
      tone: "duel",
    },
    {
      id: "online",
      badge: "陸",
      name: "連線對戰",
      desc: "開房間取得四位房間號，遠方的朋友輸入即可同場較量。",
      tag: "連線",
      engine: "arena",
      layout: "online",
      bots: 2,
      tone: "online",
    },
  ];

  const HUD_BY_MODE = {
    classic: ["score", "best", "next", "progress", "combo", "mistakes"],
    timed: ["score", "best", "next", "progress", "time", "mistakes"],
    strict: ["score", "best", "next", "progress", "combo", "mistakes"],
    arena: ["score", "best", "next", "progress", "kills", "length"],
    duel: ["score", "next", "combo", "kills", "length"],
    online: ["score", "next", "combo", "kills", "length"],
  };

  const el = function (id) {
    return document.getElementById(id);
  };

  const screens = {
    home: el("screen-home"),
    chapters: el("screen-chapters"),
    works: el("screen-works"),
    room: el("screen-room"),
    game: el("screen-game"),
  };

  const stage = el("stage");
  const stageWrap = el("stage-wrap");
  const recite = el("recite");
  const hud = el("hud");
  const touchPad = el("touch-pad");
  const touchBoost = el("touch-boost");
  const resultOverlay = el("overlay-result");
  const helpOverlay = el("overlay-help");

  let currentScreen = "home";
  let mode = MODES[0];
  let collection = null;
  let work = null;
  let engineKind = null;
  let net = null;
  let netRole = null;

  const classic = new window.FanwenClassic({
    canvas: stage,
    onState: renderHud,
    onEnd: showResult,
  });

  const arena = new window.FanwenArena({
    canvas: stage,
    onState: renderHud,
    onEnd: showResult,
  });

  /* ------------------------------------------------------------ 畫面切換 */

  function show(name) {
    if (name !== "game") {
      classic.stop();
      classic.detachInput();
      arena.stop();
      arena.detachInput();
    }
    Object.keys(screens).forEach(function (key) {
      screens[key].classList.toggle("active", key === name);
    });
    currentScreen = name;
    window.scrollTo(0, 0);
  }

  function progressTextFromCount(target, count) {
    let left = count;
    let out = "";
    target.segments.forEach(function (segment) {
      if (left <= 0) return;
      let used = 0;
      segment.lines.forEach(function (line, i) {
        const take = Math.max(0, Math.min(line.length, left - used));
        out += line.slice(0, take);
        if (take === line.length) out += segment.puncts[i] || "";
        used += take;
      });
      left -= used;
    });
    return out;
  }

  /* ------------------------------------------------------------ 主頁 */

  function renderModes() {
    const grid = el("mode-grid");
    grid.innerHTML = "";
    MODES.forEach(function (item) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mode-card";
      btn.setAttribute("data-tone", item.tone);
      btn.innerHTML =
        '<span class="mode-badge">' +
        item.badge +
        "</span><span><span class='mode-name'>" +
        item.name +
        "</span><span class='mode-desc'>" +
        item.desc +
        "</span></span><span class='mode-tag'>" +
        item.tag +
        "</span>";
      btn.addEventListener("click", function () {
        Audio.unlock();
        Audio.ui();
        mode = item;
        if (item.id === "online") {
          openRoom();
        } else {
          openChapters();
        }
      });
      grid.appendChild(btn);
    });
  }

  /* ------------------------------------------------------------ 選篇章 */

  function openChapters() {
    el("chapters-title").textContent = mode.name;
    el("chapters-sub").textContent = "選一篇範文 · 指定文言經典十二篇";
    const grid = el("chapter-grid");
    grid.innerHTML = "";
    Data.CURRICULUM.forEach(function (col) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chapter-card";
      const count = col.works.length;
      const best = col.works.reduce(function (max, item) {
        return Math.max(max, Store.getBest(mode.id, item.id));
      }, 0);
      btn.innerHTML =
        '<span class="chapter-no">' +
        col.no +
        '</span><span><span class="chapter-title">' +
        col.title +
        '</span><span class="chapter-meta">' +
        col.subtitle +
        (count > 1 ? " · " + count + " 篇" : "") +
        (best ? '　<span class="chapter-best">最高 ' + best + "</span>" : "") +
        "</span></span>";
      btn.addEventListener("click", function () {
        Audio.ui();
        collection = col;
        if (col.works.length === 1) openGame(col.works[0]);
        else openWorks(col);
      });
      grid.appendChild(btn);
    });
    show("chapters");
  }

  function openWorks(col) {
    el("works-title").textContent = col.title;
    el("works-sub").textContent = col.subtitle;
    const grid = el("work-grid");
    grid.innerHTML = "";
    col.works.forEach(function (item) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chapter-card";
      const best = Store.getBest(mode.id, item.id);
      btn.innerHTML =
        '<span class="chapter-no">' +
        (item.form || "篇") +
        '</span><span><span class="chapter-title">' +
        Data.workLabel(item) +
        '</span><span class="chapter-meta">' +
        item.author +
        " · " +
        item.segments.length +
        " 組句" +
        (best ? '　<span class="chapter-best">最高 ' + best + "</span>" : "") +
        "</span></span>";
      btn.addEventListener("click", function () {
        Audio.ui();
        openGame(item);
      });
      grid.appendChild(btn);
    });
    show("works");
  }

  /* ------------------------------------------------------------ 對局 */

  function applyHudVisibility() {
    const wanted = HUD_BY_MODE[mode.id] || HUD_BY_MODE.classic;
    Array.prototype.forEach.call(hud.children, function (node) {
      const name = node.getAttribute("data-stat");
      node.hidden = wanted.indexOf(name) === -1;
    });
  }

  function openGame(target, opts) {
    work = target;
    engineKind = mode.engine;
    el("game-work").textContent = Data.workLabel(target);
    el("game-mode").textContent = mode.name;
    applyHudVisibility();
    resultOverlay.classList.remove("active", "win");
    resultOverlay.setAttribute("aria-hidden", "true");
    recite.textContent = "";
    recite.dataset.empty = "1";

    el("speed-row").hidden = engineKind !== "classic";
    touchPad.classList.toggle("on", engineKind === "classic");
    touchBoost.hidden = engineKind !== "arena";
    touchBoost.classList.toggle("on", engineKind === "arena");
    el("btn-pause").hidden = mode.layout === "online";
    el("hint").textContent =
      engineKind === "classic"
        ? "電腦：方向鍵／WASD　手機：在畫面滑動或用下方按鈕"
        : mode.id === "duel"
        ? "朱蛇：← → 轉向、↑ 加速　　青蛇：A／D 轉向、W 加速"
        : "滑鼠／手指指向就是前進方向，按住畫面可加速（消耗身長）";

    show("game");

    if (engineKind === "classic") {
      stageWrap.className = "stage-wrap square";
      classic.setMode(mode.id);
      classic.load(target);
      classic.attachInput();
      el("btn-start").textContent = "開始";
    } else {
      stageWrap.className = "stage-wrap wide";
      arena.configure({
        layout: mode.layout,
        work: target,
        botCount: mode.bots,
        isHost: !opts || opts.role !== "guest",
      });
      arena.attachInput();
      if (opts && opts.role === "guest") {
        arena.remoteId = "p1";
        arena.remoteNext = null;
        el("btn-start").textContent = "等待主機";
        el("btn-restart").hidden = true;
      } else {
        el("btn-restart").hidden = false;
        el("btn-start").textContent = "開始";
        if (mode.layout === "online") startArena();
      }
    }
  }

  function startClassic() {
    Audio.unlock();
    classic.start();
    el("btn-start").textContent = "開始";
  }

  function startArena() {
    Audio.unlock();
    if (mode.layout === "online" && netRole === "host") {
      arena.netSend = function (msg) {
        net.send(msg);
      };
      net.send({ t: "begin", workId: work.id });
    }
    arena.start();
  }

  function startCurrent() {
    if (engineKind === "classic") {
      if (classic.paused) {
        classic.togglePause();
        return;
      }
      startClassic();
    } else {
      if (arena.remote) return;
      if (arena.paused) {
        arena.togglePause();
        return;
      }
      startArena();
    }
  }

  /* ------------------------------------------------------------ HUD */

  function setStat(name, value, hot) {
    const node = el("stat-" + name);
    if (!node) return;
    node.textContent = value;
    const box = node.parentElement;
    if (box) box.setAttribute("data-hot", hot ? "1" : "0");
  }

  function renderHud(state) {
    if (state.score !== undefined) setStat("score", state.score);
    if (state.best !== undefined) setStat("best", state.best);
    if (state.nextChar !== undefined) setStat("next", state.nextChar);
    if (state.combo !== undefined) setStat("combo", state.combo, state.combo >= 5);
    if (state.mistakes !== undefined) setStat("mistakes", state.mistakes, state.mistakes > 0);
    if (state.kills !== undefined) setStat("kills", state.kills, state.kills > 0);
    if (state.length !== undefined) setStat("length", state.length);
    if (state.timeLeft !== undefined && state.timeLeft !== null) {
      setStat("time", state.timeLeft, state.timeLeft <= 10);
    }
    if (state.segTotal) {
      setStat("progress", state.segIndex + "/" + state.segTotal);
    } else if (state.charTotal) {
      setStat("progress", state.charIndex + "/" + state.charTotal);
    }

    el("btn-pause").textContent = state.paused ? "繼續" : "暫停";

    if (engineKind === "classic") {
      const text = state.progress || "";
      recite.textContent = text;
      recite.dataset.empty = text ? "0" : "1";
    } else if (mode.layout !== "solo" && state.players) {
      recite.dataset.empty = "0";
      recite.textContent = state.players
        .map(function (p) {
          return p.name + "　" + p.score + (p.dead ? "（歿）" : "");
        })
        .join("　│　");
    } else if (work && state.charIndex !== undefined) {
      const text = progressTextFromCount(work, state.charIndex);
      recite.textContent = text;
      recite.dataset.empty = text ? "0" : "1";
    }
  }

  /* ------------------------------------------------------------ 結算 */

  function statRow(label, value, tone) {
    return (
      '<div' +
      (tone ? ' data-tone="' + tone + '"' : "") +
      "><dt>" +
      label +
      "</dt><dd>" +
      value +
      "</dd></div>"
    );
  }

  function showResult(result) {
    const grade = el("result-grade");
    const stats = el("result-stats");
    resultOverlay.classList.toggle("win", !!result.won);

    if (result.versus) {
      grade.hidden = false;
      grade.setAttribute("data-grade", "勝");
      grade.innerHTML = "<span>勝</span>";
      el("result-title").textContent = result.winnerName + " 勝出";
      el("result-reason").textContent = result.modeName + " · " + result.workLabel;
      const top = result.players.slice().sort(function (a, b) {
        return b.score - a.score;
      })[0];
      el("result-score").textContent = top ? top.score : 0;
      el("result-record").hidden = true;
      stats.innerHTML = result.players
        .map(function (p) {
          return statRow(
            p.name + (p.dead ? "（歿）" : ""),
            p.score + " 分",
            p.name === result.winnerName ? "gold" : ""
          );
        })
        .join("")
        .concat(
          statRow("吃對字", result.players[0].correct + " / " + result.players[1].correct),
          statRow("擊殺", result.players[0].kills + " / " + result.players[1].kills),
          statRow("對局時間", result.seconds + " 秒")
        );
    } else {
      grade.hidden = false;
      grade.setAttribute("data-grade", result.grade);
      grade.innerHTML = "<span>" + result.grade + "</span>";
      el("result-title").textContent = result.won ? "通　關" : "遊戲結束";
      el("result-reason").textContent =
        (result.reason || "") + "　·　" + result.modeName + " " + result.workLabel;
      el("result-score").textContent = result.score;
      el("result-record").hidden = !result.isRecord;

      const rows = [
        statRow("吃對", result.correct + " 字", "gold"),
        statRow("吃錯", result.mistakes + " 次", result.mistakes ? "bad" : ""),
        statRow("準確率", Math.round((result.accuracy || 0) * 100) + "%"),
        statRow("最長連擊", (result.bestCombo || 0) + " 連"),
      ];
      if (result.mode === "arena") {
        rows.push(statRow("擊殺", (result.kills || 0) + " 條", result.kills ? "gold" : ""));
        rows.push(statRow("身長", (result.length || 0) + ""));
      } else {
        rows.push(statRow("完成句組", result.segments + " / " + result.segmentTotal));
      }
      rows.push(statRow("用時", result.seconds + " 秒"));
      rows.push(statRow("最高分", result.best + "", "gold"));
      stats.innerHTML = rows.join("");
    }

    resultOverlay.classList.add("active");
    resultOverlay.setAttribute("aria-hidden", "false");

    if (netRole === "host" && net && net.isConnected()) {
      net.send({ t: "over", payload: result });
    }
  }

  function closeResult() {
    resultOverlay.classList.remove("active");
    resultOverlay.setAttribute("aria-hidden", "true");
  }

  /* ------------------------------------------------------------ 連線 */

  function setRoomStatus(text, tone) {
    const node = el("room-status");
    node.textContent = text;
    if (tone) node.setAttribute("data-tone", tone);
    else node.removeAttribute("data-tone");
  }

  function ensureNet() {
    if (net) return net;
    net = new window.FanwenNet();
    net.on("ready", function (info) {
      if (info.role === "host") {
        el("room-code-box").hidden = false;
        el("room-code").textContent = info.code;
        setRoomStatus("房間已開，把「" + info.code + "」告訴對手，等待加入……");
      } else {
        setRoomStatus("正在連線 " + info.code + "……");
      }
    });
    net.on("connected", function (info) {
      netRole = info.role;
      if (info.role === "host") {
        setRoomStatus("對手已連上，可以選篇章開戰。", "ok");
        el("btn-room-start").hidden = false;
      } else {
        setRoomStatus("已連上主機，等待對方選篇章……", "ok");
      }
    });
    net.on("data", function (msg) {
      if (!msg || !msg.t) return;
      if (netRole === "host") {
        if (msg.t === "in") arena.applyGuestInput(msg.turn, msg.boost, msg.pointer);
        return;
      }
      if (msg.t === "begin") {
        const found = Data.findWork(msg.workId);
        if (found) {
          mode = MODES.find(function (m) {
            return m.id === "online";
          });
          collection = found.collection;
          openGame(found.work, { role: "guest" });
          arena.netInput = function (turn, boost, pointer) {
            net.send({ t: "in", turn: turn, boost: boost, pointer: pointer });
          };
        }
      } else if (msg.t === "state") {
        arena.remoteNext = msg.n || arena.remoteNext;
        arena.applyRemote(msg);
      } else if (msg.t === "over") {
        showResult(msg.payload);
      }
    });
    net.on("closed", function () {
      setRoomStatus("連線已中斷。", "bad");
      el("btn-room-start").hidden = true;
      arena.remote = null;
      arena.stop();
    });
    net.on("error", function (message) {
      setRoomStatus(message, "bad");
    });
    return net;
  }

  function openRoom() {
    netRole = null;
    el("room-code-box").hidden = true;
    el("btn-room-start").hidden = true;
    const ready = typeof window.Peer === "function";
    el("btn-room-host").disabled = !ready;
    el("btn-room-join").disabled = !ready;
    setRoomStatus(
      ready
        ? "尚未連線。建立房間或輸入對手的房間號。"
        : "連線元件未載入，請檢查網絡後重新整理頁面。",
      ready ? "" : "bad"
    );
    show("room");
  }

  /* ------------------------------------------------------------ 事件 */

  renderModes();

  document.querySelectorAll("[data-back]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      Audio.ui();
      const to = btn.getAttribute("data-back");
      if (to !== "auto") {
        show(to);
        return;
      }
      closeResult();
      if (mode.id === "online") show("room");
      else if (collection && collection.works.length > 1) openWorks(collection);
      else show("chapters");
    });
  });

  el("btn-start").addEventListener("click", function () {
    Audio.ui();
    startCurrent();
  });

  el("btn-restart").addEventListener("click", function () {
    Audio.ui();
    closeResult();
    if (engineKind === "classic") startClassic();
    else startArena();
  });

  el("btn-pause").addEventListener("click", function () {
    Audio.ui();
    if (engineKind === "classic") classic.togglePause();
    else arena.togglePause();
  });

  el("btn-again").addEventListener("click", function () {
    Audio.ui();
    closeResult();
    if (engineKind === "classic") startClassic();
    else startArena();
  });

  el("btn-change").addEventListener("click", function () {
    Audio.ui();
    closeResult();
    openChapters();
  });

  el("btn-home").addEventListener("click", function () {
    Audio.ui();
    closeResult();
    show("home");
  });

  document.querySelectorAll("[data-speed]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      Audio.ui();
      document.querySelectorAll("[data-speed]").forEach(function (other) {
        other.classList.toggle("active", other === btn);
      });
      classic.setSpeed(btn.getAttribute("data-speed"));
      Store.set("speed", btn.getAttribute("data-speed"));
    });
  });

  touchPad.querySelectorAll("[data-dir]").forEach(function (btn) {
    const fire = function (e) {
      e.preventDefault();
      classic.setDirection(btn.getAttribute("data-dir"));
    };
    btn.addEventListener("touchstart", fire, { passive: false });
    btn.addEventListener("mousedown", fire);
  });

  touchBoost.addEventListener("touchstart", function (e) {
    e.preventDefault();
    arena.setBoost(true);
  });
  touchBoost.addEventListener("touchend", function (e) {
    e.preventDefault();
    arena.setBoost(false);
  });

  el("btn-sound").addEventListener("click", function () {
    const next = !Audio.isEnabled();
    Audio.setEnabled(next);
    Store.set("sound", next);
    el("btn-sound").textContent = "音效：" + (next ? "開" : "關");
    if (next) Audio.ui();
  });

  el("btn-help").addEventListener("click", function () {
    Audio.ui();
    helpOverlay.classList.add("active");
    helpOverlay.setAttribute("aria-hidden", "false");
  });

  el("btn-help-close").addEventListener("click", function () {
    Audio.ui();
    helpOverlay.classList.remove("active");
    helpOverlay.setAttribute("aria-hidden", "true");
  });

  el("btn-room-host").addEventListener("click", function () {
    Audio.ui();
    setRoomStatus("正在開房間……");
    ensureNet().host();
  });

  el("btn-room-join").addEventListener("click", function () {
    Audio.ui();
    ensureNet().join(el("room-input").value);
  });

  el("btn-room-copy").addEventListener("click", function () {
    const code = el("room-code").textContent;
    if (navigator.clipboard) navigator.clipboard.writeText(code);
    setRoomStatus("房間號 " + code + " 已複製，等待對手加入……");
  });

  el("btn-room-start").addEventListener("click", function () {
    Audio.ui();
    netRole = "host";
    openChapters();
  });

  el("room-input").addEventListener("keydown", function (e) {
    if (e.key === "Enter") ensureNet().join(el("room-input").value);
  });

  document.addEventListener("keydown", function (e) {
    if (currentScreen !== "game") {
      if (e.key === "Escape") show("home");
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      closeResult();
      startCurrent();
    } else if (e.key === "p" || e.key === "P") {
      e.preventDefault();
      if (engineKind === "classic") classic.togglePause();
      else arena.togglePause();
    } else if (e.key === "Escape") {
      e.preventDefault();
      closeResult();
      show(mode.id === "online" ? "room" : "chapters");
    } else if (e.key === " " && engineKind === "classic" && !classic.running) {
      e.preventDefault();
      startClassic();
    }
  });

  document.addEventListener("pointerdown", function () {
    Audio.unlock();
  });

  const savedSound = Store.get("sound", true);
  Audio.setEnabled(savedSound);
  el("btn-sound").textContent = "音效：" + (savedSound ? "開" : "關");

  const savedSpeed = Store.get("speed", "mid");
  classic.setSpeed(savedSpeed);
  document.querySelectorAll("[data-speed]").forEach(function (btn) {
    btn.classList.toggle("active", btn.getAttribute("data-speed") === savedSpeed);
  });

  window.addEventListener("resize", function () {
    if (currentScreen === "game") {
      if (engineKind === "classic") classic.render(1);
      else arena.render();
    }
  });
})();
