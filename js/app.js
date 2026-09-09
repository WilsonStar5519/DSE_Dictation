(function () {
  const views = {
    home: document.getElementById("screen-home"),
    collection: document.getElementById("screen-collection"),
    game: document.getElementById("screen-game"),
  };

  const collectionTitle = document.getElementById("collection-title");
  const collectionList = document.getElementById("collection-list");
  const homeList = document.getElementById("home-list");

  const snake = new FanwenSnake({
    board: document.getElementById("board"),
    boardWrap: document.getElementById("board-wrap"),
    poemTitle: document.getElementById("poem-title"),
    score: document.getElementById("stat-score"),
    mistakes: document.getElementById("stat-mistakes"),
    couplet: document.getElementById("stat-couplet"),
    progress: document.getElementById("progress"),
    startBtn: document.getElementById("btn-start"),
    overlay: document.getElementById("overlay"),
    overlayTitle: document.getElementById("overlay-title"),
    overlayScore: document.getElementById("overlay-score"),
    overlayDetail: document.getElementById("overlay-detail"),
  });

  let currentCollection = null;

  function show(name) {
    Object.keys(views).forEach(function (key) {
      views[key].classList.toggle("active", key === name);
    });
  }

  function renderHome() {
    homeList.innerHTML = "";
    FanwenData.CURRICULUM.forEach(function (col) {
      const btn = document.createElement("button");
      btn.className = "card";
      btn.type = "button";
      btn.innerHTML =
        '<span class="kicker">指定文言經典</span>' +
        '<span class="title">' +
        col.title +
        "</span>" +
        '<span class="meta">' +
        col.subtitle +
        "</span>";
      btn.addEventListener("click", function () {
        openCollection(col);
      });
      homeList.appendChild(btn);
    });
    show("home");
  }

  function openCollection(col) {
    currentCollection = col;
    collectionTitle.textContent = col.title;
    collectionList.innerHTML = "";
    col.items.forEach(function (work) {
      const btn = document.createElement("button");
      btn.className = "card";
      btn.type = "button";
      const extra = work.subtitle ? "（" + work.subtitle + "）" : "";
      btn.innerHTML =
        '<span class="kicker">' +
        work.form +
        "</span>" +
        '<span class="title">〈' +
        work.title +
        "〉" +
        extra +
        "</span>" +
        '<span class="meta">' +
        work.author +
        "</span>";
      btn.addEventListener("click", function () {
        openGame(work);
      });
      collectionList.appendChild(btn);
    });
    show("collection");
  }

  function openGame(work) {
    snake.load(work);
    show("game");
  }

  function backFromGame() {
    snake.reset();
    if (currentCollection) openCollection(currentCollection);
    else renderHome();
  }

  document.getElementById("btn-start").addEventListener("click", function () {
    snake.start();
  });
  document.getElementById("btn-back-game").addEventListener("click", backFromGame);
  document.getElementById("btn-overlay-restart").addEventListener("click", function () {
    snake.start();
  });
  document.getElementById("btn-overlay-home").addEventListener("click", function () {
    snake.reset();
    renderHome();
  });
  document.getElementById("btn-back-collection").addEventListener("click", renderHome);

  document.querySelectorAll("[data-speed]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll("[data-speed]").forEach(function (b) {
        b.classList.toggle("active", b === btn);
      });
      snake.setSpeed(btn.getAttribute("data-speed"));
    });
  });

  window.fanwenSnake = snake;
  renderHome();
})();

