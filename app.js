"use strict";

(function () {
  var STORAGE_KEY = "flashcards_v1";

  /**
   * @typedef {Object} Card
   * @property {number} id
   * @property {string} front
   * @property {string} back
   * @property {number} createdAt
   * @property {number} updatedAt
   * @property {number} interval
   * @property {number} ease
   * @property {number} streak
   * @property {number} dueAt
   */

  /** @type {Card[]} */
  var cards = [];

  var currentIndex = 0;
  var showingFront = true;
  var editingCardId = null;
  var currentMode = "manage";

  /** DOM elements */
  var manageTab = document.getElementById("manageTab");
  var studyTab = document.getElementById("studyTab");
  var manageSection = document.getElementById("manageSection");
  var studySection = document.getElementById("studySection");

  var cardForm = document.getElementById("cardForm");
  var frontInput = document.getElementById("frontInput");
  var backInput = document.getElementById("backInput");
  var submitButton = document.getElementById("submitButton");
  var cancelEditButton = document.getElementById("cancelEditButton");

  var cardsList = document.getElementById("cardsList");
  var noCardsMessage = document.getElementById("noCardsMessage");

  var importFileInput = document.getElementById("importFile");
  var importButton = document.getElementById("importButton");
  var exportButton = document.getElementById("exportButton");

  var studyEmptyMessage = document.getElementById("studyEmptyMessage");
  var studyContent = document.getElementById("studyContent");
  var cardSideLabel = document.getElementById("cardSideLabel");
  var cardText = document.getElementById("cardText");
  var toggleSideButton = document.getElementById("toggleSideButton");
  var nextCardButton = document.getElementById("nextCardButton");

  function init() {
    cards = loadCards();

    attachEventListeners();
    setMode("manage");
    renderCardList();
    resetStudyState();
    renderStudyCard();
  }

  function attachEventListeners() {
    if (manageTab) {
      manageTab.addEventListener("click", function () {
        setMode("manage");
      });
    }
    if (studyTab) {
      studyTab.addEventListener("click", function () {
        setMode("study");
      });
    }

    if (cardForm) {
      cardForm.addEventListener("submit", function (event) {
        event.preventDefault();
        handleFormSubmit();
      });
    }

    if (cancelEditButton) {
      cancelEditButton.addEventListener("click", function () {
        exitEditMode();
      });
    }

    if (toggleSideButton) {
      toggleSideButton.addEventListener("click", function () {
        toggleCardSide();
      });
    }

    if (nextCardButton) {
      nextCardButton.addEventListener("click", function () {
        goToNextCard();
      });
    }

    if (importButton && importFileInput) {
      importButton.addEventListener("click", function () {
        handleImportClick();
      });
    }

    if (exportButton) {
      exportButton.addEventListener("click", function () {
        exportDeckAsCsv();
      });
    }

    document.addEventListener("keydown", handleGlobalKeyDown);
  }

  function loadCards() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return [];
      }
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed;
    } catch (error) {
      console.warn("Failed to load cards from localStorage:", error);
      return [];
    }
  }

  function saveCards() {
    try {
      var raw = JSON.stringify(cards);
      window.localStorage.setItem(STORAGE_KEY, raw);
    } catch (error) {
      console.warn("Failed to save cards to localStorage:", error);
    }
  }

  function createCard(front, back) {
    var timestamp = Date.now();
    /** @type {Card} */
    var card = {
      id: timestamp,
      front: front,
      back: back,
      createdAt: timestamp,
      updatedAt: timestamp,
      interval: 1,
      ease: 2.5,
      streak: 0,
      dueAt: timestamp
    };
    cards.push(card);
    saveCards();
    return card;
  }

  function updateCard(id, updates) {
    var found = false;
    for (var i = 0; i < cards.length; i += 1) {
      if (cards[i].id === id) {
        cards[i] = Object.assign({}, cards[i], updates, {
          updatedAt: Date.now()
        });
        found = true;
        break;
      }
    }
    if (found) {
      saveCards();
    }
  }

  function deleteCard(id) {
    var next = [];
    for (var i = 0; i < cards.length; i += 1) {
      if (cards[i].id !== id) {
        next.push(cards[i]);
      }
    }
    cards = next;
    saveCards();
    if (currentIndex >= cards.length) {
      currentIndex = 0;
    }
    if (cards.length === 0) {
      showingFront = true;
    }
  }

  function replaceAllCards(newCards) {
    cards = newCards;
    saveCards();
    resetStudyState();
    renderCardList();
    renderStudyCard();
  }

  function setMode(mode) {
    var isManage = mode === "manage";
    currentMode = isManage ? "manage" : "study";

    if (manageTab && studyTab) {
      manageTab.classList.toggle("active", isManage);
      studyTab.classList.toggle("active", !isManage);
    }

    if (manageSection && studySection) {
      manageSection.classList.toggle("hidden", !isManage);
      studySection.classList.toggle("hidden", isManage);
    }
  }

  function handleGlobalKeyDown(event) {
    if (currentMode !== "study") {
      return;
    }
    if (event.defaultPrevented) {
      return;
    }
    if (event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }

    var target = event.target;
    if (target && target.tagName) {
      var tag = target.tagName.toUpperCase();
      if (tag === "TEXTAREA" || tag === "INPUT") {
        return;
      }
      if (tag === "BUTTON") {
        return;
      }
    }

    var key = event.key;
    if (key === " " || key === "Spacebar") {
      event.preventDefault();
      toggleCardSide();
    } else if (key === "Enter") {
      event.preventDefault();
      goToNextCard();
    }
  }

  function handleFormSubmit() {
    var front = frontInput ? frontInput.value.trim() : "";
    var back = backInput ? backInput.value.trim() : "";

    if (!front || !back) {
      return;
    }

    if (editingCardId != null) {
      updateCard(editingCardId, { front: front, back: back });
    } else {
      createCard(front, back);
    }

    renderCardList();
    resetStudyState();
    renderStudyCard();
    exitEditMode();

    if (frontInput) {
      frontInput.focus();
    }
  }

  function enterEditMode(card) {
    editingCardId = card.id;
    if (frontInput) {
      frontInput.value = card.front;
    }
    if (backInput) {
      backInput.value = card.back;
    }
    if (submitButton) {
      submitButton.textContent = "Save Changes";
    }
    if (cancelEditButton) {
      cancelEditButton.classList.remove("hidden");
    }
  }

  function exitEditMode() {
    editingCardId = null;
    if (cardForm) {
      cardForm.reset();
    }
    if (submitButton) {
      submitButton.textContent = "Add Card";
    }
    if (cancelEditButton) {
      cancelEditButton.classList.add("hidden");
    }
  }

  function renderCardList() {
    if (!cardsList || !noCardsMessage) {
      return;
    }

    while (cardsList.firstChild) {
      cardsList.removeChild(cardsList.firstChild);
    }

    if (cards.length === 0) {
      noCardsMessage.classList.remove("hidden");
      return;
    }

    noCardsMessage.classList.add("hidden");

    for (var i = 0; i < cards.length; i += 1) {
      var card = cards[i];
      var li = document.createElement("li");
      li.className = "card-row";

      var texts = document.createElement("div");
      texts.className = "card-texts";

      var frontEl = document.createElement("div");
      frontEl.className = "card-front";
      frontEl.innerHTML = "<strong>Front:</strong> " + escapeHtml(card.front);

      var backEl = document.createElement("div");
      backEl.className = "card-back";
      backEl.innerHTML = "<strong>Back:</strong> " + escapeHtml(card.back);

      texts.appendChild(frontEl);
      texts.appendChild(backEl);

      var meta = document.createElement("div");
      meta.className = "card-meta";

      var count = document.createElement("div");
      count.className = "card-count";
      count.textContent = "Card " + (i + 1) + " of " + cards.length;

      var actions = document.createElement("div");
      actions.className = "card-actions";

      var editButton = document.createElement("button");
      editButton.type = "button";
      editButton.className = "edit-button";
      editButton.textContent = "Edit";
      editButton.addEventListener(
        "click",
        (function (cardCopy) {
          return function () {
            enterEditMode(cardCopy);
          };
        })(card)
      );

      var deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "delete-button";
      deleteButton.textContent = "Delete";
      deleteButton.addEventListener(
        "click",
        (function (id) {
          return function () {
            deleteCard(id);
            renderCardList();
            resetStudyState();
            renderStudyCard();
          };
        })(card.id)
      );

      actions.appendChild(editButton);
      actions.appendChild(deleteButton);

      meta.appendChild(count);
      meta.appendChild(actions);

      li.appendChild(texts);
      li.appendChild(meta);

      cardsList.appendChild(li);
    }
  }

  function resetStudyState() {
    currentIndex = 0;
    showingFront = true;
  }

  function renderStudyCard() {
    if (!studyEmptyMessage || !studyContent || !cardSideLabel || !cardText || !toggleSideButton || !nextCardButton) {
      return;
    }

    if (cards.length === 0) {
      studyEmptyMessage.classList.remove("hidden");
      studyContent.classList.add("hidden");
      toggleSideButton.disabled = true;
      nextCardButton.disabled = true;
      return;
    }

    if (currentIndex >= cards.length) {
      currentIndex = 0;
    }

    var card = cards[currentIndex];

    studyEmptyMessage.classList.add("hidden");
    studyContent.classList.remove("hidden");
    toggleSideButton.disabled = false;
    nextCardButton.disabled = false;

    cardSideLabel.textContent = showingFront ? "Front" : "Back";
    cardText.textContent = showingFront ? card.front : card.back;
    toggleSideButton.textContent = showingFront ? "Show Answer" : "Show Question";
  }

  function toggleCardSide() {
    if (cards.length === 0) {
      return;
    }
    showingFront = !showingFront;
    renderStudyCard();
  }

  function goToNextCard() {
    if (cards.length === 0) {
      return;
    }
    currentIndex = (currentIndex + 1) % cards.length;
    showingFront = true;
    renderStudyCard();
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function cardsToCsvRows() {
    var rows = [];
    rows.push(["front", "back"]);
    for (var i = 0; i < cards.length; i += 1) {
      rows.push([cards[i].front, cards[i].back]);
    }
    return rows;
  }

  function serializeCsv(rows) {
    var out = [];
    for (var i = 0; i < rows.length; i += 1) {
      var cols = rows[i];
      var encoded = [];
      for (var j = 0; j < cols.length; j += 1) {
        encoded.push(encodeCsvField(cols[j]));
      }
      out.push(encoded.join(","));
    }
    return out.join("\r\n");
  }

  function encodeCsvField(value) {
    var text = String(value == null ? "" : value);
    var needsQuote = /[",\r\n]/.test(text);
    if (needsQuote) {
      var escaped = text.replace(/"/g, '""');
      return '"' + escaped + '"';
    }
    return text;
  }

  function exportDeckAsCsv() {
    if (!cards || cards.length === 0) {
      window.alert("There are no cards to export yet.");
      return;
    }
    var rows = cardsToCsvRows();
    var csvString = serializeCsv(rows);
    var blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    var url = window.URL.createObjectURL(blob);

    var link = document.createElement("a");
    link.href = url;
    link.download = "flashcards.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  function handleImportClick() {
    if (!importFileInput || !importFileInput.files || importFileInput.files.length === 0) {
      window.alert("Choose a CSV file first.");
      return;
    }
    var file = importFileInput.files[0];
    var reader = new FileReader();
    reader.onload = function (event) {
      var text = (event.target && event.target.result) || "";
      try {
        var importedCards = parseCsvToCards(String(text || ""));
        if (!importedCards.length) {
          window.alert("No cards found in CSV.");
          return;
        }
        replaceAllCards(importedCards);
        window.alert("Imported " + importedCards.length + " cards from CSV.");
      } catch (error) {
        window.alert("Could not import CSV: " + error.message);
      } finally {
        importFileInput.value = "";
      }
    };
    reader.onerror = function () {
      window.alert("Failed to read file.");
    };
    reader.readAsText(file);
  }

  function parseCsvToCards(csvText) {
    var lines = csvText.split(/\r\n|\n|\r/);
    var parsedRows = [];
    for (var i = 0; i < lines.length; i += 1) {
      var line = lines[i];
      if (!line) {
        continue;
      }
      var cols = parseCsvLine(line);
      parsedRows.push(cols);
    }
    if (!parsedRows.length) {
      return [];
    }

    var startIndex = 0;
    var header = parsedRows[0];
    if (header && header.length >= 2) {
      var h0 = String(header[0]).toLowerCase();
      var h1 = String(header[1]).toLowerCase();
      if (h0.indexOf("front") !== -1 && h1.indexOf("back") !== -1) {
        startIndex = 1;
      }
    }

    var result = [];
    for (var r = startIndex; r < parsedRows.length; r += 1) {
      var row = parsedRows[r];
      if (!row || row.length < 2) {
        continue;
      }
      var front = String(row[0]).trim();
      var back = String(row[1]).trim();
      if (!front && !back) {
        continue;
      }
      var created = Date.now();
      result.push({
        id: created + r,
        front: front,
        back: back,
        createdAt: created,
        updatedAt: created,
        interval: 1,
        ease: 2.5,
        streak: 0,
        dueAt: created
      });
    }
    return result;
  }

  function parseCsvLine(line) {
    var fields = [];
    var current = "";
    var inQuotes = false;
    for (var i = 0; i < line.length; i += 1) {
      var ch = line.charAt(i);
      if (inQuotes) {
        if (ch === '"') {
          if (i + 1 < line.length && line.charAt(i + 1) === '"') {
            current += '"';
            i += 1;
          } else {
            inQuotes = false;
          }
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ",") {
          fields.push(current);
          current = "";
        } else {
          current += ch;
        }
      }
    }
    fields.push(current);
    return fields;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

