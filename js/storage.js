(function () {
  "use strict";

  var STORAGE_KEY = "chronosphere.progress.v1";

  function emptyState() {
    return {
      version: 1,
      eras: {},
    };
  }

  function load() {
    try {
      var saved = window.localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : emptyState();
    } catch (error) {
      console.warn("Не удалось прочитать сохранение:", error);
      return emptyState();
    }
  }

  var state = load();

  function save() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn("Не удалось сохранить прогресс:", error);
    }
  }

  function ensureEra(era) {
    if (!state.eras[era.id]) {
      state.eras[era.id] = {
        studiedEventIds: [],
        timelineSeen: false,
        trainingComplete: false,
        finalComplete: false,
        badgeUnlocked: false,
        albumEventIds: [],
        bestScore: 0,
        bestStreak: 0,
        eventStats: {},
      };
    }

    era.events.forEach(function (event) {
      if (!state.eras[era.id].eventStats[event.id]) {
        state.eras[era.id].eventStats[event.id] = {
          errors: 0,
          needsRepeat: false,
          correctAfterError: 0,
        };
      }
    });

    return state.eras[era.id];
  }

  function updateEra(era, updater) {
    var progress = ensureEra(era);
    updater(progress);
    save();
    return progress;
  }

  window.GameStorage = {
    getEra: function (era) {
      return ensureEra(era);
    },

    markStudied: function (era, eventId) {
      return updateEra(era, function (progress) {
        if (!progress.studiedEventIds.includes(eventId)) {
          progress.studiedEventIds.push(eventId);
        }
      });
    },

    markTimelineSeen: function (era) {
      return updateEra(era, function (progress) {
        progress.timelineSeen = true;
      });
    },

    markTrainingComplete: function (era) {
      return updateEra(era, function (progress) {
        progress.trainingComplete = true;
      });
    },

    recordMistake: function (era, eventIds) {
      return updateEra(era, function (progress) {
        Array.from(new Set(eventIds)).forEach(function (eventId) {
          var stats = progress.eventStats[eventId];
          if (!stats) return;
          stats.errors += 1;
          stats.needsRepeat = true;
          stats.correctAfterError = 0;
        });
      });
    },

    recordSuccess: function (era, eventIds) {
      return updateEra(era, function (progress) {
        Array.from(new Set(eventIds)).forEach(function (eventId) {
          var stats = progress.eventStats[eventId];
          if (!stats || !stats.needsRepeat) return;
          stats.correctAfterError += 1;
          if (stats.correctAfterError >= 2) {
            stats.needsRepeat = false;
          }
        });
      });
    },

    completeFinal: function (era, score, streak) {
      return updateEra(era, function (progress) {
        progress.finalComplete = true;
        progress.badgeUnlocked = true;
        progress.albumEventIds = era.events.map(function (event) {
          return event.id;
        });
        progress.bestScore = Math.max(progress.bestScore, score);
        progress.bestStreak = Math.max(progress.bestStreak, streak);
      });
    },

    saveFinalResult: function (era, score, streak) {
      return updateEra(era, function (progress) {
        progress.bestScore = Math.max(progress.bestScore, score);
        progress.bestStreak = Math.max(progress.bestStreak, streak);
      });
    },

    reset: function () {
      state = emptyState();
      save();
    },

    resetEra: function (era) {
      state.eras[era.id] = {
        studiedEventIds: [],
        timelineSeen: false,
        trainingComplete: false,
        finalComplete: false,
        badgeUnlocked: false,
        albumEventIds: [],
        bestScore: 0,
        bestStreak: 0,
        eventStats: {},
      };
      var progress = ensureEra(era);
      save();
      return progress;
    },
  };
})();
