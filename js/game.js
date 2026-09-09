(function (global) {
  const GRID = 20;
  const SPEEDS = { slow: 220, mid: 140, fast: 90 };
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
    W: "up",
    A: "left",
    S: "down",
    D: "right",
  };

  function clampScore(mistakes) {
    return Math.max(0, Math.min(100, 100 - mistakes * 3));
  }

  function FanwenSnake(els) {
    this.els = els;
    this.cells = [];
    this.timer = null;
    this.speedKey = "mid";
    this.work = null;
    this._boundKey = this.onKey.bind(this);
    this._boundTouchStart = this.onTouchStart.bind(this);
    this._boundTouchEnd = this.onTouchEnd.bind(this);
    this.buildBoard();
    this.bind();
  }

  FanwenSnake.prototype.buildBoard = function () {
    const board = this.els.board;
    board.innerHTML = "";
    this.cells = [];
    for (let i = 0; i < GRID * GRID; i++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      board.appendChild(cell);
      this.cells.push(cell);
    }
  };

  FanwenSnake.prototype.bind = function () {
    document.addEventListener("keydown", this._boundKey);
    this.els.boardWrap.addEventListener("touchstart", this._boundTouchStart, {
      passive: false,
    });
    this.els.boardWrap.addEventListener("touchend", this._boundTouchEnd, {
      passive: false,
    });
    this.els.boardWrap.addEventListener(
      "touchmove",
      function (e) {
        e.preventDefault();
      },
      { passive: false }
    );
  };

  FanwenSnake.prototype.unbind = function () {
    document.removeEventListener("keydown", this._boundKey);
    this.els.boardWrap.removeEventListener("touchstart", this._boundTouchStart);
    this.els.boardWrap.removeEventListener("touchend", this._boundTouchEnd);
    this.stopLoop();
  };

  FanwenSnake.prototype.load = function (work) {
    this.work = work;
    this.els.poemTitle.textContent =
      work.author +
      "〈" +
      work.title +
      "〉" +
      (work.subtitle ? "（" + work.subtitle + "）" : "");
    this.reset(false);
  };

  FanwenSnake.prototype.reset = function (keepOverlayOff) {
    this.stopLoop();
    this.running = false;
    this.ended = false;
    this.mistakes = 0;
    this.coupletIndex = 0;
    this.eatenInCouplet = 0;
    this.chars = [];
    this.foods = [];
    this.dir = "right";
    this.pendingDir = "right";
    const mid = Math.floor(GRID / 2);
    this.snake = [
      { x: mid - 1, y: mid },
      { x: mid - 2, y: mid },
      { x: mid - 3, y: mid },
    ];
    this.els.startBtn.textContent = "開始遊戲";
    this.els.overlay.classList.remove("active", "win", "lose");
    this.els.overlay.setAttribute("aria-hidden", "true");
    this.updateHud();
    this.render();
  };

  FanwenSnake.prototype.start = function () {
    if (!this.work) return;
    this.reset(true);
    this.spawnCoupletFoods();
    this.running = true;
    this.els.startBtn.textContent = "重新開始";
    this.updateHud();
    this.render();
    this.startLoop();
  };

  FanwenSnake.prototype.setSpeed = function (key) {
    if (!SPEEDS[key]) return;
    this.speedKey = key;
    if (this.running) this.startLoop();
  };

  FanwenSnake.prototype.startLoop = function () {
    this.stopLoop();
    this.timer = setInterval(this.tick.bind(this), SPEEDS[this.speedKey]);
  };

  FanwenSnake.prototype.stopLoop = function () {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  };

  FanwenSnake.prototype.expectedChar = function () {
    const seq = FanwenData.coupletChars(this.work.couplets[this.coupletIndex]);
    return seq[this.eatenInCouplet];
  };

  FanwenSnake.prototype.occupiedSet = function (includeFood) {
    const set = new Set();
    this.snake.forEach(function (p) {
      set.add(p.x + "," + p.y);
    });
    if (includeFood) {
      this.foods.forEach(function (f) {
        set.add(f.x + "," + f.y);
      });
    }
    return set;
  };

  FanwenSnake.prototype.emptyCells = function () {
    const taken = this.occupiedSet(true);
    const cells = [];
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        if (!taken.has(x + "," + y)) cells.push({ x: x, y: y });
      }
    }
    return cells;
  };

  FanwenSnake.prototype.randomEmpty = function () {
    const cells = this.emptyCells();
    if (!cells.length) return null;
    return cells[Math.floor(Math.random() * cells.length)];
  };

  FanwenSnake.prototype.spawnCoupletFoods = function () {
    this.foods = [];
    const chars = FanwenData.coupletChars(this.work.couplets[this.coupletIndex]);
    const spots = this.emptyCells();
    for (let i = spots.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = spots[i];
      spots[i] = spots[j];
      spots[j] = tmp;
    }
    chars.forEach(function (ch, i) {
      const spot = spots[i];
      if (spot) this.foods.push({ x: spot.x, y: spot.y, char: ch });
    }, this);
  };

  FanwenSnake.prototype.placeFood = function (char) {
    const spot = this.randomEmpty();
    if (spot) this.foods.push({ x: spot.x, y: spot.y, char: char });
  };

  FanwenSnake.prototype.targetLength = function () {
    return Math.max(3, 1 + this.chars.length);
  };

  FanwenSnake.prototype.applyMove = function (next) {
    this.snake.unshift(next);
    const target = this.targetLength();
    while (this.snake.length > target) this.snake.pop();
  };

  FanwenSnake.prototype.hitsSnake = function (pos, ignoreTail) {
    const last = this.snake.length - 1;
    for (let i = 0; i < this.snake.length; i++) {
      if (ignoreTail && i === last) continue;
      if (this.snake[i].x === pos.x && this.snake[i].y === pos.y) return true;
    }
    return false;
  };

  FanwenSnake.prototype.tick = function () {
    if (!this.running) return;
    if (this.pendingDir && this.pendingDir !== OPPOSITE[this.dir]) {
      this.dir = this.pendingDir;
    }
    const step = DIRS[this.dir];
    const head = this.snake[0];
    const next = { x: head.x + step.x, y: head.y + step.y };

    if (next.x < 0 || next.y < 0 || next.x >= GRID || next.y >= GRID) {
      this.endGame(false);
      return;
    }

    const foodIndex = this.foods.findIndex(function (f) {
      return f.x === next.x && f.y === next.y;
    });
    const correctEat =
      foodIndex >= 0 && this.foods[foodIndex].char === this.expectedChar();
    const wrongEat = foodIndex >= 0 && !correctEat;
    let nextCharCount = this.chars.length;
    if (correctEat) nextCharCount += 1;
    else if (wrongEat && this.eatenInCouplet > 0) nextCharCount -= 1;
    const nextLen = Math.max(3, 1 + nextCharCount);
    const ignoreTail = nextLen <= this.snake.length;

    if (this.hitsSnake(next, ignoreTail)) {
      this.endGame(false);
      return;
    }

    if (correctEat) {
      const eaten = this.foods[foodIndex];
      this.foods.splice(foodIndex, 1);
      this.chars.push(eaten.char);
      this.eatenInCouplet += 1;
      this.applyMove(next);
      this.afterCorrectEat();
    } else if (wrongEat) {
      const food = this.foods[foodIndex];
      this.mistakes += 1;
      this.foods.splice(foodIndex, 1);
      this.applyMove(next);
      if (this.eatenInCouplet > 0) {
        const dropped = this.chars.pop();
        this.eatenInCouplet -= 1;
        const dropPos = this.snake[this.snake.length - 1];
        const lenBefore = this.snake.length;
        this.applyMoveLengthOnly();
        if (this.snake.length < lenBefore) {
          this.foods.push({ x: dropPos.x, y: dropPos.y, char: dropped });
        } else {
          this.placeFood(dropped);
        }
      }
      this.placeFood(food.char);
    } else {
      this.applyMove(next);
    }

    this.updateHud();
    this.render();
  };

  FanwenSnake.prototype.applyMoveLengthOnly = function () {
    const target = this.targetLength();
    while (this.snake.length > target) this.snake.pop();
  };

  FanwenSnake.prototype.afterCorrectEat = function () {
    const couplet = this.work.couplets[this.coupletIndex];
    const total = couplet.lines[0].length + couplet.lines[1].length;
    if (this.eatenInCouplet < total) return;
    if (this.coupletIndex >= this.work.couplets.length - 1) {
      this.endGame(true);
      return;
    }
    this.coupletIndex += 1;
    this.eatenInCouplet = 0;
    this.spawnCoupletFoods();
  };

  FanwenSnake.prototype.endGame = function (won) {
    this.running = false;
    this.ended = true;
    this.stopLoop();
    this.updateHud();
    this.render();
    const overlay = this.els.overlay;
    overlay.classList.add("active");
    overlay.classList.toggle("win", won);
    overlay.classList.toggle("lose", !won);
    overlay.setAttribute("aria-hidden", "false");
    this.els.overlayTitle.textContent = won ? "通關!" : "遊戲結束";
    this.els.overlayScore.textContent = "得分 " + clampScore(this.mistakes);
    this.els.overlayDetail.textContent = won
      ? "吃錯 " + this.mistakes + " 次"
      : "撞到牆壁或自己 · 吃錯 " + this.mistakes + " 次";
  };

  FanwenSnake.prototype.progressText = function () {
    if (!this.work) return "";
    let out = "";
    this.work.couplets.forEach(function (couplet, i) {
      if (i < this.coupletIndex) {
        out += couplet.lines[0] + couplet.puncts[0] + couplet.lines[1] + couplet.puncts[1];
        return;
      }
      if (i !== this.coupletIndex) return;
      const all = couplet.lines[0] + couplet.lines[1];
      const eaten = all.slice(0, this.eatenInCouplet);
      const firstLen = couplet.lines[0].length;
      if (eaten.length >= firstLen) {
        out += couplet.lines[0] + couplet.puncts[0] + eaten.slice(firstLen);
        if (eaten.length === all.length) out += couplet.puncts[1];
      } else {
        out += eaten;
      }
    }, this);
    return out;
  };

  FanwenSnake.prototype.updateHud = function () {
    this.els.score.textContent = String(clampScore(this.mistakes));
    this.els.mistakes.textContent = String(this.mistakes);
    const total = this.work ? this.work.couplets.length : 0;
    this.els.couplet.textContent = this.work
      ? Math.min(this.coupletIndex + 1, total) + "/" + total
      : "—";
    const recited = this.progressText();
    this.els.progress.textContent = recited;
    this.els.progress.dataset.idle = !recited && !this.running ? "1" : "0";
  };

  FanwenSnake.prototype.render = function () {
    this.cells.forEach(function (cell) {
      cell.className = "cell";
      cell.textContent = "";
    });

    const bodyMap = {};
    this.snake.forEach(function (seg, i) {
      if (i === 0) return;
      const ch = this.chars[i - 1] || "";
      bodyMap[seg.x + "," + seg.y] = ch;
    }, this);

    this.foods.forEach(function (food) {
      const el = this.cells[food.y * GRID + food.x];
      el.classList.add("food");
      el.textContent = food.char;
    }, this);

    this.snake.forEach(function (seg, i) {
      const el = this.cells[seg.y * GRID + seg.x];
      if (i === 0) {
        el.className = "cell snake snake-head";
        el.textContent = "";
        return;
      }
      el.className = "cell snake";
      el.textContent = bodyMap[seg.x + "," + seg.y] || "";
    }, this);
  };

  FanwenSnake.prototype.setDirection = function (dir) {
    if (!DIRS[dir]) return;
    if (dir === OPPOSITE[this.dir]) return;
    this.pendingDir = dir;
  };

  FanwenSnake.prototype.onKey = function (e) {
    const dir = KEY_DIR[e.key];
    if (!dir) return;
    e.preventDefault();
    if (!this.running) return;
    this.setDirection(dir);
  };

  FanwenSnake.prototype.onTouchStart = function (e) {
    if (e.touches.length !== 1) return;
    e.preventDefault();
    this.touchStart = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  FanwenSnake.prototype.onTouchEnd = function (e) {
    if (!this.touchStart) return;
    e.preventDefault();
    const t = e.changedTouches[0];
    const dx = t.clientX - this.touchStart.x;
    const dy = t.clientY - this.touchStart.y;
    this.touchStart = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    if (!this.running) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      this.setDirection(dx > 0 ? "right" : "left");
    } else {
      this.setDirection(dy > 0 ? "down" : "up");
    }
  };

  global.FanwenSnake = FanwenSnake;
})(window);
