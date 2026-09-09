/**
 * 群蛇亂鬥引擎：參考 slither.io 的連續移動玩法。
 *
 * 與經典模式不同，這裏是自由角度轉向、可加速消耗身長、撞到別人身體即死。
 * 教育部分保留：每條蛇都有自己的背默進度，吃到「下一個字」有金字加成。
 *
 * 支援三種佈局：
 *   solo   ── 一人對電腦蛇，鏡頭跟隨
 *   local2 ── 同機雙人，小擂台，全場可見
 *   online ── 由主機運算，客機只負責畫面與輸入
 */
(function (global) {
  const D = global.FanwenDraw;
  const Data = global.FanwenData;
  const Audio = global.FanwenAudio;

  const BASE_SPEED = 168;
  const BOOST_SPEED = 306;
  const TURN_RATE = 3.4;
  const SPACING = 5;
  const MIN_MASS = 10;
  const FOOD_VALUE = 3;
  const CORRECT_VALUE = 9;

  const BOT_NAMES = ["墨龍", "青蚨", "赤練", "白澤", "螭吻", "玄武", "金鱗", "夔牛"];
  const PALETTE = [
    { body: "#3f7f68", light: "#5fae90", name: "碧" },
    { body: "#8d5bbf", light: "#b48ae0", name: "紫" },
    { body: "#2f6ea8", light: "#5b9ed6", name: "靛" },
    { body: "#a8762f", light: "#d6a558", name: "褐" },
    { body: "#7a8f2f", light: "#a8bf58", name: "蒼" },
    { body: "#a83f6e", light: "#d670a0", name: "緋" },
  ];
  const PLAYER_COLORS = [
    { body: "#c8402f", light: "#ef7a5f", name: "朱" },
    { body: "#2f86a8", light: "#63b9d6", name: "青" },
  ];

  function dist2(ax, ay, bx, by) {
    const dx = ax - bx;
    const dy = ay - by;
    return dx * dx + dy * dy;
  }

  function angleDiff(a, b) {
    let d = a - b;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  }

  function headRadius(mass) {
    return 7 + Math.min(13, mass * 0.085);
  }

  function trailPixels(mass) {
    return 110 + mass * 7;
  }

  function Snake(cfg) {
    this.id = cfg.id;
    this.name = cfg.name;
    this.color = cfg.color;
    this.isBot = !!cfg.isBot;
    this.isLocal = !!cfg.isLocal;
    this.playerIndex = cfg.playerIndex === undefined ? -1 : cfg.playerIndex;
    this.x = cfg.x;
    this.y = cfg.y;
    this.angle = cfg.angle;
    this.mass = cfg.mass || 22;
    this.points = [];
    for (let i = 0; i < 30; i++) {
      this.points.push({
        x: this.x - Math.cos(this.angle) * i * SPACING,
        y: this.y - Math.sin(this.angle) * i * SPACING,
      });
    }
    this.turn = 0;
    this.boost = false;
    this.pointerAngle = null;
    this.dead = false;
    this.score = 0;
    this.correct = 0;
    this.mistakes = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.kills = 0;
    this.seqIndex = 0;
    this.eatenChars = [];
    this.boostDrop = 0;
  }

  function FanwenArena(opts) {
    this.canvas = opts.canvas;
    this.onState = opts.onState || function () {};
    this.onEnd = opts.onEnd || function () {};
    this.layout = "solo";
    this.work = null;
    this.chars = [];
    this.running = false;
    this.paused = false;
    this.ended = false;
    this.remote = null;
    this.snakes = [];
    this.food = [];
    this.camera = { x: 0, y: 0, zoom: 1 };
    this.radius = 1250;
    this.botCount = 5;
    this.startedAt = 0;
    this.elapsed = 0;
    this._raf = null;
    this._last = 0;
    this._loop = this.loop.bind(this);
    this._onKeyDown = this.handleKey.bind(this, true);
    this._onKeyUp = this.handleKey.bind(this, false);
    this._onPointerMove = this.handlePointerMove.bind(this);
    this._onPointerDown = this.handlePointerDown.bind(this);
    this._onPointerUp = this.handlePointerUp.bind(this);
    this.netSend = null;
  }

  FanwenArena.prototype.attachInput = function () {
    if (this._attached) return;
    this._attached = true;
    document.addEventListener("keydown", this._onKeyDown);
    document.addEventListener("keyup", this._onKeyUp);
    this.canvas.addEventListener("pointermove", this._onPointerMove);
    this.canvas.addEventListener("pointerdown", this._onPointerDown);
    document.addEventListener("pointerup", this._onPointerUp);
    this.canvas.addEventListener("touchmove", this._onPointerMove, { passive: false });
  };

  FanwenArena.prototype.detachInput = function () {
    if (!this._attached) return;
    this._attached = false;
    document.removeEventListener("keydown", this._onKeyDown);
    document.removeEventListener("keyup", this._onKeyUp);
    this.canvas.removeEventListener("pointermove", this._onPointerMove);
    this.canvas.removeEventListener("pointerdown", this._onPointerDown);
    document.removeEventListener("pointerup", this._onPointerUp);
    this.canvas.removeEventListener("touchmove", this._onPointerMove);
  };

  FanwenArena.prototype.configure = function (cfg) {
    this.layout = cfg.layout || "solo";
    this.work = cfg.work || null;
    this.chars = this.work ? Data.workChars(this.work) : [];
    this.botCount = cfg.botCount === undefined ? 5 : cfg.botCount;
    this.radius = this.layout === "solo" ? 1250 : 780;
    this.playerNames = cfg.playerNames || ["朱蛇", "青蛇"];
    this.isHost = cfg.isHost !== false;
    this.isGuest = !this.isHost;
    this.remote = null;
    this.ended = false;
    this.running = false;
    this.countdown = 0;
    this.snakes = [];
    this.food = [];
    this.startLoop();
  };

  FanwenArena.prototype.randomSpot = function (margin) {
    const m = margin || 120;
    const r = Math.sqrt(Math.random()) * (this.radius - m);
    const a = Math.random() * Math.PI * 2;
    return { x: Math.cos(a) * r, y: Math.sin(a) * r };
  };

  /**
   * 出生點：靠內圈並朝向圓心，免得一開局就直奔結界。
   * side 有值時固定放在該方位，讓雙人對戰分邊。
   */
  FanwenArena.prototype.spawnPose = function (frac, side) {
    const r = this.radius * (frac || 0.4) * (0.55 + Math.random() * 0.45);
    const a = side === undefined ? Math.random() * Math.PI * 2 : side;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    return {
      x: x,
      y: y,
      angle: Math.atan2(-y, -x) + (Math.random() - 0.5) * 0.5,
    };
  };

  FanwenArena.prototype.start = function () {
    this.snakes = [];
    this.food = [];
    this.ended = false;
    this.paused = false;
    this.elapsed = 0;
    this.startedAt = performance.now();

    const humans = this.layout === "solo" ? 1 : 2;
    const base = Math.random() * Math.PI * 2;
    for (let i = 0; i < humans; i++) {
      const pose = this.spawnPose(0.42, humans > 1 ? base + i * Math.PI : undefined);
      this.snakes.push(
        new Snake({
          id: "p" + i,
          name: this.playerNames[i] || "玩家" + (i + 1),
          color: PLAYER_COLORS[i],
          isLocal: this.layout !== "online" || i === 0,
          playerIndex: i,
          x: pose.x,
          y: pose.y,
          angle: pose.angle,
          mass: 24,
        })
      );
    }
    for (let i = 0; i < this.botCount; i++) {
      const pose = this.spawnPose(0.6);
      this.snakes.push(
        new Snake({
          id: "b" + i,
          name: BOT_NAMES[i % BOT_NAMES.length],
          color: PALETTE[i % PALETTE.length],
          isBot: true,
          x: pose.x,
          y: pose.y,
          angle: pose.angle,
          mass: 20 + Math.random() * 30,
        })
      );
    }

    const target = this.foodTarget();
    for (let i = 0; i < target; i++) this.spawnFood();

    this.camera.x = this.snakes[0].x;
    this.camera.y = this.snakes[0].y;
    this.countdown = 2.4;
    this.running = true;
    this.startLoop();
    this.emitState();
  };

  FanwenArena.prototype.foodTarget = function () {
    return Math.round((this.radius * this.radius) / 11000);
  };

  FanwenArena.prototype.expectedChar = function (snake) {
    if (!this.chars.length) return null;
    return this.chars[snake.seqIndex % this.chars.length];
  };

  FanwenArena.prototype.spawnFood = function (at, char) {
    const spot = at || this.randomSpot(60);
    const ch =
      char ||
      (this.chars.length
        ? this.chars[Math.floor(Math.random() * this.chars.length)]
        : "字");
    this.food.push({ x: spot.x, y: spot.y, char: ch, r: 7 });
  };

  FanwenArena.prototype.ensureExpectedFood = function () {
    const self = this;
    this.snakes.forEach(function (snake) {
      if (snake.dead || snake.isBot) return;
      const want = self.expectedChar(snake);
      if (!want) return;
      let count = 0;
      for (let i = 0; i < self.food.length; i++) {
        if (self.food[i].char === want) count++;
        if (count >= 3) return;
      }
      for (let i = count; i < 3; i++) {
        const a = Math.random() * Math.PI * 2;
        const d = 220 + Math.random() * 420;
        let x = snake.x + Math.cos(a) * d;
        let y = snake.y + Math.sin(a) * d;
        if (Math.sqrt(x * x + y * y) > self.radius - 70) {
          const spot = self.randomSpot(90);
          x = spot.x;
          y = spot.y;
        }
        self.spawnFood({ x: x, y: y }, want);
      }
    });
  };

  FanwenArena.prototype.startLoop = function () {
    if (this._raf) return;
    this._last = performance.now();
    this._raf = requestAnimationFrame(this._loop);
  };

  FanwenArena.prototype.stopLoop = function () {
    if (this._raf) {
      cancelAnimationFrame(this._raf);
      this._raf = null;
    }
  };

  FanwenArena.prototype.stop = function () {
    this.running = false;
    this.stopLoop();
  };

  FanwenArena.prototype.togglePause = function () {
    if (this.layout === "online" || !this.running || this.ended) return;
    this.paused = !this.paused;
    this.emitState();
  };

  FanwenArena.prototype.loop = function (now) {
    this._raf = requestAnimationFrame(this._loop);
    const dt = Math.min(0.05, (now - this._last) / 1000);
    this._last = now;
    if (this.running && !this.paused && !this.ended && !this.remote) {
      if (this.countdown > 0) {
        this.countdown -= dt;
        this.startedAt = now;
        if (this.countdown <= 0) Audio.segment();
      } else {
        this.elapsed = now - this.startedAt;
        this.update(dt);
      }
      this.emitState();
      if (this.netSend) this.broadcast(now);
    }
    this.render();
  };

  FanwenArena.prototype.update = function (dt) {
    const self = this;

    this.snakes.forEach(function (snake) {
      if (snake.dead) return;
      if (snake.isBot) self.driveBot(snake, dt);

      if (snake.pointerAngle !== null && !snake.isBot) {
        const diff = angleDiff(snake.pointerAngle, snake.angle);
        const max = TURN_RATE * dt;
        snake.angle += Math.max(-max, Math.min(max, diff));
      } else if (snake.turn) {
        snake.angle += snake.turn * TURN_RATE * dt;
      }

      const canBoost = snake.boost && snake.mass > MIN_MASS + 4;
      const speed = canBoost ? BOOST_SPEED : BASE_SPEED;
      if (canBoost) {
        snake.mass -= 7 * dt;
        snake.boostDrop -= dt;
        if (snake.boostDrop <= 0) {
          snake.boostDrop = 0.16;
          const tail = snake.points[Math.min(snake.points.length - 1, 12)];
          if (tail) {
            self.spawnFood(
              { x: tail.x + (Math.random() - 0.5) * 8, y: tail.y + (Math.random() - 0.5) * 8 },
              snake.eatenChars.length
                ? snake.eatenChars[Math.floor(Math.random() * snake.eatenChars.length)]
                : undefined
            );
          }
        }
      }

      snake.x += Math.cos(snake.angle) * speed * dt;
      snake.y += Math.sin(snake.angle) * speed * dt;

      const head = snake.points[0];
      if (dist2(snake.x, snake.y, head.x, head.y) >= SPACING * SPACING) {
        snake.points.unshift({ x: snake.x, y: snake.y });
      } else {
        head.x = snake.x;
        head.y = snake.y;
      }
      const maxPoints = Math.max(12, Math.round(trailPixels(snake.mass) / SPACING));
      while (snake.points.length > maxPoints) snake.points.pop();
    });

    this.snakes.forEach(function (snake) {
      if (snake.dead) return;
      const hr = headRadius(snake.mass);
      if (Math.sqrt(snake.x * snake.x + snake.y * snake.y) > self.radius - hr) {
        self.killSnake(snake, null, "撞到結界");
        return;
      }
      for (let i = 0; i < self.snakes.length; i++) {
        const other = self.snakes[i];
        if (other === snake || other.dead) continue;
        const or = headRadius(other.mass) * 0.82;
        const limit = (hr + or) * (hr + or);
        for (let p = 4; p < other.points.length; p += 2) {
          if (dist2(snake.x, snake.y, other.points[p].x, other.points[p].y) < limit) {
            self.killSnake(snake, other, "撞到" + other.name);
            return;
          }
        }
      }
    });

    this.snakes.forEach(function (snake) {
      if (snake.dead) return;
      const hr = headRadius(snake.mass) + 9;
      const limit = hr * hr;
      for (let i = self.food.length - 1; i >= 0; i--) {
        const pellet = self.food[i];
        if (dist2(snake.x, snake.y, pellet.x, pellet.y) > limit) continue;
        self.food.splice(i, 1);
        const want = self.expectedChar(snake);
        if (want && pellet.char === want) {
          snake.seqIndex += 1;
          snake.correct += 1;
          snake.combo += 1;
          snake.bestCombo = Math.max(snake.bestCombo, snake.combo);
          snake.mass += CORRECT_VALUE;
          snake.score += 25 + Math.min(50, (snake.combo - 1) * 5);
          snake.eatenChars.push(pellet.char);
          if (snake.eatenChars.length > 40) snake.eatenChars.shift();
          if (snake.isLocal && !snake.isBot) Audio.correct(Math.floor(snake.combo / 3));
        } else {
          snake.mass += FOOD_VALUE;
          snake.score += 2;
          if (snake.combo > 0) snake.mistakes += 1;
          snake.combo = 0;
          if (snake.isLocal && !snake.isBot) Audio.eat();
        }
      }
    });

    this.ensureExpectedFood();
    const target = this.foodTarget();
    let guard = 0;
    while (this.food.length < target && guard++ < 6) this.spawnFood();

    const alivePlayers = this.snakes.filter(function (s) {
      return !s.isBot && !s.dead;
    });
    if (this.layout === "solo") {
      if (!alivePlayers.length) this.finish();
    } else if (alivePlayers.length <= 1) {
      this.finish();
    }

    if (this.layout === "solo") {
      const me = this.snakes[0];
      const focus = me && !me.dead ? me : null;
      if (focus) {
        this.camera.x += (focus.x - this.camera.x) * Math.min(1, dt * 6);
        this.camera.y += (focus.y - this.camera.y) * Math.min(1, dt * 6);
      }
    }

    if (this.botCount) {
      const deadBots = this.snakes.filter(function (s) {
        return s.isBot && s.dead;
      });
      deadBots.forEach(function (bot) {
        bot.respawnIn = (bot.respawnIn || 3) - dt;
        if (bot.respawnIn <= 0) self.respawnBot(bot);
      });
    }
  };

  FanwenArena.prototype.respawnBot = function (bot) {
    const pose = this.spawnPose(0.6);
    bot.dead = false;
    bot.respawnIn = null;
    bot.x = pose.x;
    bot.y = pose.y;
    bot.angle = pose.angle;
    bot.mass = 20 + Math.random() * 20;
    bot.points = [];
    for (let i = 0; i < 24; i++) {
      bot.points.push({
        x: bot.x - Math.cos(bot.angle) * i * SPACING,
        y: bot.y - Math.sin(bot.angle) * i * SPACING,
      });
    }
  };

  FanwenArena.prototype.driveBot = function (bot, dt) {
    const self = this;
    const hr = headRadius(bot.mass);
    let danger = 0;
    const probe = 74 + bot.mass * 0.3;

    for (let i = 0; i < this.snakes.length; i++) {
      const other = this.snakes[i];
      if (other === bot || other.dead) continue;
      for (let p = 4; p < other.points.length; p += 4) {
        const pt = other.points[p];
        if (dist2(bot.x, bot.y, pt.x, pt.y) > probe * probe) continue;
        const away = Math.atan2(bot.y - pt.y, bot.x - pt.x);
        danger += angleDiff(away, bot.angle) > 0 ? 1 : -1;
      }
    }

    const distCentre = Math.sqrt(bot.x * bot.x + bot.y * bot.y);
    if (distCentre > this.radius - probe - hr) {
      const inward = Math.atan2(-bot.y, -bot.x);
      danger += angleDiff(inward, bot.angle) > 0 ? 3 : -3;
    }

    if (danger !== 0) {
      bot.turn = danger > 0 ? 1 : -1;
      bot.pointerAngle = null;
      bot.boost = false;
      return;
    }

    let best = null;
    let bestD = Infinity;
    const want = this.expectedChar(bot);
    for (let i = 0; i < this.food.length; i++) {
      const pellet = this.food[i];
      let d = dist2(bot.x, bot.y, pellet.x, pellet.y);
      if (want && pellet.char === want) d *= 0.35;
      if (d < bestD) {
        bestD = d;
        best = pellet;
      }
    }
    if (best) {
      bot.pointerAngle = Math.atan2(best.y - bot.y, best.x - bot.x);
      bot.turn = 0;
      bot.boost = bot.mass > 60 && Math.random() < 0.01;
    } else {
      bot.pointerAngle = null;
      bot.turn = Math.random() < 0.02 ? (Math.random() < 0.5 ? -1 : 1) : bot.turn;
      bot.boost = false;
    }
    void dt;
    void self;
  };

  FanwenArena.prototype.killSnake = function (snake, killer, reason) {
    if (snake.dead) return;
    snake.dead = true;
    snake.deathReason = reason;
    if (killer) {
      killer.kills += 1;
      killer.score += 150;
    }
    const self = this;
    for (let i = 0; i < snake.points.length; i += 3) {
      const pt = snake.points[i];
      const ch = snake.eatenChars.length
        ? snake.eatenChars[Math.floor(Math.random() * snake.eatenChars.length)]
        : undefined;
      self.spawnFood(
        { x: pt.x + (Math.random() - 0.5) * 10, y: pt.y + (Math.random() - 0.5) * 10 },
        ch
      );
    }
    if (!snake.isBot) Audio.kill();
    else if (killer && killer.isLocal) Audio.kill();
  };

  FanwenArena.prototype.leaderboard = function () {
    return this.snakes
      .slice()
      .sort(function (a, b) {
        return b.score - a.score;
      })
      .slice(0, 5)
      .map(function (s) {
        return {
          name: s.name,
          score: s.score,
          dead: s.dead,
          isLocal: s.isLocal && !s.isBot,
          color: s.color.light,
        };
      });
  };

  FanwenArena.prototype.finish = function () {
    if (this.ended) return;
    this.ended = true;
    this.running = false;
    const players = this.snakes.filter(function (s) {
      return !s.isBot;
    });
    const me = players[0];
    const seconds = Math.round(this.elapsed / 1000);

    if (this.layout === "solo") {
      const attempts = me.correct + me.mistakes;
      const accuracy = attempts ? me.correct / attempts : 0;
      const record = global.FanwenStore.submitScore("arena", this.work ? this.work.id : "-", me.score);
      Audio.lose();
      this.emitState();
      this.onEnd({
        mode: "arena",
        modeName: "群蛇亂鬥",
        won: false,
        reason: me.deathReason || "被淘汰",
        score: me.score,
        correct: me.correct,
        mistakes: me.mistakes,
        accuracy: accuracy,
        bestCombo: me.bestCombo,
        kills: me.kills,
        seconds: seconds,
        length: Math.round(me.mass),
        best: record.best,
        isRecord: record.record,
        grade: me.kills >= 3 ? "甲上" : me.correct >= 12 ? "甲" : me.correct >= 6 ? "乙" : "丙",
        workLabel: this.work ? Data.workLabel(this.work) : "",
      });
      return;
    }

    const alive = players.filter(function (p) {
      return !p.dead;
    });
    const winner = alive.length === 1 ? alive[0] : players[0].score >= players[1].score ? players[0] : players[1];
    Audio.win();
    this.emitState();
    this.onEnd({
      mode: this.layout === "online" ? "online" : "duel",
      modeName: this.layout === "online" ? "連線對戰" : "同機雙人",
      won: true,
      versus: true,
      winnerName: winner.name,
      players: players.map(function (p) {
        return {
          name: p.name,
          score: p.score,
          correct: p.correct,
          kills: p.kills,
          length: Math.round(p.mass),
          dead: p.dead,
          color: p.color.light,
        };
      }),
      seconds: seconds,
      workLabel: this.work ? Data.workLabel(this.work) : "",
    });
  };

  FanwenArena.prototype.emitState = function () {
    const me = this.snakes.find(function (s) {
      return !s.isBot;
    });
    const state = {
      running: this.running,
      paused: this.paused,
      ended: this.ended,
      leaderboard: this.leaderboard(),
      seconds: Math.round(this.elapsed / 1000),
    };
    if (me) {
      state.score = me.score;
      state.correct = me.correct;
      state.mistakes = me.mistakes;
      state.combo = me.combo;
      state.kills = me.kills;
      state.length = Math.round(me.mass);
      state.nextChar = this.expectedChar(me) || "—";
      state.charTotal = this.chars.length;
      state.charIndex = me.seqIndex;
      state.best = global.FanwenStore.getBest("arena", this.work ? this.work.id : "-");
    }
    if (this.layout !== "solo") {
      state.players = this.snakes
        .filter(function (s) {
          return !s.isBot;
        })
        .map(function (p) {
          return { name: p.name, score: p.score, dead: p.dead, color: p.color.light };
        });
    }
    this.onState(state);
  };

  /* ------------------------------------------------------------------ 連線 */

  FanwenArena.prototype.broadcast = function (now) {
    if (this._nextSend && now < this._nextSend) return;
    this._nextSend = now + 55;
    const snakes = this.snakes.map(function (s) {
      const pts = [];
      for (let i = 0; i < s.points.length; i += 3) {
        pts.push(Math.round(s.points[i].x), Math.round(s.points[i].y));
      }
      return {
        i: s.id,
        n: s.name,
        c: s.color.body,
        l: s.color.light,
        x: Math.round(s.x),
        y: Math.round(s.y),
        a: Math.round(s.angle * 100) / 100,
        m: Math.round(s.mass),
        d: s.dead ? 1 : 0,
        s: s.score,
        kl: s.kills,
        cb: s.combo,
        p: pts,
        b: s.isBot ? 1 : 0,
      };
    });
    const food = [];
    this.food.forEach(function (f) {
      food.push(Math.round(f.x), Math.round(f.y), f.char);
    });
    const guest = this.snakes.filter(function (s) {
      return !s.isBot;
    })[1];
    this.netSend({
      t: "state",
      r: this.radius,
      k: snakes,
      f: food,
      n: guest ? this.expectedChar(guest) : null,
      e: this.ended ? 1 : 0,
    });
  };

  /** 客機：直接採用主機送來的畫面狀態。 */
  FanwenArena.prototype.applyRemote = function (msg) {
    const self = this;
    this.remote = msg;
    this.radius = msg.r || this.radius;
    this.running = true;
    this.startLoop();
    const mine = (msg.k || []).find(function (s) {
      return s.i === self.remoteId;
    });
    if (!mine) return;
    this.camera.x += (mine.x - this.camera.x) * 0.35;
    this.camera.y += (mine.y - this.camera.y) * 0.35;
    this.onState({
      running: true,
      remote: true,
      score: mine.s,
      length: mine.m,
      kills: mine.kl || 0,
      combo: mine.cb || 0,
      nextChar: this.remoteNext || "—",
      players: (msg.k || [])
        .filter(function (s) {
          return !s.b;
        })
        .map(function (s) {
          return { name: s.n, score: s.s, dead: !!s.d, color: s.l };
        }),
      leaderboard: (msg.k || [])
        .slice()
        .sort(function (a, b) {
          return b.s - a.s;
        })
        .slice(0, 5)
        .map(function (s) {
          return {
            name: s.n,
            score: s.s,
            dead: !!s.d,
            isLocal: s.i === self.remoteId,
            color: s.l,
          };
        }),
    });
  };

  /* ------------------------------------------------------------------ 畫面 */

  FanwenArena.prototype.render = function () {
    const fit = D.fit(this.canvas);
    const ctx = fit.ctx;
    ctx.clearRect(0, 0, fit.w, fit.h);

    const bg = ctx.createLinearGradient(0, 0, 0, fit.h);
    bg.addColorStop(0, "#171210");
    bg.addColorStop(1, "#0e0b0a");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, fit.w, fit.h);

    const zoom =
      this.layout === "solo"
        ? Math.max(fit.w, fit.h) / 1150
        : Math.min(fit.w, fit.h) / (this.radius * 2 + 90);
    this.camera.zoom = zoom;
    const camX = this.layout === "solo" ? this.camera.x : 0;
    const camY = this.layout === "solo" ? this.camera.y : 0;

    ctx.save();
    ctx.translate(fit.w / 2, fit.h / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-camX, -camY);

    const R = this.radius;

    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = "#0b0908";
    ctx.fillRect(-R, -R, R * 2, R * 2);
    ctx.strokeStyle = "rgba(214, 178, 110, 0.06)";
    ctx.lineWidth = 1 / zoom;
    const gridStep = 110;
    for (let g = -R; g <= R; g += gridStep) {
      ctx.beginPath();
      ctx.moveTo(g, -R);
      ctx.lineTo(g, R);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-R, g);
      ctx.lineTo(R, g);
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = "rgba(214, 178, 110, 0.75)";
    ctx.lineWidth = 5 / zoom;
    ctx.shadowColor = "rgba(232, 184, 74, 0.6)";
    ctx.shadowBlur = 22;
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      D.cloud(ctx, Math.cos(a) * (R + 34), Math.sin(a) * (R + 34), 34, "#d6b26e", 0.28);
    }

    const snakes = this.remote ? this.remote.k : this.snakes;
    const foods = this.remote ? this.remote.f : this.food;
    const localSnake = this.remote
      ? null
      : this.snakes.find(function (s) {
          return s.isLocal && !s.isBot;
        });
    const want = localSnake ? this.expectedChar(localSnake) : this.remoteNext;

    const view = {
      x0: camX - fit.w / 2 / zoom - 40,
      x1: camX + fit.w / 2 / zoom + 40,
      y0: camY - fit.h / 2 / zoom - 40,
      y1: camY + fit.h / 2 / zoom + 40,
    };

    const now = performance.now();
    const pulse = 0.5 + 0.5 * Math.sin(now / 200);

    if (this.remote) {
      for (let i = 0; i < foods.length; i += 3) {
        this.drawPellet(ctx, foods[i], foods[i + 1], foods[i + 2], foods[i + 2] === want, pulse, view, zoom);
      }
    } else {
      for (let i = 0; i < foods.length; i++) {
        const f = foods[i];
        this.drawPellet(ctx, f.x, f.y, f.char, f.char === want, pulse, view, zoom);
      }
    }

    if (this.remote) {
      snakes.forEach(
        function (s) {
          if (s.d) return;
          const pts = [];
          for (let i = 0; i < s.p.length; i += 2) pts.push({ x: s.p[i], y: s.p[i + 1] });
          this.drawSnakeBody(ctx, pts, s.m, { body: s.c, light: s.l }, false, zoom);
          this.drawSnakeHead(ctx, s.x, s.y, s.a, s.m, { body: s.c, light: s.l }, s.n, zoom);
        }.bind(this)
      );
    } else {
      this.snakes.forEach(
        function (s) {
          if (s.dead) return;
          this.drawSnakeBody(ctx, s.points, s.mass, s.color, s.isLocal && !s.isBot, zoom);
          this.drawSnakeHead(ctx, s.x, s.y, s.angle, s.mass, s.color, s.name, zoom);
        }.bind(this)
      );
    }

    ctx.restore();

    this.drawMinimap(ctx, fit, snakes);
    this.drawLeaderboard(ctx, fit);

    if (this.paused || this.countdown > 0 || (!this.running && !this.ended)) {
      const waiting = this.isGuest && !this.remote;
      const counting = this.countdown > 0;
      ctx.fillStyle = "rgba(10, 8, 7, 0.66)";
      ctx.fillRect(0, 0, fit.w, fit.h);
      D.glowText(
        ctx,
        counting
          ? this.countdown > 1.6
            ? "三"
            : this.countdown > 0.8
            ? "二"
            : "一"
          : this.paused
          ? "暫　停"
          : waiting
          ? "等待主機"
          : "按「開始」入局",
        fit.w / 2,
        fit.h / 2 - fit.h * 0.02,
        "700 " + Math.round(Math.min(fit.w * 0.075, 42)) + "px " + D.SERIF,
        "#f0d68a",
        "rgba(232, 184, 74, 0.8)",
        18
      );
      D.glowText(
        ctx,
        this.paused
          ? "按 P 繼續"
          : this.layout === "local2"
          ? "朱蛇 ← →　青蛇 A D"
          : "指向前進　按住加速",

        fit.w / 2,
        fit.h / 2 + fit.h * 0.06,
        "500 " + Math.round(Math.min(fit.w * 0.032, 16)) + "px " + D.SANS,
        "rgba(240, 232, 214, 0.75)",
        "transparent",
        0
      );
    }
  };

  FanwenArena.prototype.drawPellet = function (ctx, x, y, char, isWant, pulse, view, zoom) {
    if (x < view.x0 || x > view.x1 || y < view.y0 || y > view.y1) return;
    const r = isWant ? 11 : 8;
    if (isWant) {
      ctx.save();
      ctx.shadowColor = "rgba(232, 184, 74, 0.95)";
      ctx.shadowBlur = 16 + pulse * 14;
      ctx.fillStyle = "#e8b84a";
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = "#2b1d05";
    } else {
      ctx.fillStyle = "rgba(47, 111, 94, 0.92)";
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(214, 178, 110, 0.4)";
      ctx.lineWidth = 1 / zoom;
      ctx.stroke();
      ctx.fillStyle = "#f1e6cf";
    }
    ctx.font = "700 " + r * 1.5 + "px " + D.SERIF;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(char, x, y + r * 0.06);
  };

  FanwenArena.prototype.drawSnakeBody = function (ctx, points, mass, color, showChars, zoom) {
    if (points.length < 2) return;
    const width = headRadius(mass) * 1.7;
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = color.body;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.stroke();
    ctx.strokeStyle = color.light;
    ctx.lineWidth = width * 0.42;
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.stroke();
    ctx.restore();
    void showChars;
    void zoom;
  };

  FanwenArena.prototype.drawSnakeHead = function (ctx, x, y, angle, mass, color, name, zoom) {
    const r = headRadius(mass);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.shadowColor = color.light;
    ctx.shadowBlur = 16;
    ctx.fillStyle = color.body;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(240, 214, 150, 0.85)";
    ctx.lineWidth = Math.max(1, r * 0.16);
    ctx.stroke();
    ctx.fillStyle = "#fff4d8";
    ctx.beginPath();
    ctx.arc(r * 0.42, -r * 0.42, r * 0.26, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(r * 0.42, r * 0.42, r * 0.26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1b1210";
    ctx.beginPath();
    ctx.arc(r * 0.56, -r * 0.42, r * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(r * 0.56, r * 0.42, r * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.font = "600 " + Math.max(11, 13 / zoom) + "px " + D.SANS;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillStyle = "rgba(246, 239, 221, 0.85)";
    ctx.fillText(name, x, y - r * 1.9);
    ctx.restore();
  };

  FanwenArena.prototype.drawMinimap = function (ctx, fit, snakes) {
    const size = Math.min(120, fit.w * 0.26);
    const cx = fit.w - size / 2 - 14;
    const cy = fit.h - size / 2 - 14;
    const r = size / 2;
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = "rgba(12, 10, 9, 0.72)";
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(214, 178, 110, 0.55)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    const scale = r / this.radius;
    const self = this;
    (snakes || []).forEach(function (s) {
      const dead = self.remote ? s.d : s.dead;
      if (dead) return;
      const sx = cx + (self.remote ? s.x : s.x) * scale;
      const sy = cy + (self.remote ? s.y : s.y) * scale;
      const isMe = self.remote ? s.i === self.remoteId : s.isLocal && !s.isBot;
      ctx.fillStyle = isMe ? "#f0d68a" : self.remote ? s.l : s.color.light;
      ctx.beginPath();
      ctx.arc(sx, sy, isMe ? 3.6 : 2.2, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  };

  FanwenArena.prototype.drawLeaderboard = function (ctx, fit) {
    const rows = this.remote
      ? (this.remote.k || [])
          .slice()
          .sort(function (a, b) {
            return b.s - a.s;
          })
          .slice(0, 5)
          .map(
            function (s) {
              return {
                name: s.n,
                score: s.s,
                isLocal: s.i === this.remoteId,
                color: s.l,
                dead: !!s.d,
              };
            }.bind(this)
          )
      : this.leaderboard();
    if (!rows.length) return;
    const pad = 12;
    const w = Math.min(150, fit.w * 0.36);
    const lh = 18;
    const h = pad * 1.6 + rows.length * lh;
    const x = fit.w - w - 14;
    const y = 14;
    ctx.save();
    ctx.fillStyle = "rgba(12, 10, 9, 0.7)";
    D.roundRect(ctx, x, y, w, h, 10);
    ctx.fill();
    ctx.strokeStyle = "rgba(214, 178, 110, 0.4)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.font = "600 11px " + D.SANS;
    ctx.fillStyle = "rgba(214, 178, 110, 0.9)";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("擂　台　榜", x + 10, y + 13);
    rows.forEach(function (row, i) {
      const ry = y + 26 + i * lh + lh / 2 - 4;
      ctx.fillStyle = row.isLocal ? "#f0d68a" : "rgba(246, 239, 221, 0.78)";
      ctx.font = (row.isLocal ? "700 " : "500 ") + "11px " + D.SANS;
      ctx.textAlign = "left";
      const label = i + 1 + ". " + row.name + (row.dead ? "（歿）" : "");
      ctx.fillText(label.length > 11 ? label.slice(0, 11) : label, x + 10, ry);
      ctx.textAlign = "right";
      ctx.fillText(String(row.score), x + w - 10, ry);
    });
    ctx.restore();
  };

  /* ------------------------------------------------------------------ 輸入 */

  FanwenArena.prototype.localSnakes = function () {
    return this.snakes.filter(function (s) {
      return !s.isBot;
    });
  };

  FanwenArena.prototype.handleKey = function (down, e) {
    const k = e.key;
    const players = this.localSnakes();
    const p1 = this.isGuest ? null : players[0];
    const p2 = this.layout === "local2" ? players[1] : null;
    let used = false;

    const setTurn = function (snake, value) {
      if (!snake) return;
      snake.pointerAngle = null;
      if (down) snake.turn = value;
      else if (snake.turn === value) snake.turn = 0;
    };

    if (this.isGuest) {
      if (k === "ArrowLeft" || k === "a" || k === "A") {
        this.netTurn = down ? -1 : this.netTurn === -1 ? 0 : this.netTurn;
        used = true;
      } else if (k === "ArrowRight" || k === "d" || k === "D") {
        this.netTurn = down ? 1 : this.netTurn === 1 ? 0 : this.netTurn;
        used = true;
      } else if (k === "ArrowUp" || k === "w" || k === "W" || k === " ") {
        this.netBoost = down;
        used = true;
      }
      if (used && this.netInput) this.netInput(this.netTurn || 0, !!this.netBoost);
    } else {
      if (k === "ArrowLeft") {
        setTurn(p1, -1);
        used = true;
      } else if (k === "ArrowRight") {
        setTurn(p1, 1);
        used = true;
      } else if (k === "ArrowUp" || k === " ") {
        if (p1) p1.boost = down;
        used = true;
      } else if (k === "a" || k === "A") {
        setTurn(p2 || p1, -1);
        used = true;
      } else if (k === "d" || k === "D") {
        setTurn(p2 || p1, 1);
        used = true;
      } else if (k === "w" || k === "W") {
        if (p2 || p1) (p2 || p1).boost = down;
        used = true;
      }
    }
    if (used) e.preventDefault();
  };

  FanwenArena.prototype.pointerAngleFrom = function (e) {
    const rect = this.canvas.getBoundingClientRect();
    const point = e.touches && e.touches[0] ? e.touches[0] : e;
    const px = point.clientX - rect.left - rect.width / 2;
    const py = point.clientY - rect.top - rect.height / 2;
    return Math.atan2(py, px);
  };

  FanwenArena.prototype.handlePointerMove = function (e) {
    if (this.layout === "local2") return;
    if (e.cancelable && e.type === "touchmove") e.preventDefault();
    const angle = this.pointerAngleFrom(e);
    if (this.isGuest) {
      this.netPointer = angle;
      if (this.netInput) this.netInput(this.netTurn || 0, !!this.netBoost, angle);
      return;
    }
    const me = this.localSnakes()[0];
    if (me && !me.dead) {
      me.pointerAngle = angle;
      me.turn = 0;
    }
  };

  FanwenArena.prototype.handlePointerDown = function (e) {
    this.handlePointerMove(e);
    this.setBoost(true);
  };

  FanwenArena.prototype.handlePointerUp = function () {
    this.setBoost(false);
  };

  /** 只切換加速，不改變方向（給觸控的「加速」按鈕用）。 */
  FanwenArena.prototype.setBoost = function (on) {
    if (this.isGuest) {
      this.netBoost = on;
      if (this.netInput) this.netInput(this.netTurn || 0, on, this.netPointer);
      return;
    }
    const me = this.localSnakes()[0];
    if (me) me.boost = on;
    if (on) Audio.boost();
  };

  /** 主機收到客機輸入。 */
  FanwenArena.prototype.applyGuestInput = function (turn, boost, pointer) {
    const guest = this.snakes.filter(function (s) {
      return !s.isBot;
    })[1];
    if (!guest || guest.dead) return;
    if (pointer !== undefined && pointer !== null) {
      guest.pointerAngle = pointer;
      guest.turn = 0;
    } else {
      guest.pointerAngle = null;
      guest.turn = turn;
    }
    guest.boost = !!boost;
  };

  global.FanwenArena = FanwenArena;
})(window);
