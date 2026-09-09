/**
 * 經典格子模式引擎：按範文順序吃字。
 * 三種規則：經典背默、限時挑戰（可穿牆）、零錯挑戰（吃錯即終止）。
 */
(function (global) {
  const D = global.FanwenDraw;
  const Data = global.FanwenData;
  const Audio = global.FanwenAudio;

  const GRID = 20;
  const SPEEDS = { slow: 200, mid: 140, fast: 95 };
  const DIRS = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };
  const OPPOSITE = { up: "down", down: "up", left: "right", right: "left" };
  const KEY_DIR = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
    w: "up",
    a: "left",
    s: "down",
    d: "right",
  };

  const MODES = {
    classic: { id: "classic", name: "經典背默", wrap: false, limit: 0, zero: false },
    timed: { id: "timed", name: "限時挑戰", wrap: true, limit: 90, zero: false },
    strict: { id: "strict", name: "零錯挑戰", wrap: false, limit: 0, zero: true },
  };

  function key(p) {
    return p.x + "," + p.y;
  }

  function FanwenClassic(opts) {
    this.canvas = opts.canvas;
    this.onState = opts.onState || function () {};
    this.onEnd = opts.onEnd || function () {};
    this.mode = MODES.classic;
    this.speedKey = "mid";
    this.work = null;
    this.running = false;
    this.paused = false;
    this.ended = false;
    this.flashUntil = 0;
    this.foods = [];
    this.snake = [];
    this.prevSnake = [];
    this.segChars = [];
    this._raf = null;
    this._acc = 0;
    this._last = 0;
    this._onKey = this.handleKey.bind(this);
    this._onTouchStart = this.handleTouchStart.bind(this);
    this._onTouchEnd = this.handleTouchEnd.bind(this);
    this._loop = this.loop.bind(this);
    this.reset();
  }

  FanwenClassic.prototype.attachInput = function () {
    if (this._attached) return;
    this._attached = true;
    document.addEventListener("keydown", this._onKey);
    this.canvas.addEventListener("touchstart", this._onTouchStart, { passive: false });
    this.canvas.addEventListener("touchend", this._onTouchEnd, { passive: false });
  };

  FanwenClassic.prototype.detachInput = function () {
    if (!this._attached) return;
    this._attached = false;
    document.removeEventListener("keydown", this._onKey);
    this.canvas.removeEventListener("touchstart", this._onTouchStart);
    this.canvas.removeEventListener("touchend", this._onTouchEnd);
  };

  FanwenClassic.prototype.setMode = function (id) {
    if (MODES[id]) this.mode = MODES[id];
  };

  FanwenClassic.prototype.setSpeed = function (id) {
    if (SPEEDS[id]) this.speedKey = id;
  };

  FanwenClassic.prototype.stepMs = function () {
    return SPEEDS[this.speedKey];
  };

  FanwenClassic.prototype.load = function (work) {
    this.work = work;
    this.reset();
  };

  FanwenClassic.prototype.reset = function () {
    this.stopLoop();
    this.running = false;
    this.paused = false;
    this.ended = false;
    this.score = 0;
    this.correct = 0;
    this.mistakes = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.segIndex = 0;
    this.eatenInSeg = 0;
    this.segChars = [];
    this.foods = [];
    this.dir = "right";
    this.pendingDir = "right";
    this.startedAt = 0;
    this.elapsed = 0;
    const mid = Math.floor(GRID / 2);
    this.snake = [
      { x: mid, y: mid },
      { x: mid - 1, y: mid },
      { x: mid - 2, y: mid },
    ];
    this.prevSnake = this.snake.map(function (p) {
      return { x: p.x, y: p.y };
    });
    this.grow = 0;
    this.emitState();
    this.startLoop();
  };

  FanwenClassic.prototype.start = function () {
    if (!this.work) return;
    this.reset();
    this.spawnSegment();
    this.running = true;
    this.paused = false;
    this.startedAt = performance.now();
    this._acc = 0;
    this.emitState();
  };

  FanwenClassic.prototype.togglePause = function () {
    if (!this.running || this.ended) return;
    this.paused = !this.paused;
    this.emitState();
  };

  FanwenClassic.prototype.stop = function () {
    this.running = false;
    this.stopLoop();
  };

  FanwenClassic.prototype.startLoop = function () {
    if (this._raf) return;
    this._last = performance.now();
    this._raf = requestAnimationFrame(this._loop);
  };

  FanwenClassic.prototype.stopLoop = function () {
    if (this._raf) {
      cancelAnimationFrame(this._raf);
      this._raf = null;
    }
  };

  FanwenClassic.prototype.loop = function (now) {
    this._raf = requestAnimationFrame(this._loop);
    const dt = Math.min(100, now - this._last);
    this._last = now;
    if (this.running && !this.paused && !this.ended) {
      this.elapsed = now - this.startedAt;
      if (this.mode.limit && this.elapsed >= this.mode.limit * 1000) {
        this.finish(false, "時間到");
      } else {
        this._acc += dt;
        const step = this.stepMs();
        while (this._acc >= step) {
          this._acc -= step;
          this.tick();
          if (this.ended) break;
        }
      }
      this.emitState();
    }
    this.render(this.running && !this.paused ? this._acc / this.stepMs() : 1);
  };

  FanwenClassic.prototype.currentSegment = function () {
    if (!this.work) return null;
    return this.work.segments[this.segIndex] || null;
  };

  FanwenClassic.prototype.segmentSeq = function () {
    const segment = this.currentSegment();
    return segment ? Data.segmentChars(segment) : [];
  };

  FanwenClassic.prototype.expectedChar = function () {
    return this.segmentSeq()[this.eatenInSeg];
  };

  FanwenClassic.prototype.emptyCells = function () {
    const taken = {};
    this.snake.forEach(function (p) {
      taken[key(p)] = true;
    });
    this.foods.forEach(function (f) {
      taken[key(f)] = true;
    });
    const cells = [];
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        if (!taken[x + "," + y]) cells.push({ x: x, y: y });
      }
    }
    return cells;
  };

  FanwenClassic.prototype.spawnSegment = function () {
    this.foods = [];
    const chars = this.segmentSeq();
    const spots = this.emptyCells();
    for (let i = spots.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = spots[i];
      spots[i] = spots[j];
      spots[j] = tmp;
    }
    const self = this;
    chars.forEach(function (ch, i) {
      const spot = spots[i];
      if (spot) self.foods.push({ x: spot.x, y: spot.y, char: ch, order: i });
    });
  };

  FanwenClassic.prototype.respawnFood = function (char) {
    const spots = this.emptyCells();
    if (!spots.length) return;
    const spot = spots[Math.floor(Math.random() * spots.length)];
    this.foods.push({ x: spot.x, y: spot.y, char: char, order: -1 });
  };

  FanwenClassic.prototype.tick = function () {
    if (this.pendingDir && this.pendingDir !== OPPOSITE[this.dir]) {
      this.dir = this.pendingDir;
    }
    const step = DIRS[this.dir];
    const head = this.snake[0];
    let next = { x: head.x + step.x, y: head.y + step.y };

    if (next.x < 0 || next.y < 0 || next.x >= GRID || next.y >= GRID) {
      if (!this.mode.wrap) {
        this.finish(false, "撞到牆壁");
        return;
      }
      next = { x: (next.x + GRID) % GRID, y: (next.y + GRID) % GRID };
    }

    const foodIndex = this.foods.findIndex(function (f) {
      return f.x === next.x && f.y === next.y;
    });
    const expected = this.expectedChar();
    const isCorrect = foodIndex >= 0 && this.foods[foodIndex].char === expected;
    const isWrong = foodIndex >= 0 && !isCorrect;

    const willGrow = isCorrect;
    const ignoreTail = !willGrow;
    for (let i = 0; i < this.snake.length; i++) {
      if (ignoreTail && i === this.snake.length - 1) continue;
      if (this.snake[i].x === next.x && this.snake[i].y === next.y) {
        this.finish(false, "咬到自己");
        return;
      }
    }

    this.prevSnake = this.snake.map(function (p) {
      return { x: p.x, y: p.y };
    });
    this.snake.unshift(next);
    if (willGrow) {
      /* 吃對才變長 */
    } else {
      this.snake.pop();
    }

    if (isCorrect) {
      const eaten = this.foods.splice(foodIndex, 1)[0];
      this.eatenInSeg += 1;
      this.correct += 1;
      this.combo += 1;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      this.segChars.push(eaten.char);
      this.score += 10 + Math.min(20, (this.combo - 1) * 2);
      Audio.correct(Math.floor(this.combo / 3));
      this.afterCorrect();
    } else if (isWrong) {
      const food = this.foods.splice(foodIndex, 1)[0];
      this.mistakes += 1;
      this.combo = 0;
      this.score = Math.max(0, this.score - 20);
      this.flashUntil = performance.now() + 220;
      Audio.wrong();
      if (this.mode.zero) {
        this.finish(false, "吃錯字");
        return;
      }
      this.respawnFood(food.char);
    }
  };

  FanwenClassic.prototype.afterCorrect = function () {
    const seq = this.segmentSeq();
    if (this.eatenInSeg < seq.length) return;
    this.score += 100;
    if (this.segIndex >= this.work.segments.length - 1) {
      this.finish(true, "全篇完成");
      return;
    }
    this.segIndex += 1;
    this.eatenInSeg = 0;
    this.segChars = [];
    Audio.segment();
    const mid = Math.floor(GRID / 2);
    this.snake = [
      { x: mid, y: mid },
      { x: mid - 1, y: mid },
      { x: mid - 2, y: mid },
    ];
    this.prevSnake = this.snake.map(function (p) {
      return { x: p.x, y: p.y };
    });
    this.dir = "right";
    this.pendingDir = "right";
    this.spawnSegment();
  };

  FanwenClassic.prototype.grade = function (won, accuracy) {
    if (won && this.mistakes === 0) return "甲上";
    if (won && accuracy >= 0.9) return "甲";
    if (won || accuracy >= 0.75) return "乙";
    return "丙";
  };

  FanwenClassic.prototype.finish = function (won, reason) {
    if (this.ended) return;
    this.ended = true;
    this.running = false;
    const elapsedSec = Math.round(this.elapsed / 1000);
    if (won) {
      this.score += 250;
      if (this.mode.limit) {
        this.score += Math.max(0, this.mode.limit - elapsedSec) * 5;
      } else {
        this.score += Math.max(0, 300 - elapsedSec * 2);
      }
    }
    const attempts = this.correct + this.mistakes;
    const accuracy = attempts ? this.correct / attempts : 0;
    const record = global.FanwenStore.submitScore(this.mode.id, this.work.id, this.score);
    if (won) Audio.win();
    else Audio.lose();
    this.emitState();
    this.onEnd({
      mode: this.mode.id,
      modeName: this.mode.name,
      won: won,
      reason: reason,
      score: this.score,
      correct: this.correct,
      mistakes: this.mistakes,
      accuracy: accuracy,
      bestCombo: this.bestCombo,
      seconds: elapsedSec,
      segments: won ? this.work.segments.length : this.segIndex,
      segmentTotal: this.work.segments.length,
      grade: this.grade(won, accuracy),
      best: record.best,
      isRecord: record.record,
      workLabel: Data.workLabel(this.work),
    });
  };

  FanwenClassic.prototype.progressText = function () {
    if (!this.work) return "";
    let out = "";
    const self = this;
    this.work.segments.forEach(function (segment, i) {
      if (i < self.segIndex) {
        out += Data.segmentText(segment);
        return;
      }
      if (i !== self.segIndex) return;
      const seq = Data.segmentChars(segment);
      const eaten = seq.slice(0, self.eatenInSeg);
      let used = 0;
      segment.lines.forEach(function (line, li) {
        const take = Math.max(0, Math.min(line.length, eaten.length - used));
        out += eaten.slice(used, used + take).join("");
        if (take === line.length) out += segment.puncts[li] || "";
        used += line.length;
      });
    });
    return out;
  };

  FanwenClassic.prototype.emitState = function () {
    const seq = this.segmentSeq();
    this.onState({
      score: this.score,
      correct: this.correct,
      mistakes: this.mistakes,
      combo: this.combo,
      segIndex: Math.min(this.segIndex + 1, this.work ? this.work.segments.length : 0),
      segTotal: this.work ? this.work.segments.length : 0,
      charIndex: this.eatenInSeg,
      charTotal: seq.length,
      nextChar: this.expectedChar() || "—",
      progress: this.progressText(),
      running: this.running,
      paused: this.paused,
      ended: this.ended,
      timeLeft: this.mode.limit
        ? Math.max(0, Math.ceil(this.mode.limit - this.elapsed / 1000))
        : null,
      best: this.work ? global.FanwenStore.getBest(this.mode.id, this.work.id) : 0,
    });
  };

  FanwenClassic.prototype.render = function (t) {
    const fit = D.fit(this.canvas);
    const ctx = fit.ctx;
    const size = Math.min(fit.w, fit.h);
    const pad = Math.round(size * 0.035);
    const boardSize = size - pad * 2;
    const cell = boardSize / GRID;
    const now = performance.now();

    ctx.clearRect(0, 0, fit.w, fit.h);

    const bg = ctx.createLinearGradient(0, 0, 0, fit.h);
    bg.addColorStop(0, "#1a1310");
    bg.addColorStop(1, "#120e0d");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, fit.w, fit.h);

    ctx.save();
    ctx.translate((fit.w - size) / 2 + pad, (fit.h - size) / 2 + pad);

    ctx.fillStyle = "#0e0b0a";
    D.roundRect(ctx, 0, 0, boardSize, boardSize, cell * 0.5);
    ctx.fill();

    ctx.strokeStyle = "rgba(214, 178, 110, 0.1)";
    ctx.lineWidth = 1;
    for (let i = 1; i < GRID; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cell, 0);
      ctx.lineTo(i * cell, boardSize);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * cell);
      ctx.lineTo(boardSize, i * cell);
      ctx.stroke();
    }

    D.cornerClouds(ctx, boardSize, boardSize, cell * 1.5, "#d6b26e", 0.22);

    ctx.strokeStyle = "rgba(214, 178, 110, 0.55)";
    ctx.lineWidth = Math.max(1.5, cell * 0.1);
    D.roundRect(ctx, 0, 0, boardSize, boardSize, cell * 0.5);
    ctx.stroke();

    const expected = this.expectedChar();
    const fontSize = cell * 0.6;
    const self = this;

    this.foods.forEach(function (food) {
      const x = food.x * cell;
      const y = food.y * cell;
      const isNext = food.char === expected;
      const inset = cell * 0.1;
      if (isNext) {
        const pulse = 0.5 + 0.5 * Math.sin(now / 220);
        ctx.save();
        ctx.shadowColor = "rgba(232, 184, 74, 0.9)";
        ctx.shadowBlur = cell * (0.4 + pulse * 0.5);
        ctx.fillStyle = "#e8b84a";
        D.roundRect(ctx, x + inset, y + inset, cell - inset * 2, cell - inset * 2, cell * 0.22);
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = "#2b1d05";
      } else {
        const grad = ctx.createLinearGradient(x, y, x, y + cell);
        grad.addColorStop(0, "#2c5f52");
        grad.addColorStop(1, "#1b4238");
        ctx.fillStyle = grad;
        D.roundRect(ctx, x + inset, y + inset, cell - inset * 2, cell - inset * 2, cell * 0.22);
        ctx.fill();
        ctx.strokeStyle = "rgba(214, 178, 110, 0.35)";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = "#f1e6cf";
      }
      ctx.font = "700 " + fontSize + "px " + D.SERIF;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(food.char, x + cell / 2, y + cell / 2 + cell * 0.02);
    });

    const drawAt = function (i) {
      const cur = self.snake[i];
      const prev = self.prevSnake[i] || self.prevSnake[self.prevSnake.length - 1] || cur;
      let px = prev.x;
      let py = prev.y;
      if (Math.abs(cur.x - prev.x) > 1 || Math.abs(cur.y - prev.y) > 1) {
        px = cur.x;
        py = cur.y;
      }
      return {
        x: (px + (cur.x - px) * t) * cell,
        y: (py + (cur.y - py) * t) * cell,
      };
    };

    for (let i = this.snake.length - 1; i >= 1; i--) {
      const pos = drawAt(i);
      const inset = cell * 0.08;
      const grad = ctx.createLinearGradient(pos.x, pos.y, pos.x, pos.y + cell);
      grad.addColorStop(0, "#3f7f68");
      grad.addColorStop(1, "#255043");
      ctx.fillStyle = grad;
      D.roundRect(ctx, pos.x + inset, pos.y + inset, cell - inset * 2, cell - inset * 2, cell * 0.3);
      ctx.fill();
      ctx.strokeStyle = "rgba(214, 178, 110, 0.3)";
      ctx.lineWidth = 1;
      ctx.stroke();
      const ch = this.segChars[this.segChars.length - i];
      if (ch) {
        ctx.fillStyle = "#f6efdd";
        ctx.font = "700 " + fontSize * 0.92 + "px " + D.SERIF;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(ch, pos.x + cell / 2, pos.y + cell / 2 + cell * 0.02);
      }
    }

    const headPos = drawAt(0);
    ctx.save();
    ctx.shadowColor = "rgba(214, 74, 58, 0.85)";
    ctx.shadowBlur = cell * 0.6;
    const hg = ctx.createLinearGradient(headPos.x, headPos.y, headPos.x, headPos.y + cell);
    hg.addColorStop(0, "#e2604a");
    hg.addColorStop(1, "#b8342a");
    ctx.fillStyle = hg;
    D.roundRect(ctx, headPos.x + cell * 0.04, headPos.y + cell * 0.04, cell * 0.92, cell * 0.92, cell * 0.34);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = "rgba(240, 214, 150, 0.9)";
    ctx.lineWidth = Math.max(1, cell * 0.06);
    D.roundRect(ctx, headPos.x + cell * 0.04, headPos.y + cell * 0.04, cell * 0.92, cell * 0.92, cell * 0.34);
    ctx.stroke();

    const eye = cell * 0.12;
    const dirVec = DIRS[this.dir];
    ctx.fillStyle = "#fff4d8";
    const cx = headPos.x + cell / 2;
    const cy = headPos.y + cell / 2;
    const ox = dirVec.y !== 0 ? cell * 0.2 : 0;
    const oy = dirVec.x !== 0 ? cell * 0.2 : 0;
    const fx = dirVec.x * cell * 0.16;
    const fy = dirVec.y * cell * 0.16;
    ctx.beginPath();
    ctx.arc(cx + fx + ox, cy + fy + oy, eye, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + fx - ox, cy + fy - oy, eye, 0, Math.PI * 2);
    ctx.fill();

    D.seal(ctx, boardSize - cell * 2.1, boardSize - cell * 2.1, cell * 1.5, "範文");
    ctx.restore();

    if (now < this.flashUntil) {
      ctx.fillStyle = "rgba(200, 40, 40, " + (0.28 * (this.flashUntil - now)) / 220 + ")";
      ctx.fillRect(0, 0, fit.w, fit.h);
    }

    if (!this.running && !this.ended) {
      this.renderCurtain(ctx, fit, "按「開始」入局", "方向鍵／WASD　手機可滑動");
    } else if (this.paused) {
      this.renderCurtain(ctx, fit, "暫　停", "再按空白鍵繼續");
    }
  };

  FanwenClassic.prototype.renderCurtain = function (ctx, fit, title, sub) {
    ctx.fillStyle = "rgba(10, 8, 7, 0.62)";
    ctx.fillRect(0, 0, fit.w, fit.h);
    D.glowText(
      ctx,
      title,
      fit.w / 2,
      fit.h / 2 - fit.h * 0.02,
      "700 " + Math.round(fit.w * 0.085) + "px " + D.SERIF,
      "#f0d68a",
      "rgba(232, 184, 74, 0.8)",
      18
    );
    D.glowText(
      ctx,
      sub,
      fit.w / 2,
      fit.h / 2 + fit.h * 0.06,
      "500 " + Math.round(fit.w * 0.036) + "px " + D.SANS,
      "rgba(240, 232, 214, 0.75)",
      "transparent",
      0
    );
  };

  FanwenClassic.prototype.setDirection = function (dir) {
    if (!DIRS[dir] || !this.running || this.paused) return;
    if (dir === OPPOSITE[this.dir]) return;
    this.pendingDir = dir;
  };

  FanwenClassic.prototype.handleKey = function (e) {
    const dir = KEY_DIR[e.key] || KEY_DIR[String(e.key).toLowerCase()];
    if (!dir) return;
    e.preventDefault();
    this.setDirection(dir);
  };

  FanwenClassic.prototype.handleTouchStart = function (e) {
    if (e.touches.length !== 1) return;
    e.preventDefault();
    this._touch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  FanwenClassic.prototype.handleTouchEnd = function (e) {
    if (!this._touch) return;
    e.preventDefault();
    const t = e.changedTouches[0];
    const dx = t.clientX - this._touch.x;
    const dy = t.clientY - this._touch.y;
    this._touch = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
    if (Math.abs(dx) > Math.abs(dy)) this.setDirection(dx > 0 ? "right" : "left");
    else this.setDirection(dy > 0 ? "down" : "up");
  };

  FanwenClassic.MODES = MODES;
  global.FanwenClassic = FanwenClassic;
})(window);
