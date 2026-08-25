(function () {
  "use strict";

  var app = document.getElementById("egypt-app");
  var progress = document.getElementById("egypt-progress");
  var reset = document.getElementById("egypt-reset");

  var SCREENS = ["intro", "nile", "pyramids", "glyphs", "afterlife", "quiz", "reward"];

  var GLYPHS = [
    { id: "sun", sign: "☼", meaning: "Солнце" },
    { id: "life", sign: "𓋹", meaning: "Жизнь" },
    { id: "eye", sign: "𓂀", meaning: "Защита" },
    { id: "falcon", sign: "𓅃", meaning: "Сокол" }
  ];

  var QUIZ = [
    {
      q: "Где вырос Древний Египет?",
      options: ["Вокруг реки Нил", "В высоких горах", "В густом лесу"],
      answer: "Вокруг реки Нил"
    },
    {
      q: "Где находятся самые знаменитые пирамиды Египта?",
      options: ["В Гизе", "В Риме", "В Париже"],
      answer: "В Гизе"
    },
    {
      q: "Чем писали древние египтяне?",
      options: ["Иероглифами на папирусе и камне", "Только цифрами", "Буквами как в нашей азбуке"],
      answer: "Иероглифами на папирусе и камне"
    },
    {
      q: "С чем был связан бог Ра?",
      options: ["С Солнцем", "С морем", "Со снегом"],
      answer: "С Солнцем"
    }
  ];

  function shuffle(list) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function fresh() {
    return {
      screen: "intro",
      nileLearned: false,
      nileStep: 0,
      pyramidLesson: false,
      pyramidLayers: [],
      pyramidPurpose: null,
      pyramidWhere: null,
      glyphLearned: false,
      glyphPick: null,
      glyphDone: {},
      glyphWrite: null,
      glyphMessage: [],
      glyphPraise: "",
      pyramidPraise: "",
      meanOrder: shuffle(["sun", "life", "eye", "falcon"]),
      godsLearned: false,
      godPick: null,
      quizIndex: 0,
      quizSolved: [],
      quizOrders: QUIZ.map(function (item) { return shuffle(item.options); })
    };
  }

  var state = fresh();
  var historyList = [];
  var historyPos = -1;
  var restoring = false;

  function copy(x) { return JSON.parse(JSON.stringify(x)); }
  function sig(x) { return JSON.stringify(x); }

  function ru(text) {
    return String(text).replace(/(^|\s)(и|а|но|в|во|на|до|от|с|со|к|ко|у|о|об|по|за|из|для|при)\s+/gi, function (_, lead, w) {
      return lead + w + "\u00a0";
    });
  }

  function remember() {
    if (restoring) {
      restoring = false;
      updateNav();
      return;
    }
    var snap = copy(state);
    if (historyPos >= 0 && sig(historyList[historyPos]) === sig(snap)) {
      updateNav();
      return;
    }
    historyList = historyList.slice(0, historyPos + 1);
    historyList.push(snap);
    historyPos = historyList.length - 1;
    updateNav();
  }

  function goSlide(delta) {
    var target = historyPos + delta;
    if (target < 0 || target >= historyList.length) return;
    historyPos = target;
    state = copy(historyList[historyPos]);
    restoring = true;
    render();
  }

  function setProgress(step) {
    progress.innerHTML = [1, 2, 3, 4, 5].map(function (n) {
      return '<i class="' + (n <= step ? "on" : "") + '"></i>';
    }).join("");
  }

  function injectNav() {
    if (state.screen === "intro" || state.screen === "reward") return;
    var panel = app.querySelector(".panel");
    if (!panel || panel.querySelector(".slide-nav")) return;
    var nav = document.createElement("div");
    nav.className = "slide-nav";
    nav.innerHTML =
      '<button type="button" id="slide-prev" aria-label="Назад">←</button>' +
      '<button type="button" id="slide-next" aria-label="Вперёд">→</button>';
    panel.appendChild(nav);
    nav.querySelector("#slide-prev").addEventListener("click", function () { goSlide(-1); });
    nav.querySelector("#slide-next").addEventListener("click", function () { goSlide(1); });
    updateNav();
  }

  function updateNav() {
    var prev = document.getElementById("slide-prev");
    var next = document.getElementById("slide-next");
    if (prev) prev.disabled = historyPos <= 0;
    if (next) next.disabled = historyPos < 0 || historyPos >= historyList.length - 1;
  }

  function head(title, count) {
    return (
      '<div class="stage-head"><strong>' + title + "</strong>" +
      (count ? '<span class="stage-count">' + count + "</span>" : "") +
      "</div>"
    );
  }

  function choices(name, items, picked, correct) {
    return (
      '<div class="choices">' +
      items.map(function (item) {
        var cls = "choice";
        if (picked === item) cls += item === correct ? " correct" : " wrong";
        if (picked && item === correct) cls += " correct";
        return (
          '<button class="' + cls + '" data-act="' + name + '" data-value="' + item + '"' +
          (picked ? " disabled" : "") + ">" + ru(item) + "</button>"
        );
      }).join("") +
      "</div>"
    );
  }

  function renderIntro() {
    setProgress(0);
    app.innerHTML =
      '<section class="panel">' +
      '<div class="hero-badges"><span class="hero-badge">ЭКСПЕДИЦИЯ №2</span><span class="hero-badge">≈ 4–5 тысяч лет назад</span></div>' +
      " <h1>Тайны Древнего Египта</h1>" +
      "<p class=\"lead\">Отправляемся примерно на 4–5 тысяч лет назад и исследуем жизнь древних египтян.</p>" +
      '<div class="scene-art scene-intro" role="img" aria-label="Путешественник у пирамид Гизы"></div>' +
      '<button class="primary" data-act="start">Начать экспедицию</button>' +
      "</section>";
  }

  function renderNile() {
    setProgress(1);
    var action = "";
    if (!state.nileLearned) {
      action = '<div class="story-box"><h3>История Нила</h3>' +
        '<p><b>Нил — большая река, вокруг которой вырос Древний Египет.</b> Среди жарких и сухих земель вода давала людям возможность жить, выращивать растения и строить поселения.</p>' +
        '<p>Каждый год Нил поднимался и разливался. Потом вода уходила и оставляла на берегах плодородный ил. Поэтому рядом с рекой зеленели поля и собирали урожай.</p>' +
        '<div class="story-steps"><span>💧 <b>Река даёт воду</b></span><span>🌱 <b>Берега становятся плодородными</b></span><span>🏘️ <b>Рядом растут поселения</b></span></div>' +
        '<button class="primary" data-act="nile-learn">Понятно, продолжить →</button></div>';
    } else if (state.nileStep === 0) {
      action = '<div class="action-story"><p><b>Посмотри на берега Нила.</b> Здесь есть вода, зелёные поля и поселения. Что река давала египтянам?</p>' +
        choices("nile-choice", ["Воду и плодородную землю","Только место для кораблей","Только песок"], null, "Воду и плодородную землю") + '<p class="feedback" id="nile-fb"></p></div>';
    } else {
      action = '<p class="feedback ok praise">Верно! Молодец! Нил давал людям воду, а его берега помогали выращивать растения.</p><button class="primary" data-act="to-pyramids">К пирамидам →</button>';
    }
    var nileSceneClass = state.nileLearned ? "scene-nile-landscape" : "scene-nile-boy";
    var nileAlt = state.nileLearned ? "Река Нил, зелёные плодородные берега и поля" : "Мальчик-путешественник знакомится с рекой Нил";
    app.innerHTML = '<section class="panel">' + head("МИССИЯ 1 · НИЛ", "1 из 4") +
      '<h2>Нил — река, вокруг которой вырос Египет</h2>' +
      '<div class="scene-art ' + nileSceneClass + '" role="img" aria-label="' + nileAlt + '"></div>' + action + '</section>';
  }

  function renderPyramids() {
    setProgress(2);
    var sceneClass = !state.pyramidLesson ? "scene-giza" : (!state.pyramidPurpose ? "scene-pyramid-sitting" : "scene-pyramid-sphinx");
    var sceneAlt = !state.pyramidLesson ? "Пирамида Хеопса и крупные каменные блоки на строительной площадке" : (!state.pyramidPurpose ? "Мальчик рассматривает огромные каменные блоки у пирамиды" : "Пирамиды и Большой сфинкс в Гизе");
    var scene = '<div class="pyramid-build scene-art ' + sceneClass + '" role="img" aria-label="' + sceneAlt + '"></div>';
    var next = "";
    if (!state.pyramidLesson) {
      next = '<div class="learn-box pyramid-lesson"><h3>Познакомься с пирамидами</h3>' +
        '<p>Перед тобой <b>пирамиды Древнего Египта</b> — огромные сооружения из каменных блоков. Их строили для фараонов, и они стоят уже тысячи лет.</p>' +
        '<p><b>Гиза</b> — место рядом с современным Каиром. Именно там находятся самые знаменитые египетские пирамиды. Самая большая — пирамида <b>Хеопса</b>, построенная примерно в <b>XXVI веке до н. э.</b></p>' +
        '<p class="wonder-fact"><b>★ Главное чудо:</b> пирамида Хеопса — единственное из семи чудес Древнего мира, сохранившееся до наших дней.</p>' +
        '<button class="primary" data-act="pyr-learn">Понятно, продолжить →</button></div>';
    } else if (!state.pyramidPurpose) {
      next = '<div class="learn-box pyramid-fact"><h3>Из чего сложена пирамида?</h3>' +
        '<p>Посмотри на огромные камни рядом с мальчиком. <b>Из таких известняковых блоков складывали основную часть Великой пирамиды.</b></p>' +
        '<p class="wonder-fact"><b>Интересный факт:</b> по распространённой оценке, в пирамиде Хеопса около <b>2,3 миллиона каменных блоков</b>, а средний блок весит примерно <b>2,5 тонны</b>.</p>' +
        '<button class="primary" data-act="pyr-fact-next">Запомнил, проверить →</button></div>';
    } else if (!state.pyramidWhere) {
      next = '<p><b>Проверь себя.</b> Где находятся самые знаменитые пирамиды Египта?</p>' +
        choices("pyr-where-place", ["В Гизе", "В Риме", "В Париже"], null, "В Гизе") + '<p class="feedback" id="pyr-fb"></p>';
    } else {
      next = '<p class="feedback ok praise">Верно! Молодец! Ты запомнил: Гиза · Хеопс · XXVI век до н. э.</p>' +
        '<button class="primary" data-act="to-glyphs">Дальше →</button>';
    }
    app.innerHTML = '<section class="panel">' + head("МИССИЯ 2 · ПИРАМИДЫ", "2 из 4") +
      '<h2>Как строили пирамиды</h2>' + scene + next + '</section>';
  }

  function renderGlyphs() {
    setProgress(3);
    var doneCount = Object.keys(state.glyphDone).length;
    var facts = {
      sun: "Солнечный диск обозначал солнце и день.",
      life: "Анкх — знаменитый знак жизни.",
      eye: "Глаз Гора (уджат) был защитным знаком и символом благополучия.",
      falcon: "Сокол был связан с богом Гором — одним из важнейших богов Египта."
    };
    var lessonCards = GLYPHS.map(function (g) {
      return '<div class="glyph-lesson-card"><span class="sign" aria-hidden="true">' + g.sign + '</span><strong>' + g.meaning + '</strong><span>' + facts[g.id] + '</span></div>';
    }).join("");
    var glyphBtns = GLYPHS.map(function (g) {
      var cls = "glyph-card";
      if (state.glyphDone[g.id]) cls += " matched";
      else if (state.glyphPick === g.id) cls += " picked";
      return '<button class="' + cls + '" data-act="glyph-pick" data-id="' + g.id + '"' + (state.glyphDone[g.id] || state.glyphWrite ? " disabled" : "") + '><span class="sign" aria-hidden="true">' + g.sign + '</span><span>выбрать знак</span></button>';
    }).join("");
    var meaningBtns = state.meanOrder.map(function (id) {
      var g = GLYPHS.filter(function (x) { return x.id === id; })[0];
      return '<button class="choice' + (state.glyphDone[g.id] ? " matched" : "") + '" data-act="glyph-mean" data-id="' + g.id + '"' + (state.glyphDone[g.id] || state.glyphWrite ? " disabled" : "") + '>' + g.meaning + '</button>';
    }).join("");
    var after = "";
    if (!state.glyphLearned) {
      after = '<div class="learn-box"><h3>Прочитай знаки на плите</h3>' +
        '<p><b>Иероглифы</b> — знаки древнеегипетского письма. Один знак мог передавать предмет, звук или идею. На этой плите герой нашёл четыре понятных образа.</p>' +
        '<div class="glyph-lesson-grid">' + lessonCards + '</div>' +
        '<button class="primary" data-act="glyph-learn">Понятно, продолжить →</button></div>';
    } else if (doneCount < 4) {
      after = '<div class="practice-box"><h3>Расшифруй плиту</h3><p>Нажми знак, затем выбери его значение. Совпадений: <b>' + doneCount + ' из 4</b>.</p><div class="glyph-grid">' + glyphBtns + '</div><div class="meaning-grid">' + meaningBtns + '</div><p class="feedback" id="glyph-fb">' + (state.glyphPick ? 'Знак выбран. Теперь нажми его значение ниже.' : '') + '</p></div>';
    } else if (!state.glyphWrite) {
      var target = ["life", "sun", "eye"];
      var picked = state.glyphMessage || [];
      var prompts = ["Найди знак Жизни", "Теперь найди Солнце", "И последний — знак Защиты"];
      var options = shuffle(GLYPHS);
      after = '<div class="glyph-hunt"><h3>Проверь, что запомнил</h3>' +
        '<p class="hunt-prompt"><b>' + prompts[picked.length] + '</b>. Нажми нужный знак.</p>' +
        '<div class="glyph-hunt-row">' + options.map(function(o){ return '<button class="glyph-hunt-btn" data-act="glyph-message" data-id="' + o.id + '" aria-label="Выбрать знак ' + o.meaning + '"><span>' + o.sign + '</span></button>'; }).join('') + '</div>' +
        '<p class="hunt-progress">Найдено: <b>' + picked.length + ' из 3</b></p><p class="feedback" id="glyph-fb"></p></div>';
    } else {
      after = '<p class="feedback ok praise">Отлично! Ты прочитал знаки и собрал своё первое игровое послание.</p><button class="primary" data-act="to-afterlife">К следующей миссии →</button>';
    }
    app.innerHTML = '<section class="panel">' + head("МИССИЯ 3 · ИЕРОГЛИФЫ", "3 из 4") + '<h2>Тайна древних знаков</h2><div class="scene-art scene-glyphs" role="img" aria-label="Герой рассматривает плиту с четырьмя крупными египетскими знаками"></div>' + after + '</section>';
  }

  function renderAfterlife() {
    setProgress(4);
    var next = "";
    if (!state.godsLearned) {
      next = '<div class="story-box"><h3>Фараон и боги</h3>' +
        '<p><b>Фараон</b> был правителем Древнего Египта.</p>' +
        '<p>Египтяне верили <b>во многих богов</b>. Богов связывали с природой и часто изображали с чертами животных.</p>' +
        '<div class="god-cards"><div><b>☀️ Ра</b><span>бог Солнца</span></div><div><b>🦅 Гор</b><span>его изображали с головой сокола</span></div><div><b>🐺 Анубис</b><span>его изображали с головой шакала</span></div></div>' +
        '<button class="primary" data-act="gods-learn">Понятно, продолжить →</button></div>';
    } else if (!state.godPick) {
      next = '<div class="action-story"><p><b>Теперь попробуй сам.</b> С чем был связан бог Ра?</p>' +
        choices("god-pick", ["С Солнцем", "С морем", "Со снегом"], null, "С Солнцем") + '<p class="feedback" id="gods-fb"></p></div>';
    } else {
      next = '<p class="feedback ok praise">Молодец! Ра связан с Солнцем. Ты узнал, кто такой фараон и почему в Египте встречаются боги с чертами животных.</p>' +
        '<button class="primary" data-act="to-quiz">К финальной проверке →</button>';
    }
    app.innerHTML = '<section class="panel">' + head("МИССИЯ 4 · ФАРАОН И БОГИ", "4 из 4") +
      '<h2>Правитель и боги Древнего Египта</h2>' +
      '<div class="scene-art scene-pharaoh" role="img" aria-label="Путешественник наблюдает за фараоном"></div>' + next + '</section>';
  }

  function renderQuiz() {
    setProgress(5);
    var i = state.quizIndex;
    var item = QUIZ[i];
    var solved = state.quizSolved[i];
    var visual = ["nile", "giza", "glyphs", "pharaoh"][i];
    var praise = [
      "Нил дал людям воду и плодородные берега.",
      "Гиза — место рядом с Каиром, где стоят самые знаменитые пирамиды.",
      "Иероглифы писали на папирусе и высекали на камне.",
      "Ра был связан с Солнцем."
    ][i];
    app.innerHTML = '<section class="panel quiz-panel">' + head("ФИНАЛЬНАЯ ПРОВЕРКА", (i + 1) + " из 4") +
      '<div class="quiz-visual scene-art scene-' + visual + '" role="img" aria-label="Кадр из пройденной миссии"></div>' +
      '<div class="quiz-content"><p class="quiz-n">Вопрос ' + (i + 1) + '</p><h2>' + ru(item.q) + '</h2>' +
      choices("quiz", state.quizOrders[i], solved ? item.answer : null, item.answer) +
      '<p class="feedback ' + (solved ? 'ok praise' : '') + '" id="quiz-fb">' + (solved ? '<b>Верно! Молодец!</b> ' + praise : '') + '</p>' +
      (solved ? '<div class="quiz-next-wrap">' + (i < QUIZ.length - 1 ? '<button class="primary quiz-next-btn" data-act="quiz-next">Продолжить →</button>' : '<button class="primary quiz-next-btn" data-act="to-reward">Получить награду →</button>') + '</div>' : '') + '</div></section>';
  }

  function renderReward() {
    setProgress(5);
    try { localStorage.setItem("chronosphere-egypt-complete", "1"); } catch (e) {}
    app.innerHTML =
      '<section class="panel reward" aria-label="Экспедиция завершена">' +
      '<div class="scene-art scene-reward" role="img" aria-label="Победитель экспедиции со скарабеем и папирусом"></div>' +
      "<h1>Экспедиция завершена!</h1>" +
      "<p class=\"lead\">Ты узнал о Ниле, пирамидах, иероглифах, фараонах и богах.</p>" +
      "<p>Спасибо за любознательность!</p>" +
      '<div class="reward-actions">' +
      '<button class="primary" data-act="restart">Пройти ещё раз</button>' +
      '<a class="primary" href="index.html">Вернуться на Карту времени</a>' +
      "</div></section>";
  }

  function render() {
    if (state.screen === "intro") renderIntro();
    if (state.screen === "nile") renderNile();
    if (state.screen === "pyramids") renderPyramids();
    if (state.screen === "glyphs") renderGlyphs();
    if (state.screen === "afterlife") renderAfterlife();
    if (state.screen === "quiz") renderQuiz();
    if (state.screen === "reward") renderReward();
    injectNav();
    remember();
    app.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }

  function markWrong(btn, fbId, msg) {
    if (btn) {
      btn.classList.remove("wrong");
      void btn.offsetWidth;
      btn.classList.add("wrong");
      setTimeout(function () { btn.classList.remove("wrong"); }, 500);
    }
    var fb = document.getElementById(fbId);
    if (fb) {
      fb.className = "feedback try";
      fb.textContent = msg || "Не то. Попробуй ещё раз.";
    }
  }

  app.addEventListener("click", function (e) {
    var b = e.target.closest("[data-act]");
    if (!b) return;
    var act = b.dataset.act;

    if (act === "start") { state.screen = "nile"; render(); return; }
    if (act === "nile-learn") { state.nileLearned = true; render(); return; }
    if (act === "nile-choice") {
      if (b.dataset.value === "Воду и плодородную землю") { state.nileStep = 1; render(); }
      else markWrong(b, "nile-fb", "Вспомни зелёные берега и поля рядом с рекой.");
      return;
    }
    if (act === "to-pyramids") { state.screen = "pyramids"; render(); return; }
    if (act === "pyr-learn") { state.pyramidLesson = true; render(); return; }
    if (act === "pyr-fact-next") { state.pyramidPurpose = true; render(); return; }

    if (act === "pyr-layer") {
      var need = ["base", "mid", "top"][state.pyramidLayers.length];
      if (b.dataset.id === need) {
        state.pyramidLayers.push(need);
        state.pyramidPraise = state.pyramidLayers.length < 3 ? "Отлично! Камень на месте. Продолжай!" : "Супер! Все камни установлены!";
        render();
      } else markWrong(b, null, "");
      return;
    }
    if (act === "pyr-purpose") {
      if (b.dataset.value === "В Гизе") { state.pyramidPurpose = true; render(); }
      else markWrong(b, "pyr-fb", "Вспомни рассказ: самые знаменитые пирамиды стоят в Гизе.");
      return;
    }
    if (act === "pyr-where-place") {
      if (b.dataset.value === "В Гизе") { state.pyramidWhere = true; render(); }
      else markWrong(b, "pyr-fb", "Вспомни рассказ: самые знаменитые пирамиды стоят в Гизе, рядом с Каиром.");
      return;
    }
    if (act === "pyr-where") {
      if (b.dataset.value === "Примерно в XXVI веке до н. э.") { state.pyramidWhere = true; render(); }
      else markWrong(b, "pyr-fb", "Это очень давно: XXVI век до н. э.");
      return;
    }
    if (act === "to-glyphs") { state.screen = "glyphs"; render(); return; }

    if (act === "glyph-learn") { state.glyphLearned = true; render(); return; }

    if (act === "glyph-pick") {
      state.glyphPick = b.dataset.id;
      state.glyphPraise = "";
      render();
      return;
    }
    if (act === "glyph-mean") {
      if (!state.glyphPick) return;
      if (state.glyphPick === b.dataset.id) {
        state.glyphDone[b.dataset.id] = true;
        state.glyphPraise = "Верно! Молодец — ты узнал знак «" + GLYPHS.filter(function(x){ return x.id === b.dataset.id; })[0].meaning + "»!";
        state.glyphPick = null;
        render();
      } else {
        markWrong(b, "glyph-fb", "Этот знак значит другое.");
        state.glyphPick = null;
        var picked = app.querySelector(".glyph-card.picked");
        if (picked) picked.classList.remove("picked");
      }
      return;
    }
    if (act === "glyph-message") {
      var target = ["life", "sun", "eye"];
      var pos = state.glyphMessage.length;
      if (b.dataset.id === target[pos]) {
        state.glyphMessage.push(b.dataset.id);
        if (state.glyphMessage.length === target.length) state.glyphWrite = true;
        render();
      } else {
        state.glyphMessage = [];
        markWrong(b, "glyph-fb", "Посмотри ещё раз на подсказку и выбери нужный знак.");
      }
      return;
    }
    if (act === "to-afterlife") { state.screen = "afterlife"; render(); return; }

    if (act === "gods-learn") { state.godsLearned = true; render(); return; }
    if (act === "god-pick") {
      if (b.dataset.value === "С Солнцем") { state.godPick = true; render(); }
      else markWrong(b, "gods-fb", "Вспомни карточку Ра: он связан с Солнцем.");
      return;
    }
    if (act === "to-quiz") { state.screen = "quiz"; render(); return; }

    if (act === "quiz") {
      var item = QUIZ[state.quizIndex];
      if (b.dataset.value === item.answer) {
        state.quizSolved[state.quizIndex] = true;
        render();
      } else markWrong(b, "quiz-fb", "Вспомни миссию и попробуй ещё раз.");
      return;
    }
    if (act === "quiz-next") { state.quizIndex += 1; render(); return; }
    if (act === "to-reward") { state.screen = "reward"; render(); return; }

    if (act === "restart") {
      state = fresh();
      historyList = [];
      historyPos = -1;
      render();
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === "ArrowLeft") goSlide(-1);
    if (e.key === "ArrowRight") goSlide(1);
  });

  reset.addEventListener("click", function () {
    if (confirm("Начать экспедицию «Тайны Древнего Египта» заново?")) {
      try { localStorage.removeItem("chronosphere-egypt-complete"); } catch (e) {}
      state = fresh();
      historyList = [];
      historyPos = -1;
      render();
    }
  });

  render();
})();
