(function () {
  "use strict";

  var era = window.GAME_DATA;
  var storage = window.GameStorage;
  var app = document.getElementById("app");
  var headerProgress = document.getElementById("header-progress");
  var toast = document.getElementById("toast");

  var screen = "intro";
  var learningIndex = 0;
  var learningActionDone = false;
  var launchStep = 0;
  var training = null;
  var moonFootprints = 0;
  var flippedCards = {};
  var challenge = null;
  var satelliteDrag = null;
  var orderDrag = null;

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function preloadEventImages() {
    era.events.forEach(function (event) {
      if (!event.image) return;
      var image = new Image();
      image.src = event.image;
    });
  }

  function shuffle(items) {
    var result = items.slice();
    for (var index = result.length - 1; index > 0; index -= 1) {
      var target = Math.floor(Math.random() * (index + 1));
      var current = result[index];
      result[index] = result[target];
      result[target] = current;
    }
    return result;
  }

  function getEvent(eventId) {
    return era.events.find(function (event) {
      return event.id === eventId;
    });
  }

  function eventStats(eventId) {
    return storage.getEra(era).eventStats[eventId];
  }

  function pickWeightedEvent(preferredId) {
    if (preferredId) return getEvent(preferredId);

    var weighted = era.events.map(function (event) {
      var stats = eventStats(event.id);
      return {
        event: event,
        weight: 1 + stats.errors * 1.5 + (stats.needsRepeat ? 4 : 0),
      };
    });
    var total = weighted.reduce(function (sum, item) {
      return sum + item.weight;
    }, 0);
    var cursor = Math.random() * total;

    for (var index = 0; index < weighted.length; index += 1) {
      cursor -= weighted[index].weight;
      if (cursor <= 0) return weighted[index].event;
    }
    return weighted[weighted.length - 1].event;
  }

  function ensureShuffledOrder(ids) {
    var ordered = ids.join("|");
    var mixed = shuffle(ids);
    var attempts = 0;
    while (mixed.join("|") === ordered && attempts < 5) {
      mixed = shuffle(ids);
      attempts += 1;
    }
    if (mixed.join("|") === ordered && mixed.length > 1) {
      mixed = mixed.slice(1).concat(mixed[0]);
    }
    return mixed;
  }

  function createQuestion(type, preferredId) {
    var focus = pickWeightedEvent(preferredId);

    if (type === "eventByYear") {
      return {
        type: type,
        prompt: "Что произошло в " + focus.year + " году?",
        options: shuffle(
          era.events.map(function (event) {
            return { value: event.id, label: event.shortTitle };
          })
        ),
        answer: focus.id,
        relatedEventIds: [focus.id],
        focusEventId: focus.id,
      };
    }

    if (type === "yearByEvent") {
      return {
        type: type,
        prompt: "В каком году произошло событие «" + focus.shortTitle + "»?",
        options: shuffle(
          era.events.map(function (event) {
            return { value: String(event.year), label: String(event.year) };
          })
        ),
        answer: String(focus.year),
        relatedEventIds: [focus.id],
        focusEventId: focus.id,
      };
    }

    if (type === "earlier") {
      var others = era.events.filter(function (event) {
        return event.id !== focus.id;
      });
      var second = others[Math.floor(Math.random() * others.length)];
      var pair = [focus, second];
      var earlier = pair.slice().sort(function (first, next) {
        return first.year - next.year;
      })[0];
      return {
        type: type,
        prompt: "Что произошло раньше?",
        options: shuffle(
          pair.map(function (event) {
            return { value: event.id, label: event.shortTitle };
          })
        ),
        answer: earlier.id,
        relatedEventIds: [earlier.id],
        focusEventId: earlier.id,
        comparedEventIds: pair.map(function (event) {
          return event.id;
        }),
      };
    }

    var correctOrder = era.events
      .slice()
      .sort(function (first, next) {
        return first.year - next.year;
      })
      .map(function (event) {
        return event.id;
      });

    return {
      type: "order",
      prompt: "Расставьте события по порядку",
      orderIds: [],
      availableIds: ensureShuffledOrder(correctOrder),
      correctOrder: correctOrder,
      relatedEventIds: correctOrder.slice(),
      focusEventId: focus.id,
    };
  }

  function explanationFor(question) {
    if (question.type === "eventByYear" || question.type === "yearByEvent") {
      var event = getEvent(question.focusEventId);
      return (
        event.year +
        " — " +
        event.shortTitle +
        ". " +
        event.memoryHint
      );
    }

    if (question.type === "earlier") {
      var ordered = question.comparedEventIds
        .map(getEvent)
        .sort(function (first, next) {
          return first.year - next.year;
        });
      if (ordered.length > 2) {
        return "Раньше всего произошло событие «" + ordered[0].shortTitle + "».";
      }
      return (
        "Раньше произошло событие «" +
        ordered[0].shortTitle +
        "» — в " +
        ordered[0].year +
        " году. «" +
        ordered[1].shortTitle +
        "» было позже, в " +
        ordered[1].year +
        "."
      );
    }

    return (
      "Правильная цепочка: " +
      era.events
        .slice()
        .sort(function (first, next) {
          return first.year - next.year;
        })
        .map(function (event) {
          return event.year + " — " + event.shortTitle.toLowerCase();
        })
        .join("; ") +
      "."
    );
  }

  function updateHeader() {
    var progress = storage.getEra(era);
    var stage = 0;
    var label = "Вход в эпоху";

    if (screen === "learn") {
      stage = 1;
      label = "Открытие " + (learningIndex + 1) + " из " + era.events.length;
    } else if (screen === "timeline") {
      stage = 2;
      label = "Связь событий";
    } else if (screen === "training-intro" || screen === "training") {
      stage = 3;
      label = "Тренировка";
    } else if (screen === "challenge" || screen === "challenge-failed") {
      stage = 4;
      label = "Финальное испытание";
    } else if (screen === "reward") {
      stage = 5;
      label = "Эпоха изучена";
    }

    headerProgress.innerHTML =
      '<span class="progress-label">' +
      escapeHtml(label) +
      "</span>" +
      '<span class="progress-track" aria-hidden="true">' +
      [1, 2, 3, 4, 5]
        .map(function (item) {
          return '<i class="' + (item <= stage ? "is-active" : "") + '"></i>';
        })
        .join("") +
      "</span>" +
      (progress.finalComplete && screen !== "intro"
        ? '<span class="saved-mark" title="Прогресс сохранён">✓</span>'
        : "");
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(function () {
      toast.classList.remove("is-visible");
    }, 2200);
  }

  function render() {
    updateHeader();

    if (screen === "intro") renderIntro();
    if (screen === "learn") renderLearning();
    if (screen === "timeline") renderTimeline();
    if (screen === "training-intro") renderTrainingIntro();
    if (screen === "training") renderTraining();
    if (screen === "challenge") renderChallenge();
    if (screen === "challenge-failed") renderChallengeFailed();
    if (screen === "reward") renderReward();

    window.scrollTo({ top: 0, behavior: "smooth" });
    app.focus({ preventScroll: true });
  }

  function renderIntro() {
    app.innerHTML =
      '<section class="panel panel--hero title-approved" aria-label="Как начиналась космическая эра. Три события, изменившие историю космонавтики.">' +
      '<span class="title-approved__stars" aria-hidden="true"></span>' +
      '<button class="title-approved__start" data-action="start" type="button" aria-label="Начать экспедицию">' +
      '<span class="sr-only">Начать экспедицию</span>' +
      '</button>' +
      '</section>';
  }

  function visualMarkup(event, isDone) {
    var commonClass =
      "event-visual visual--" + event.visual + (isDone ? " is-activated" : "");

    if (event.visual === "satellite") {
      return (
        '<div class="' +
        commonClass +
        '" aria-label="Спутник выходит на орбиту">' +
        '<span class="visual-stars"></span><span class="earth"></span>' +
        '<span class="orbit"></span><span class="satellite">◈</span></div>'
      );
    }

    if (event.visual === "rocket") {
      return (
        '<div class="' +
        commonClass +
        '" aria-label="Корабль Восток-1 стартует">' +
        '<span class="visual-stars"></span><span class="earth earth--low"></span>' +
        '<span class="rocket"><i></i></span><span class="rocket-trail"></span></div>'
      );
    }

    return (
      '<div class="' +
      commonClass +
      '" aria-label="Астронавт делает первый шаг по Луне">' +
      '<span class="visual-stars"></span><span class="moon-horizon"></span>' +
      '<span class="astronaut">◉</span><span class="footprint">◖</span></div>'
    );
  }

  function sputnikVisualMarkup(mode) {
    var isInteractive = mode === "interactive";
    var tag = isInteractive ? "button" : "span";
    var classes = "sputnik-visual sputnik-visual--" + mode;
    var attributes = ' aria-hidden="true"';

    if (isInteractive) {
      classes += " scene-satellite scene-satellite--ready";
      attributes =
        ' type="button" data-satellite draggable="false" aria-label="Перетащи Спутник-1 на светящуюся орбиту"';
    } else if (mode === "orbit") {
      classes += " scene-satellite scene-satellite--orbiting";
    }

    return (
      "<" +
      tag +
      ' class="' +
      classes +
      '"' +
      attributes +
      ">" +
      '<svg class="sputnik-visual__svg" viewBox="0 0 360 245" focusable="false" aria-hidden="true">' +
      "<defs>" +
      '<radialGradient id="sputnik-metal" cx="27%" cy="21%" r="78%">' +
      '<stop offset="0" stop-color="#ffffff"/><stop offset=".12" stop-color="#dfe4e7"/>' +
      '<stop offset=".38" stop-color="#7d858b"/><stop offset=".68" stop-color="#30363b"/>' +
      '<stop offset="1" stop-color="#090d10"/></radialGradient>' +
      '<linearGradient id="sputnik-wire" x1="0" y1="0" x2="1" y2="0">' +
      '<stop offset="0" stop-color="#e9eef0" stop-opacity=".12"/>' +
      '<stop offset=".62" stop-color="#bdc5ca"/><stop offset="1" stop-color="#ffffff"/>' +
      "</linearGradient></defs>" +
      '<g class="sputnik-visual__antennas" fill="none" stroke="url(#sputnik-wire)" stroke-linecap="round">' +
      '<line x1="242" y1="88" x2="14" y2="130"/>' +
      '<line x1="240" y1="96" x2="48" y2="194"/>' +
      '<line x1="245" y1="104" x2="102" y2="231"/>' +
      '<line x1="255" y1="111" x2="179" y2="241"/></g>' +
      '<circle class="sputnik-visual__sphere" cx="272" cy="65" r="59" fill="url(#sputnik-metal)" stroke="#e8eef1" stroke-width="1.5"/>' +
      '<ellipse cx="250" cy="39" rx="18" ry="9" fill="#fff" opacity=".48" transform="rotate(-28 250 39)"/>' +
      '<circle cx="238" cy="89" r="5" fill="#697278" stroke="#d9e0e4" stroke-width="1"/>' +
      "</svg>" +
      (isInteractive
        ? '<span class="scene-satellite__pulse" aria-hidden="true"></span>'
        : "") +
      "</" +
      tag +
      ">"
    );
  }

  function eventProgressMarkup() {
    return (
      '<span class="event-progress" aria-hidden="true">' +
      era.events
        .map(function (event, index) {
          return '<i class="' + (index <= learningIndex ? "is-active" : "") + '"></i>';
        })
        .join("") +
      "</span>"
    );
  }

  function learningTopic(event) {
    if (event.id === "sputnik-1957") return "Первый искусственный спутник Земли";
    if (event.year === 1961) return "Первый полёт человека в космос";
    return "Первая высадка человека на Луну";
  }

  function eventSceneTopMarkup(event) {
    return (
      '<div class="event-scene-top"><div><span>Событие ' +
      (learningIndex + 1) + " из " + era.events.length +
      '</span></div>' + eventProgressMarkup() + '</div>'
    );
  }

  function eventReinforcementMarkup(event, nextLabel) {
    return (
      '<div class="scene-success" role="status"><div class="scene-success__knowledge">' +
      "<strong><b>" +
      event.year +
      "</b> · " +
      escapeHtml(event.resultTitle || event.title) +
      "</strong>" +
      '<p><span aria-hidden="true">✦</span>' +
      escapeHtml(event.visualFact || event.fact) +
      "</p>" +
      (event.memoryLink
        ? "<small>" + escapeHtml(event.memoryLink) + "</small>"
        : "") +
      "</div>" +
      '<button class="scene-next" data-action="next-event" type="button" aria-label="' +
      escapeHtml(nextLabel) +
      '">' +
      escapeHtml(nextLabel) +
      ' <span aria-hidden="true">→</span></button></div>'
    );
  }

  function renderSatelliteLearning(event, nextLabel) {
    app.innerHTML =
      '<section class="satellite-lesson" aria-labelledby="satellite-year">' + '<div class="learning-heading"><span>Сейчас изучаем</span><strong>' + escapeHtml(learningTopic(event)) + '</strong></div>' +
      '<div class="satellite-scene' +
      (learningActionDone ? " is-complete" : "") +
      '" data-satellite-scene>' +
      '<span class="scene-earth event-scene-earth" aria-hidden="true"></span>' +
      eventSceneTopMarkup(event) +
      '<div class="scene-year" id="satellite-year"><strong>' +
      event.year +
      "</strong></div>" +
      '<div class="scene-orbit" data-orbit-target aria-hidden="true"><span></span></div>' +
      (learningActionDone
        ? '<div class="orbiting-satellite" aria-hidden="true">' +
          sputnikVisualMarkup("orbit") +
          "</div>" +
          eventReinforcementMarkup(event, nextLabel)
        : sputnikVisualMarkup("interactive") +
          '<div class="scene-drag-hint" data-drag-hint><span aria-hidden="true">↗</span><b>Перетащи спутник на орбиту</b></div>') +
      "</div></section>";
  }

  function vostokCraftMarkup() {
    return '<span class="vostok-craft" aria-hidden="true">' +
      '<i class="vostok-craft__nose"></i><i class="vostok-craft__body"></i>' +
      '<i class="vostok-craft__window"></i><i class="vostok-craft__band"></i>' +
      '<i class="vostok-craft__engine"></i><i class="vostok-craft__flame"></i>' +
      '<b class="vostok-craft__label">ВОСТОК-1</b></span>';
  }

  function renderGagarinLearning(event, nextLabel) {
    app.innerHTML =
      '<section class="history-event-screen">' + '<div class="learning-heading"><span>Сейчас изучаем</span><strong>' + escapeHtml(learningTopic(event)) + '</strong></div>' +
      '<div class="history-scene history-scene--gagarin gagarin-orbit-scene" data-satellite-scene>' +
      '<img class="event-scene-photo event-scene-photo--gagarin" src="assets/gagarin-1961-color.png" alt="Юрий Гагарин в космическом шлеме">' +
      '<span class="event-scene-shade" aria-hidden="true"></span>' +
      '<span class="gagarin-earth" aria-hidden="true"></span>' +
      eventSceneTopMarkup(event) +
      '<div class="history-scene__copy"><span class="history-scene__year">' +
      event.year +
      '</span><h1>Гагарин в космосе</h1><p>Проведи «Восток-1» на орбиту Земли.</p></div>' +
      '<div class="gagarin-orbit" data-orbit-target aria-hidden="true"><span></span></div>' +
      (learningActionDone
        ? '<div class="gagarin-vostok-orbiting" aria-hidden="true">' + vostokCraftMarkup() + '</div>' + eventReinforcementMarkup(event, nextLabel)
        : '<button class="gagarin-vostok" type="button" data-satellite draggable="false" aria-label="Перетащи Восток-1 на орбиту">' + vostokCraftMarkup() + '</button><div class="gagarin-task" data-drag-hint><strong>Проведи «Восток-1»</strong><small>на светящуюся орбиту</small></div>') +
      '</div></section>';
  }

  function renderMoonLearning(event, nextLabel) {
    app.innerHTML =
      '<section class="history-event-screen">' + '<div class="learning-heading"><span>Сейчас изучаем</span><strong>' + escapeHtml(learningTopic(event)) + '</strong></div>' +
      '<div class="history-scene history-scene--moon' +
      (learningActionDone ? " is-complete" : "") +
      '">' +
      '<img class="event-scene-photo event-scene-photo--moon" src="' +
      escapeHtml(event.image) +
      '" alt="Астронавт и лунный модуль на поверхности Луны">' +
      '<span class="event-scene-shade" aria-hidden="true"></span>' +
      eventSceneTopMarkup(event) +
      '<div class="history-scene__copy"><span class="history-scene__year">' +
      event.year +
      "</span><h1>Человек на Луне</h1>" +
      "<p>Сделай первый шаг на лунной поверхности.</p></div>" +
      '<div class="lunar-footprint-trail" aria-hidden="true">' +
      [1,2,3,4].map(function (n) { return '<span class="lunar-footprint lunar-footprint--' + n + (moonFootprints >= n ? ' is-visible' : '') + '"><i></i></span>'; }).join('') +
      '</div>' +
      (learningActionDone
        ? eventReinforcementMarkup(event, nextLabel)
        : '<button class="moon-step-target moon-step-target--' + Math.min(moonFootprints + 1, 4) + '" data-action="leave-footprint" type="button"><span aria-hidden="true">↓</span><b>' + (moonFootprints === 0 ? 'Сделай первый след' : 'Сделай ещё след · ' + moonFootprints + '/4') + '</b></button>') +
      "</div></section>";
  }

  function renderLearning() {
    var event = era.events[learningIndex];
    var nextLabel =
      learningIndex === era.events.length - 1
        ? "Собрать линию времени"
        : "Следующая точка";

    if (event.visual === "satellite") {
      renderSatelliteLearning(event, nextLabel);
      return;
    }

    if (event.visual === "rocket") {
      renderGagarinLearning(event, nextLabel);
      return;
    }

    renderMoonLearning(event, nextLabel);
  }

  function isSatelliteOnOrbit(satellite, target) {
    var hitArea =
      satellite.querySelector(".sputnik-visual__sphere") || satellite;
    var satelliteRect = hitArea.getBoundingClientRect();
    var targetRect = target.getBoundingClientRect();
    var centerX = satelliteRect.left + satelliteRect.width / 2;
    var centerY = satelliteRect.top + satelliteRect.height / 2;
    var radiusX = targetRect.width / 2;
    var radiusY = targetRect.height / 2;
    var normalizedX =
      (centerX - (targetRect.left + radiusX)) / Math.max(radiusX, 1);
    var normalizedY =
      (centerY - (targetRect.top + radiusY)) / Math.max(radiusY, 1);
    var distance = normalizedX * normalizedX + normalizedY * normalizedY;
    return distance >= 0.38 && distance <= 1.72;
  }

  function completeSatelliteLesson() {
    if (learningActionDone) return;
    satelliteDrag = null;
    completeCurrentEvent();
  }

  function completeCurrentEvent() {
    if (learningActionDone) return;
    learningActionDone = true;
    storage.markStudied(era, era.events[learningIndex].id);
    render();
  }

  function startSatelliteDrag(event) {
    var satellite = event.target.closest("[data-satellite]");
    if (
      !satellite ||
      screen !== "learn" ||
      (learningIndex !== 0 && learningIndex !== 1) ||
      learningActionDone
    ) {
      return;
    }

    var scene = satellite.closest("[data-satellite-scene]");
    var satelliteRect = satellite.getBoundingClientRect();
    var sceneRect = scene.getBoundingClientRect();
    satelliteDrag = {
      pointerId: event.pointerId,
      satellite: satellite,
      scene: scene,
      target: scene.querySelector("[data-orbit-target]"),
      offsetX: event.clientX - satelliteRect.left,
      offsetY: event.clientY - satelliteRect.top,
      homeLeft: satelliteRect.left - sceneRect.left,
      homeTop: satelliteRect.top - sceneRect.top,
    };

    satellite.style.left = satelliteDrag.homeLeft + "px";
    satellite.style.top = satelliteDrag.homeTop + "px";
    satellite.style.right = "auto";
    satellite.style.bottom = "auto";
    satellite.classList.add("is-dragging");
    var dragHint = scene.querySelector("[data-drag-hint]");
    if (dragHint) dragHint.classList.add("is-dragging-now");
    satellite.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function moveSatellite(event) {
    if (!satelliteDrag || satelliteDrag.pointerId !== event.pointerId) return;
    var sceneRect = satelliteDrag.scene.getBoundingClientRect();
    var satelliteRect = satelliteDrag.satellite.getBoundingClientRect();
    var left = event.clientX - sceneRect.left - satelliteDrag.offsetX;
    var top = event.clientY - sceneRect.top - satelliteDrag.offsetY;
    left = Math.max(0, Math.min(left, sceneRect.width - satelliteRect.width));
    top = Math.max(0, Math.min(top, sceneRect.height - satelliteRect.height));

    satelliteDrag.satellite.style.left = left + "px";
    satelliteDrag.satellite.style.top = top + "px";
    satelliteDrag.scene.classList.toggle(
      "is-drop-ready",
      isSatelliteOnOrbit(satelliteDrag.satellite, satelliteDrag.target)
    );
    event.preventDefault();
  }

  function finishSatelliteDrag(event) {
    if (!satelliteDrag || satelliteDrag.pointerId !== event.pointerId) return;
    var drag = satelliteDrag;
    var isCorrect = isSatelliteOnOrbit(drag.satellite, drag.target);
    drag.scene.classList.remove("is-drop-ready");
    drag.satellite.classList.remove("is-dragging");

    if (isCorrect) {
      completeSatelliteLesson();
      return;
    }

    drag.satellite.classList.add("is-returning");
    drag.satellite.style.left = drag.homeLeft + "px";
    drag.satellite.style.top = drag.homeTop + "px";
    var hint = drag.scene.querySelector("[data-drag-hint]");
    if (hint) {
      hint.classList.add("is-reminding");
      hint.querySelector("small").textContent = "попади на светящуюся линию";
    }
    window.setTimeout(function () {
      if (!drag.satellite.isConnected) return;
      drag.satellite.classList.remove("is-returning");
      drag.satellite.removeAttribute("style");
    }, 380);
    satelliteDrag = null;
  }

  function renderTimeline() {
    var orderedEvents = era.events.slice().sort(function (first, next) {
      return first.year - next.year;
    });

    app.innerHTML =
      '<section class="panel timeline-screen">' +
      '<div class="section-heading"><p class="eyebrow">Маршрут восстановлен</p>' +
      "<h1>Как начиналась космическая эра</h1>" +
      "<p>Три события — от первого спутника до первого шага на Луне.</p></div>" +
      '<div class="timeline">' +
      orderedEvents
        .map(function (event, index) {
          return (
            '<article class="timeline-item timeline-item--flip' + (flippedCards[event.id] ? ' is-flipped' : '') + '" data-action="flip-card" data-event-id="' + event.id + '" tabindex="0" role="button" aria-label="Перевернуть карточку ' + escapeHtml(event.shortTitle) + '">' +
            '<div class="timeline-item__marker">' +
            event.year +
            "</div>" +
            eventTrainingImageMarkup(
              event,
              "timeline-item__visual"
            ) +
            "<h2>" + escapeHtml(event.shortTitle) + "</h2>" +
            '<p class="timeline-item__front">' + escapeHtml(index === 0 ? "Сначала — спутник." : index === 1 ? "Потом — человек в космосе." : "Затем — человек на Луне.") + '<small>Нажми — открой факт</small></p>' +
            '<p class="timeline-item__back"><b>Запомни:</b> ' + escapeHtml(event.visualFact || event.fact) + '<small>Нажми — верни карточку</small></p></article>' 
          );
        })
        .join('<span class="timeline-arrow" aria-hidden="true">→</span>') +
      "</div>" +
      '<div class="sequence-callout"><b>1957 → 1961 → 1969</b><span>Спутник → человек в космосе → человек на Луне</span></div>' +
      '<button class="button button--primary" data-action="show-training-intro" type="button">Дальше к тренировке <span aria-hidden="true">→</span></button>' +
      "</section>";
  }

  function renderTrainingIntro() {
    app.innerHTML =
      '<section class="panel training-intro-screen training-intro-screen--simple">' +
      '<p class="eyebrow">Следующий этап</p>' +
      '<h1>Тренировка</h1>' +
      '<p class="training-intro-lead">Проверим, что запомнилось после трёх событий.</p>' +
      '<div class="training-intro-route"><span>1957</span><i>→</i><span>1961</span><i>→</i><span>1969</span></div>' +
      '<button class="button button--primary button--large" data-action="start-training" type="button">Начать <span aria-hidden="true">→</span></button>' +
      '<small>Можно ошибаться — это тренировка.</small>' +
      '</section>';
  }

  function newTrainingQuestion() {
    var types = ["eventByYear", "earlier", "yearByEvent", "order"];
    var preferredId =
      training.priorityEventIds.length > 0
        ? training.priorityEventIds.shift()
        : null;
    var type = types[training.attempts % types.length];

    if (preferredId && type === "order") type = "yearByEvent";
    training.current = createQuestion(type, preferredId);
    if (training.current.type === "order") {
      training.current.prompt = "Расставьте события по порядку";
      training.current.orderIds = training.current.availableIds.slice();
      training.current.availableIds = [];
    }
    if (training.current.type === "earlier") {
      applyAllEventsEarlierQuestion(training.current);
    }
    training.feedback = null;
    training.attempts += 1;
  }

  function startTraining() {
    training = {
      correct: 0,
      target: 6,
      attempts: 0,
      priorityEventIds: [],
      current: null,
      feedback: null,
      completed: false,
    };
    newTrainingQuestion();
    screen = "training";
    render();
  }

  function optionEventFor(question, option) {
    if (question.type === "eventByYear" || question.type === "earlier") {
      return getEvent(option.value);
    }
    if (question.type === "yearByEvent") {
      return era.events.find(function (event) {
        return String(event.year) === String(option.value);
      });
    }
    return null;
  }

  function eventTrainingImageMarkup(event, wrapperClass) {
    var classes =
      wrapperClass +
      (event.id === "sputnik-1957" ? " static-1957-visual" : "");
    return (
      '<span class="' +
      classes +
      '"><img src="' +
      escapeHtml(event.image) +
      '" alt=""></span>'
    );
  }

  function trainingFocusMarkup(question) {
    return "";
  }

  function trainingOrderMarkup(question, feedback) {
    var cards = question.orderIds
      .map(function (eventId, index) {
        var event = getEvent(eventId);
        var stateClass = "";
        if (feedback && feedback.correct) stateClass = " is-correct";
        else if (feedback) stateClass = " is-locked";
        return (
          '<li class="order-drag__item">' +
          '<button class="order-drag__card' +
          stateClass +
          '" type="button" draggable="false" data-order-card data-index="' +
          index +
          '" ' +
          (feedback ? "disabled " : "") +
          'aria-label="' +
          escapeHtml(event.shortTitle) +
          ", позиция " +
          (index + 1) +
          ' из 3">' +
          eventTrainingImageMarkup(
            event,
            "order-drag__image order-drag__image--" + event.visual
          ) +
          '<span class="order-drag__title">' +
          escapeHtml(event.shortTitle) +
          "</span></button></li>"
        );
      })
      .join("");

    return (
      '<div class="order-drag-task">' +
      '<p class="visually-hidden" id="order-drag-help">Перетащите карточку на другую, чтобы поменять их местами. С клавиатуры используйте стрелки.</p>' +
      '<ul class="order-drag' +
      (feedback && feedback.correct ? " is-correct" : "") +
      '" aria-describedby="order-drag-help">' +
      cards +
      "</ul>" +
      (!feedback
        ? '<div class="order-drag-actions"><button class="button button--primary" type="button" data-action="submit-order">Проверить</button></div>'
        : "") +
      "</div>"
    );
  }

  function questionMarkup(question, feedback) {
    if (question.type === "order") {
      return trainingOrderMarkup(question, feedback);
    }

    var yearOnly = question.type === "yearByEvent";
    var pair = question.type === "earlier" && question.options.length === 2;
    return '<div class="answer-grid answer-grid--visual' + (yearOnly ? ' answer-grid--years' : '') + (pair ? ' answer-grid--pair' : '') + '">' +
      question.options.map(function (option) {
        var optionClass = "";
        var visualEvent = yearOnly ? null : optionEventFor(question, option);
        if (feedback && option.value === question.answer) optionClass = " is-correct";
        else if (feedback && option.value === feedback.selectedValue && !feedback.correct) optionClass = " is-wrong";
        return '<button class="answer-option answer-option--visual' + (yearOnly ? ' answer-option--year' : '') + optionClass + '" type="button" data-action="answer" data-value="' + escapeHtml(option.value) + '" ' + (feedback ? 'disabled' : '') + '>' +
          (visualEvent ? eventTrainingImageMarkup(visualEvent, 'answer-option__image') : '') +
          '<span class="answer-option__label">' + escapeHtml(option.label) + '</span></button>';
      }).join("") + '</div>';
  }

  function positiveReaction() {
    return "Верно!";
  }

  function feedbackMarkup(feedback, mode) {
    if (!feedback) return "";
    if (
      mode === "training" &&
      feedback.correct &&
      training.current &&
      (training.current.type === "order" || training.current.type === "earlier")
    ) {
      return (
        '<div class="order-success" role="status">' +
        "<p>Верно! ✓</p>" +
        '<button class="button button--primary" type="button" data-action="next-training">Дальше</button>' +
        "</div>"
      );
    }
    var nextAction = mode === "training" ? "next-training" : "next-challenge";
    return (
      '<div class="feedback ' +
      (feedback.correct ? "feedback--correct" : "feedback--explain") +
      '" role="status">' +
      (feedback.correct ? '<span class="success-burst" aria-hidden="true"><i>★</i><i>✦</i><i>★</i><i>✦</i><i>★</i><i>✦</i></span>' : "") +
      '<span class="feedback__icon">' +
      (feedback.correct ? "✓" : "↺") +
      "</span><div><h3>" +
      (feedback.correct ? positiveReaction() : "Разберём этот шаг") +
      "</h3><p>" +
      escapeHtml(feedback.message) +
      "</p></div>" +
      '<button class="button button--compact" type="button" data-action="' +
      nextAction +
      '">' +
      (feedback.correct ? "Дальше" : "Запомнил, дальше") +
      " →</button></div>"
    );
  }

  function renderTraining() {
    if (training.completed) {
      app.innerHTML =
        '<section class="panel completion-panel">' +
        '<div class="completion-icon" aria-hidden="true">◇</div>' +
        '<p class="eyebrow">Маршрут закреплён</p>' +
        "<h1>Ты готов к испытанию</h1>" +
        "<p>В тренировке ошибки помогали учиться. Теперь начинается отдельная миссия с тремя жизнями.</p>" +
        '<div class="challenge-rules"><span>5 заданий</span><span>3 жизни</span><span>1 балл за верный ответ</span></div>' +
        '<button class="button button--primary button--large" type="button" data-action="start-challenge">Начать испытание <span aria-hidden="true">→</span></button>' +
        "</section>";
      return;
    }

    var question = training.current;
    var isOrder = question.type === "order";
    var isEarlier = question.type === "earlier";
    app.innerHTML =
      '<section class="quiz-layout quiz-layout--simple' +
      (isOrder ? " quiz-layout--order" : "") +
      (isEarlier ? " quiz-layout--earlier" : "") +
      '">' +
      '<div class="question-card panel"><div class="training-head"><p class="eyebrow">Тренировка</p>' +
      '<div class="training-progress" aria-label="Прогресс тренировки"><span>' +
      training.correct +
      " из " +
      training.target +
      '</span><div class="training-meter"><i style="width:' +
      (training.correct / training.target) * 100 +
      '%"></i></div></div></div>' +
      (isOrder
        ? ""
        : '<span class="question-type">' +
          questionTypeLabel(question.type) +
          "</span>") +
      trainingFocusMarkup(question) +
      "<h1>" +
      escapeHtml(question.prompt) +
      "</h1>" +
      (isOrder
        ? '<p class="order-lead">От самого раннего к самому позднему</p>'
        : "") +
      questionMarkup(question, training.feedback) +
      feedbackMarkup(training.feedback, "training") +
      "</div></section>";
  }

  function weakEventsMarkup() {
    var weak = era.events.filter(function (event) {
      return eventStats(event.id).needsRepeat;
    });
    if (weak.length === 0) {
      return '<p class="adaptive-note"><span>✦</span> Маршрут пока усваивается равномерно.</p>';
    }
    return (
      '<div class="adaptive-note"><span>↺</span><div><small>Повторяем чаще</small><b>' +
      weak
        .map(function (event) {
          return event.year;
        })
        .join(", ") +
      "</b></div></div>"
    );
  }

  function questionTypeLabel(type) {
    return {
      eventByYear: "Событие по году",
      yearByEvent: "Год по событию",
      earlier: "Что было раньше",
      order: "Последовательность",
    }[type];
  }

  function mistakenEventIds(question) {
    if (question.type !== "order") return question.relatedEventIds;
    return question.orderIds.filter(function (eventId, index) {
      return question.correctOrder[index] !== eventId;
    });
  }

  function answerTraining(selectedValue) {
    if (training.feedback) return;
    var question = training.current;
    var isCorrect =
      question.type === "order"
        ? question.orderIds.join("|") === question.correctOrder.join("|")
        : selectedValue === question.answer;

    if (isCorrect) {
      training.correct += 1;
      storage.recordSuccess(era, question.relatedEventIds);
    } else {
      var eventIds = mistakenEventIds(question);
      storage.recordMistake(era, eventIds);
      eventIds.forEach(function (eventId) {
        training.priorityEventIds.push(eventId, eventId);
      });
    }

    training.feedback = {
      correct: isCorrect,
      selectedValue: selectedValue,
      message: isCorrect
        ? explanationFor(question)
        : explanationFor(question) +
          " Это событие ещё встретится, чтобы знание закрепилось.",
    };
    render();
  }

  function applyAllEventsEarlierQuestion(question) {
    var earliest = era.events.slice().sort(function (first, next) {
      return first.year - next.year;
    })[0];
    question.prompt = "Что произошло раньше всего?";
    question.options = shuffle(
      era.events.map(function (event) {
        return { value: event.id, label: event.shortTitle };
      })
    );
    question.answer = earliest.id;
    question.relatedEventIds = [earliest.id];
    question.focusEventId = earliest.id;
    question.comparedEventIds = era.events.map(function (event) {
      return event.id;
    });
  }

  function startChallenge() {
    challenge = {
      round: 1,
      total: 5,
      lives: 3,
      score: 0,
      current: null,
      feedback: null,
    };
    newChallengeQuestion();
    screen = "challenge";
    render();
  }

  function newChallengeQuestion() {
    var types = [
      "eventByYear",
      "yearByEvent",
      "earlier",
      "eventByYear",
      "order",
    ];
    challenge.current = createQuestion(types[challenge.round - 1]);
    if (challenge.current.type === "order") {
      challenge.current.orderIds = challenge.current.availableIds.slice();
      challenge.current.availableIds = [];
    }
    if (challenge.current.type === "earlier") {
      applyAllEventsEarlierQuestion(challenge.current);
    }
    challenge.feedback = null;
  }

  function livesMarkup() {
    return [1, 2, 3]
      .map(function (life) {
        return (
          '<span class="life ' +
          (life <= challenge.lives ? "is-full" : "is-lost") +
          '" aria-label="' +
          (life <= challenge.lives ? "Жизнь сохранена" : "Жизнь потеряна") +
          '">◆</span>'
        );
      })
      .join("");
  }

  function renderChallenge() {
    var isOrder = challenge.current.type === "order";
    var isEarlier = challenge.current.type === "earlier";
    app.innerHTML =
      '<section class="quiz-layout quiz-layout--challenge-clean' +
      (isOrder ? " quiz-layout--order" : "") +
      (isEarlier ? " quiz-layout--earlier" : "") +
      '">' +
      '<div class="question-card panel"><div class="challenge-head">' +
      '<div><p class="eyebrow">Финальное испытание</p><strong>Задание ' +
      challenge.round + " из " + challenge.total + '</strong></div>' +
      '<div class="challenge-compact-status"><span>Баллы <b>' + challenge.score +
      '</b></span><span class="lives" aria-label="Осталось жизней: ' + challenge.lives + '">' +
      livesMarkup() + '</span></div></div>' +
      '<span class="question-type">' + questionTypeLabel(challenge.current.type) +
      '</span><h1>' + escapeHtml(challenge.current.prompt) + '</h1>' +
      (isOrder
        ? '<p class="order-lead">От самого раннего к самому позднему</p>'
        : "") +
      questionMarkup(challenge.current, challenge.feedback) +
      feedbackMarkup(challenge.feedback, "challenge") +
      '</div></section>';
  }

  function answerChallenge(selectedValue) {
    if (challenge.feedback) return;
    var question = challenge.current;
    var isCorrect =
      question.type === "order"
        ? question.orderIds.join("|") === question.correctOrder.join("|")
        : selectedValue === question.answer;

    if (isCorrect) {
      challenge.score += 1;
      storage.recordSuccess(era, question.relatedEventIds);
    } else {
      challenge.lives -= 1;
      storage.recordMistake(era, mistakenEventIds(question));
    }

    challenge.feedback = {
      correct: isCorrect,
      selectedValue: selectedValue,
      message: isCorrect
        ? "Точно! " + explanationFor(question)
        : explanationFor(question) + " Сохрани эту связь для следующей попытки.",
    };
    render();
  }

  function nextChallengeStep() {
    if (challenge.lives <= 0) {
      storage.saveFinalResult(era, challenge.score, 0);
      screen = "challenge-failed";
      render();
      return;
    }
    if (challenge.round >= challenge.total) {
      storage.completeFinal(era, challenge.score, 0);
      screen = "reward";
      render();
      return;
    }
    challenge.round += 1;
    newChallengeQuestion();
    render();
  }

  function renderChallengeFailed() {
    app.innerHTML =
      '<section class="panel completion-panel completion-panel--retry">' +
      '<div class="completion-icon" aria-hidden="true">↺</div>' +
      '<p class="eyebrow">Сигнал потерян, но маршрут сохранён</p>' +
      "<h1>Попробуем ещё раз</h1>" +
      "<p>Ты уже знаешь правильные связи. Ошибочные события отмечены и будут чаще появляться в тренировке.</p>" +
      '<div class="result-strip"><span><small>Результат</small><b>' +
      challenge.score +
      " из " + challenge.total +
      "</b></span></div>" +
      '<div class="button-row"><button class="button button--secondary" data-action="start-training" type="button">Вернуться к тренировке</button>' +
      '<button class="button button--primary" data-action="start-challenge" type="button">Повторить испытание</button></div>' +
      "</section>";
  }

  function renderReward() {
    var progress = storage.getEra(era);
    app.innerHTML =
      '<section class="reward-screen">' +
      '<div class="reward-result"><b>Экспедиция завершена ✓</b><span>' + progress.bestScore + ' из 5</span></div>' +
      '<div class="album-section"><div class="section-heading"><p class="eyebrow">Альбом времени</p>' +
      "<h2>Открыты три карточки</h2></div>" +
      '<div class="album-grid">' +
      era.events
        .map(function (event) {
          return (
            '<article class="album-card album-card--' +
            event.visual +
            '">' +
            eventTrainingImageMarkup(event, "album-card__visual") +
            '<div class="album-card__content"><span class="album-card__year">' + event.year +
            '</span><h3>' + escapeHtml(event.shortTitle) + '</h3><p>' + escapeHtml(event.fact) +
            '</p><span class="album-card__status">Открыто ✓</span></div></article>' 
          );
        })
        .join("") +
      "</div></div>" +
      '<div class="reward-actions"><button class="button button--secondary" data-action="revisit" type="button">Пройти эпоху ещё раз</button></div>' +
      "</section>";
  }

  function resetEraPlaythrough() {
    storage.resetEra(era);
    learningIndex = 0;
    learningActionDone = false;
    launchStep = 0;
    moonFootprints = 0;
    flippedCards = {};
    training = null;
    challenge = null;
    satelliteDrag = null;
    orderDrag = null;
  }

  function continueFromIntro() {
    var progress = storage.getEra(era);
    if (progress.finalComplete) {
      screen = "reward";
    } else if (progress.studiedEventIds.length < era.events.length) {
      learningIndex = progress.studiedEventIds.length;
      learningActionDone = false;
      screen = "learn";
    } else if (!progress.timelineSeen) {
      screen = "timeline";
    } else if (!progress.trainingComplete) {
      startTraining();
      return;
    } else {
      startChallenge();
      return;
    }
    render();
  }

  function activeOrderState() {
    if (screen === "training") return training;
    if (screen === "challenge") return challenge;
    return null;
  }

  function canDragTrainingOrder() {
    var state = activeOrderState();
    return !!(
      state &&
      !state.feedback &&
      state.current &&
      state.current.type === "order"
    );
  }

  function swapTrainingOrder(fromIndex, toIndex) {
    if (!canDragTrainingOrder()) return;
    var ids = activeOrderState().current.orderIds;
    if (
      fromIndex === toIndex ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= ids.length ||
      toIndex >= ids.length
    ) {
      return;
    }
    var moved = ids[fromIndex];
    ids[fromIndex] = ids[toIndex];
    ids[toIndex] = moved;
    render();
    var nextCard = app.querySelector(
      '[data-order-card][data-index="' + toIndex + '"]'
    );
    if (nextCard) nextCard.focus();
  }

  function orderCardFromPoint(x, y) {
    var node = document.elementFromPoint(x, y);
    return node ? node.closest("[data-order-card]") : null;
  }

  function updateOrderDropTarget(x, y) {
    var over = orderCardFromPoint(x, y);
    var overIndex = over ? Number(over.dataset.index) : -1;
    app.querySelectorAll("[data-order-card]").forEach(function (card) {
      card.classList.toggle(
        "is-drop-target",
        Number(card.dataset.index) === overIndex &&
          overIndex !== orderDrag.fromIndex
      );
    });
    orderDrag.overIndex = overIndex;
  }

  function clearOrderDrag() {
    if (!orderDrag) return;
    window.removeEventListener("pointermove", moveOrderDrag);
    window.removeEventListener("pointerup", finishOrderDrag);
    window.removeEventListener("pointercancel", finishOrderDrag);
    if (orderDrag.ghost && orderDrag.ghost.parentNode) {
      orderDrag.ghost.parentNode.removeChild(orderDrag.ghost);
    }
    if (orderDrag.card && orderDrag.card.isConnected) {
      orderDrag.card.classList.remove("is-origin");
      if (orderDrag.captured) {
        try {
          orderDrag.card.releasePointerCapture(orderDrag.pointerId);
        } catch (error) {
          /* pointer already released */
        }
      }
    }
    app.querySelectorAll("[data-order-card]").forEach(function (card) {
      card.classList.remove("is-drop-target");
    });
    document.body.classList.remove("is-order-dragging");
    orderDrag = null;
  }

  function startOrderDrag(event) {
    if (!canDragTrainingOrder() || (event.button && event.button !== 0)) return;
    var card = event.target.closest("[data-order-card]");
    if (!card || card.disabled) return;

    var rect = card.getBoundingClientRect();
    orderDrag = {
      pointerId: event.pointerId,
      card: card,
      fromIndex: Number(card.dataset.index),
      overIndex: Number(card.dataset.index),
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      width: rect.width,
      height: rect.height,
      moved: false,
      captured: false,
      ghost: null,
    };
    window.addEventListener("pointermove", moveOrderDrag, { passive: false });
    window.addEventListener("pointerup", finishOrderDrag);
    window.addEventListener("pointercancel", finishOrderDrag);
  }

  function moveOrderDrag(event) {
    if (!orderDrag || orderDrag.pointerId !== event.pointerId) return;
    var dx = event.clientX - orderDrag.startX;
    var dy = event.clientY - orderDrag.startY;
    if (!orderDrag.moved) {
      if (dx * dx + dy * dy < 36) return;
      orderDrag.moved = true;
      document.body.classList.add("is-order-dragging");
      orderDrag.ghost = orderDrag.card.cloneNode(true);
      orderDrag.card.classList.add("is-origin");
      orderDrag.ghost.removeAttribute("data-order-card");
      orderDrag.ghost.removeAttribute("data-index");
      orderDrag.ghost.setAttribute("aria-hidden", "true");
      orderDrag.ghost.tabIndex = -1;
      orderDrag.ghost.classList.add("order-drag__ghost");
      orderDrag.ghost.classList.remove("is-origin", "is-drop-target");
      orderDrag.ghost.style.width = orderDrag.width + "px";
      orderDrag.ghost.style.height = orderDrag.height + "px";
      document.body.appendChild(orderDrag.ghost);
      try {
        orderDrag.card.setPointerCapture(event.pointerId);
        orderDrag.captured = true;
      } catch (error) {
        orderDrag.captured = false;
      }
    }

    event.preventDefault();
    orderDrag.ghost.style.left = event.clientX - orderDrag.offsetX + "px";
    orderDrag.ghost.style.top = event.clientY - orderDrag.offsetY + "px";
    updateOrderDropTarget(event.clientX, event.clientY);
  }

  function finishOrderDrag(event) {
    if (!orderDrag || orderDrag.pointerId !== event.pointerId) return;
    var fromIndex = orderDrag.fromIndex;
    var overIndex = orderDrag.moved ? orderDrag.overIndex : -1;
    var shouldSwap = orderDrag.moved && overIndex >= 0 && overIndex !== fromIndex;
    clearOrderDrag();
    if (shouldSwap) swapTrainingOrder(fromIndex, overIndex);
  }

  app.addEventListener("click", function (event) {
    var control = event.target.closest("[data-action]");
    if (!control) return;
    var action = control.dataset.action;

    if (action === "start") {
      resetEraPlaythrough();
      screen = "learn";
      render();
      return;
    }

    if (action === "continue") {
      continueFromIntro();
      return;
    }

    if (action === "activate-event") {
      learningActionDone = true;
      storage.markStudied(era, era.events[learningIndex].id);
      showToast("Событие добавлено в маршрут");
      render();
    }

    if (action === "launch-step") {
      var stepIndex = Number(control.dataset.index);
      var currentEvent = era.events[learningIndex];
      if (stepIndex !== launchStep || learningActionDone) return;
      launchStep += 1;
      if (launchStep >= currentEvent.action.steps.length) {
        completeCurrentEvent();
      } else {
        render();
      }
    }

    if (action === "leave-footprint") {
      if (learningActionDone) return;
      moonFootprints += 1;
      if (moonFootprints >= 4) {
        completeCurrentEvent();
      } else {
        render();
      }
    }

    if (action === "next-event") {
      if (learningIndex < era.events.length - 1) {
        learningIndex += 1;
        learningActionDone = false;
        launchStep = 0;
        moonFootprints = 0;
      } else {
        screen = "timeline";
      }
      render();
    }

    if (action === "flip-card") {
      var eventId = control.dataset.eventId;
      flippedCards[eventId] = !flippedCards[eventId];
      render();
    }

    if (action === "show-training-intro") {
      storage.markTimelineSeen(era);
      screen = "training-intro";
      render();
    }

    if (action === "start-training") {
      storage.markTimelineSeen(era);
      startTraining();
    }

    if (action === "answer") {
      if (screen === "training") answerTraining(control.dataset.value);
      if (screen === "challenge") answerChallenge(control.dataset.value);
    }

    if (action === "add-order") {
      var orderState = screen === "training" ? training : challenge;
      if (orderState.feedback || orderState.current.orderIds.length >= 3) return;
      var pickedId = control.dataset.eventId;
      orderState.current.orderIds.push(pickedId);
      orderState.current.availableIds = orderState.current.availableIds.filter(function (id) { return id !== pickedId; });
      render();
    }

    if (action === "remove-order") {
      var removeState = screen === "training" ? training : challenge;
      if (removeState.feedback) return;
      var removeIndex = Number(control.dataset.index);
      var removedId = removeState.current.orderIds.splice(removeIndex, 1)[0];
      removeState.current.availableIds.push(removedId);
      render();
    }

    if (action === "move-order") {
      var state = screen === "training" ? training : challenge;
      if (state.feedback) return;
      var index = Number(control.dataset.index);
      var targetIndex = index + Number(control.dataset.direction);
      var ids = state.current.orderIds;
      var item = ids[index];
      ids[index] = ids[targetIndex];
      ids[targetIndex] = item;
      render();
    }

    if (action === "submit-order") {
      if (screen === "training") answerTraining("order");
      if (screen === "challenge") answerChallenge("order");
    }

    if (action === "next-training") {
      if (training.correct >= training.target) {
        training.completed = true;
        storage.markTrainingComplete(era);
      } else {
        newTrainingQuestion();
      }
      render();
    }

    if (action === "start-challenge") startChallenge();
    if (action === "next-challenge") nextChallengeStep();

    if (action === "revisit") {
      resetEraPlaythrough();
      screen = "learn";
      render();
    }
  });

  app.addEventListener("pointerdown", startSatelliteDrag);
  app.addEventListener("pointerdown", startOrderDrag);
  app.addEventListener("pointermove", moveSatellite);
  app.addEventListener("pointerup", finishSatelliteDrag);
  app.addEventListener("pointercancel", finishSatelliteDrag);
  app.addEventListener("keydown", function (event) {
    var orderCard = event.target.closest("[data-order-card]");
    if (orderCard && canDragTrainingOrder()) {
      var index = Number(orderCard.dataset.index);
      var nextIndex = index;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        nextIndex = index + 1;
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        nextIndex = index - 1;
      } else {
        nextIndex = -1;
      }
      if (
        nextIndex >= 0 &&
        nextIndex < activeOrderState().current.orderIds.length
      ) {
        event.preventDefault();
        swapTrainingOrder(index, nextIndex);
      }
      return;
    }
    var flipCard = event.target.closest("[data-action=\"flip-card\"]");
    if (flipCard && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      flippedCards[flipCard.dataset.eventId] = !flippedCards[flipCard.dataset.eventId];
      render();
      return;
    }
    if (
      event.target.closest("[data-satellite]") &&
      (event.key === "Enter" || event.key === " ")
    ) {
      event.preventDefault();
      completeSatelliteLesson();
    }
  });

  document.querySelector(".brand").addEventListener("click", function (event) {
    event.preventDefault();
    screen = "intro";
    render();
  });

  document
    .getElementById("reset-progress")
    .addEventListener("click", function () {
      var shouldReset = window.confirm(
        "Сбросить изученные события, очки и награды этой игры?"
      );
      if (!shouldReset) return;
      storage.reset();
      screen = "intro";
      learningIndex = 0;
      learningActionDone = false;
      training = null;
      challenge = null;
      showToast("Прогресс сброшен");
      render();
    });

  if (window.location.hash === "#1957") {
    screen = "learn";
    learningIndex = 0;
    learningActionDone = false;
  }

  preloadEventImages();
  render();
})();
