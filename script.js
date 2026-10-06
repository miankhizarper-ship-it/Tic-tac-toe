(() => {
  "use strict";

  /* =========================================
     State and constants
     ========================================= */
  const WINNING_COMBINATIONS = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
  ];

  const LINE_POINTS = [
    [8, 17, 92, 17],
    [8, 50, 92, 50],
    [8, 83, 92, 83],
    [17, 8, 17, 92],
    [50, 8, 50, 92],
    [83, 8, 83, 92],
    [8, 8, 92, 92],
    [92, 8, 8, 92]
  ];

  const STORAGE_KEYS = {
    scores: "neon-tic-tac-toe-scores",
    theme: "neon-tic-tac-toe-theme",
    sound: "neon-tic-tac-toe-sound"
  };

  const state = {
    mode: "pvp",
    difficulty: "easy",
    playerSymbol: "X",
    computerSymbol: "O",
    board: Array(9).fill(null),
    turn: "X",
    scores: { X: 0, O: 0, draws: 0 },
    gameOver: true,
    computerThinking: false,
    winningCombo: null,
    resultText: "",
    roundId: 0,
    computerTimer: null,
    modalTimer: null,
    soundOn: false
  };

  /* =========================================
     DOM references
     ========================================= */
  const root = document.documentElement;
  const refs = {
    app: document.querySelector("#app"),
    menuScreen: document.querySelector("#menu-screen"),
    gameScreen: document.querySelector("#game-screen"),
    startButton: document.querySelector("[data-start-game]"),
    newGameButtons: document.querySelectorAll("[data-new-game]"),
    restartButton: document.querySelector("[data-restart-round]"),
    resetScoresButton: document.querySelector("[data-reset-scores]"),
    playAgainButton: document.querySelector("[data-play-again]"),
    soundToggle: document.querySelector("[data-sound-toggle]"),
    themeToggle: document.querySelector("[data-theme-toggle]"),
    homeLink: document.querySelector("[data-home-link]"),
    modeOptions: document.querySelectorAll("[data-mode]"),
    difficultyOptions: document.querySelectorAll("[data-difficulty]"),
    symbolOptions: document.querySelectorAll("[data-symbol-choice]"),
    computerSettings: document.querySelectorAll("[data-computer-setting]"),
    cells: Array.from(document.querySelectorAll("[data-cell]")),
    board: document.querySelector("[data-board]"),
    winningLine: document.querySelector("[data-winning-line]"),
    statusMessage: document.querySelector("[data-status-message]"),
    turnIndicators: document.querySelectorAll("[data-turn-indicator]"),
    turnSymbols: document.querySelectorAll("[data-turn-symbol]"),
    gameModeLabel: document.querySelector("[data-game-mode-label]"),
    scoreValues: {
      X: document.querySelector('[data-score-value="X"]'),
      O: document.querySelector('[data-score-value="O"]'),
      draws: document.querySelector('[data-score-value="draws"]')
    },
    scoreCards: document.querySelectorAll("[data-score-card]"),
    scoreSymbols: document.querySelectorAll("[data-score-symbol]"),
    resultModal: document.querySelector("[data-result-modal]"),
    resultTitle: document.querySelector("[data-result-title]"),
    resultSubtitle: document.querySelector("[data-result-subtitle]"),
    resultSymbol: document.querySelector("[data-result-symbol]"),
    resultOrb: document.querySelector("[data-result-orb]"),
    confetti: document.querySelector("[data-confetti]")
  };

  /* =========================================
     Storage and presentation helpers
     ========================================= */
  const readStorage = (key, fallback) => {
    try {
      const value = window.localStorage.getItem(key);
      return value === null ? fallback : JSON.parse(value);
    } catch {
      return fallback;
    }
  };

  const writeStorage = (key, value) => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // The game remains fully playable when storage is unavailable.
    }
  };

  const validTheme = (theme) => theme === "light" || theme === "dark";

  const getInitialTheme = () => {
    const savedTheme = readStorage(STORAGE_KEYS.theme, null);
    if (validTheme(savedTheme)) return savedTheme;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  };

  const loadScores = () => {
    const stored = readStorage(STORAGE_KEYS.scores, {});
    return {
      X: Number.isFinite(Number(stored?.X)) && Number(stored.X) >= 0 ? Number(stored.X) : 0,
      O: Number.isFinite(Number(stored?.O)) && Number(stored.O) >= 0 ? Number(stored.O) : 0,
      draws: Number.isFinite(Number(stored?.draws)) && Number(stored.draws) >= 0 ? Number(stored.draws) : 0
    };
  };

  const symbolSvg = (symbol, extraClass = "") => {
    const className = `symbol-mark symbol-${symbol.toLowerCase()} ${extraClass}`.trim();
    if (symbol === "X") {
      return `<svg class="${className}" viewBox="0 0 100 100" focusable="false" aria-hidden="true"><path d="M23 23 77 77"></path><path d="M77 23 23 77"></path></svg>`;
    }
    return `<svg class="${className}" viewBox="0 0 100 100" focusable="false" aria-hidden="true"><circle cx="50" cy="50" r="29"></circle></svg>`;
  };

  const setTheme = (theme, remember = false) => {
    root.dataset.theme = theme;
    if (remember) writeStorage(STORAGE_KEYS.theme, theme);
    const nextTheme = theme === "light" ? "dark" : "light";
    refs.themeToggle.setAttribute("aria-label", `Switch to ${nextTheme} theme`);
    refs.themeToggle.setAttribute("title", `Switch to ${nextTheme} theme`);
  };

  const setSound = (enabled, remember = false) => {
    state.soundOn = enabled;
    root.dataset.sound = enabled ? "on" : "off";
    refs.soundToggle.setAttribute("aria-label", enabled ? "Turn sound off" : "Turn sound on");
    refs.soundToggle.setAttribute("title", enabled ? "Turn sound off" : "Turn sound on");
    if (remember) writeStorage(STORAGE_KEYS.sound, enabled ? "on" : "off");
  };

  const showScreen = (screen) => {
    const showingGame = screen === refs.gameScreen;
    refs.menuScreen.classList.toggle("is-active", !showingGame);
    refs.gameScreen.classList.toggle("is-active", showingGame);
    refs.menuScreen.setAttribute("aria-hidden", String(showingGame));
    refs.gameScreen.setAttribute("aria-hidden", String(!showingGame));
  };

  const clearComputerTimer = () => {
    if (state.computerTimer !== null) {
      window.clearTimeout(state.computerTimer);
      state.computerTimer = null;
    }
  };

  const clearModalTimer = () => {
    if (state.modalTimer !== null) {
      window.clearTimeout(state.modalTimer);
      state.modalTimer = null;
    }
  };

  /* =========================================
     UI rendering
     ========================================= */
  const renderMenuChoices = () => {
    refs.modeOptions.forEach((option) => {
      const selected = option.dataset.mode === state.mode;
      option.classList.toggle("is-selected", selected);
      option.setAttribute("aria-pressed", String(selected));
    });

    refs.difficultyOptions.forEach((option) => {
      const selected = option.dataset.difficulty === state.difficulty;
      option.classList.toggle("is-selected", selected);
      option.setAttribute("aria-pressed", String(selected));
    });

    refs.symbolOptions.forEach((option) => {
      const selected = option.dataset.symbolChoice === state.playerSymbol;
      option.classList.toggle("is-selected", selected);
      option.setAttribute("aria-pressed", String(selected));
    });

    refs.computerSettings.forEach((setting) => {
      setting.hidden = state.mode !== "pvc";
    });
  };

  const renderScores = () => {
    Object.entries(refs.scoreValues).forEach(([key, element]) => {
      element.textContent = String(state.scores[key]);
    });

    refs.scoreCards.forEach((card) => {
      const key = card.dataset.scoreCard;
      const label = card.querySelector(".score-label > span:last-child");
      if (label) label.textContent = key === "draws" ? "Draws" : `${key} wins`;
    });
  };

  const renderScoreSymbols = () => {
    refs.scoreSymbols.forEach((element) => {
      element.innerHTML = symbolSvg(element.dataset.scoreSymbol, "score-mark");
    });

    refs.turnSymbols.forEach((element) => {
      element.innerHTML = symbolSvg(element.dataset.turnSymbol, "turn-mark");
    });

    refs.symbolOptions.forEach((element) => {
      element.innerHTML = symbolSvg(element.dataset.symbolChoice, "choice-mark");
    });
  };

  const getCellDescription = (index) => `row ${Math.floor(index / 3) + 1} column ${(index % 3) + 1}`;

  const renderWinningLine = () => {
    refs.winningLine.classList.remove("is-visible", "is-o");
    if (!state.winningCombo) return;

    const lineIndex = WINNING_COMBINATIONS.findIndex((combo) => combo.join(",") === state.winningCombo.join(","));
    const points = LINE_POINTS[lineIndex];
    refs.winningLine.setAttribute("data-line", String(lineIndex));
    refs.winningLine.setAttribute("x1", String(points[0]));
    refs.winningLine.setAttribute("y1", String(points[1]));
    refs.winningLine.setAttribute("x2", String(points[2]));
    refs.winningLine.setAttribute("y2", String(points[3]));
    if (state.board[state.winningCombo[0]] === "O") refs.winningLine.classList.add("is-o");

    // A frame boundary makes the SVG dash animation replay on every round.
    window.requestAnimationFrame(() => {
      if (state.winningCombo) refs.winningLine.classList.add("is-visible");
    });
  };

  const canHumanMove = () => !state.gameOver && !state.computerThinking && !(state.mode === "pvc" && state.turn === state.computerSymbol);

  const renderBoard = () => {
    const canPlace = canHumanMove();
    refs.cells.forEach((cell, index) => {
      const value = state.board[index];
      const filled = Boolean(value);
      cell.classList.toggle("is-filled", filled);
      cell.classList.toggle("can-place", !filled && canPlace);
      cell.classList.toggle("is-winning", Boolean(state.winningCombo?.includes(index)));
      cell.dataset.symbol = value || "";
      cell.setAttribute("aria-label", filled ? `${value} in ${getCellDescription(index)}` : `Empty cell, ${getCellDescription(index)}`);
      cell.innerHTML = filled ? symbolSvg(value, "mark-enter") : symbolSvg(state.turn, "ghost-mark");
    });
    refs.board.setAttribute("aria-busy", String(state.computerThinking));
    renderWinningLine();
  };

  const renderTurn = () => {
    refs.turnIndicators.forEach((indicator) => {
      const isActive = !state.gameOver && indicator.dataset.turnIndicator === state.turn;
      indicator.classList.toggle("is-active", isActive);
    });

    if (state.gameOver) {
      refs.statusMessage.innerHTML = `<span>${state.resultText}</span>`;
      return;
    }

    if (state.computerThinking) {
      refs.statusMessage.innerHTML = '<span>Computer is thinking<span class="thinking-dots" aria-hidden="true"><i></i><i></i><i></i></span></span>';
      return;
    }

    const humanTurn = state.mode !== "pvc" || state.turn === state.playerSymbol;
    const message = state.mode === "pvp" ? `${state.turn} to move` : humanTurn ? "Your turn" : "Computer's turn";
    refs.statusMessage.innerHTML = `${symbolSvg(state.turn, "status-mark")}<span>${message}</span>`;
  };

  const renderGameMeta = () => {
    if (state.mode === "pvp") {
      refs.gameModeLabel.textContent = "Local match";
    } else {
      const difficultyName = state.difficulty[0].toUpperCase() + state.difficulty.slice(1);
      refs.gameModeLabel.textContent = `Vs computer · ${difficultyName}`;
    }
  };

  const renderGame = () => {
    renderGameMeta();
    renderScores();
    renderBoard();
    renderTurn();
  };

  const bumpScore = (key) => {
    const valueElement = refs.scoreValues[key];
    if (!valueElement) return;
    valueElement.classList.remove("bump");
    void valueElement.offsetWidth;
    valueElement.classList.add("bump");
    window.setTimeout(() => valueElement.classList.remove("bump"), 600);
  };

  /* =========================================
     Game rules
     ========================================= */
  const getWinner = (board) => {
    for (const combo of WINNING_COMBINATIONS) {
      const [first, second, third] = combo;
      if (board[first] && board[first] === board[second] && board[first] === board[third]) {
        return { winner: board[first], combo };
      }
    }
    return null;
  };

  const isBoardFull = (board) => board.every(Boolean);

  const finishRound = (winner, combo = null) => {
    clearComputerTimer();
    state.computerThinking = false;
    state.gameOver = true;
    state.winningCombo = combo;

    if (winner) {
      state.scores[winner] += 1;
      state.resultText = state.mode === "pvc"
        ? winner === state.playerSymbol ? "You win!" : "Computer wins"
        : `${winner} wins!`;
      writeStorage(STORAGE_KEYS.scores, state.scores);
      renderScores();
      bumpScore(winner);
      playWinSound();
      createConfetti();
    } else {
      state.scores.draws += 1;
      state.resultText = "It's a draw";
      writeStorage(STORAGE_KEYS.scores, state.scores);
      renderScores();
      bumpScore("draws");
      refs.board.classList.remove("is-draw");
      void refs.board.offsetWidth;
      refs.board.classList.add("is-draw");
      playDrawSound();
    }

    renderBoard();
    renderTurn();
    clearModalTimer();
    state.modalTimer = window.setTimeout(() => openResultModal(winner), 500);
  };

  const completeMove = () => {
    const outcome = getWinner(state.board);
    if (outcome) {
      finishRound(outcome.winner, outcome.combo);
      return;
    }

    if (isBoardFull(state.board)) {
      finishRound(null);
      return;
    }

    state.turn = state.turn === "X" ? "O" : "X";
    renderBoard();
    renderTurn();
    if (isComputerTurn()) scheduleComputerMove();
  };

  const makeMove = (index) => {
    if (!Number.isInteger(index) || index < 0 || index > 8) return;
    if (state.gameOver || state.computerThinking || state.board[index]) return;
    if (state.mode === "pvc" && state.turn === state.computerSymbol) return;

    state.board[index] = state.turn;
    playClickSound();
    renderBoard();
    completeMove();
  };

  const startRound = () => {
    clearComputerTimer();
    clearModalTimer();
    closeResultModal();
    state.roundId += 1;
    state.board = Array(9).fill(null);
    state.turn = "X";
    state.gameOver = false;
    state.computerThinking = false;
    state.winningCombo = null;
    state.resultText = "";
    refs.board.classList.remove("is-draw");
    renderGame();
    showScreen(refs.gameScreen);

    window.requestAnimationFrame(() => {
      const firstOpenCell = refs.cells.find((cell, index) => !state.board[index]);
      if (firstOpenCell) firstOpenCell.focus();
    });

    if (isComputerTurn()) scheduleComputerMove();
  };

  const restartRound = () => {
    if (!refs.gameScreen.classList.contains("is-active")) return;
    startRound();
  };

  const newGame = () => {
    clearComputerTimer();
    clearModalTimer();
    state.roundId += 1;
    state.gameOver = true;
    state.computerThinking = false;
    closeResultModal();
    renderMenuChoices();
    showScreen(refs.menuScreen);
    window.requestAnimationFrame(() => refs.startButton.focus());
  };

  /* =========================================
     Computer players
     ========================================= */
  const getEmptyIndices = (board) => board.reduce((empty, value, index) => {
    if (!value) empty.push(index);
    return empty;
  }, []);

  const findTacticalMove = (board, symbol) => {
    for (const index of getEmptyIndices(board)) {
      board[index] = symbol;
      const winningMove = Boolean(getWinner(board));
      board[index] = null;
      if (winningMove) return index;
    }
    return null;
  };

  const chooseEasyMove = (board) => {
    const empty = getEmptyIndices(board);
    return empty[Math.floor(Math.random() * empty.length)];
  };

  const chooseMediumMove = (board) => {
    const winningMove = findTacticalMove(board, state.computerSymbol);
    if (winningMove !== null) return winningMove;

    const blockingMove = findTacticalMove(board, state.playerSymbol);
    if (blockingMove !== null) return blockingMove;

    if (!board[4]) return 4;
    const corners = [0, 2, 6, 8].filter((index) => !board[index]);
    if (corners.length) return corners[Math.floor(Math.random() * corners.length)];
    return chooseEasyMove(board);
  };

  /*
     Minimax explores every possible continuation. Scores are adjusted by depth
     so a fast win is preferred and a delayed loss is preferred. Since the
     board has only nine cells, a complete search is small enough for the UI.
  */
  const minimax = (board, currentSymbol, maximizingSymbol, minimizingSymbol, depth) => {
    const outcome = getWinner(board);
    if (outcome?.winner === maximizingSymbol) return 10 - depth;
    if (outcome?.winner === minimizingSymbol) return depth - 10;
    if (isBoardFull(board)) return 0;

    const maximizing = currentSymbol === maximizingSymbol;
    let bestScore = maximizing ? -Infinity : Infinity;
    for (const index of getEmptyIndices(board)) {
      board[index] = currentSymbol;
      const score = minimax(
        board,
        maximizing ? minimizingSymbol : maximizingSymbol,
        maximizingSymbol,
        minimizingSymbol,
        depth + 1
      );
      board[index] = null;
      bestScore = maximizing ? Math.max(bestScore, score) : Math.min(bestScore, score);
    }
    return bestScore;
  };

  const chooseHardMove = (board) => {
    let bestScore = -Infinity;
    let bestMove = getEmptyIndices(board)[0];
    for (const index of getEmptyIndices(board)) {
      board[index] = state.computerSymbol;
      const score = minimax(board, state.playerSymbol, state.computerSymbol, state.playerSymbol, 0);
      board[index] = null;
      if (score > bestScore) {
        bestScore = score;
        bestMove = index;
      }
    }
    return bestMove;
  };

  const chooseComputerMove = () => {
    if (state.difficulty === "hard") return chooseHardMove(state.board);
    if (state.difficulty === "medium") return chooseMediumMove(state.board);
    return chooseEasyMove(state.board);
  };

  const isComputerTurn = () => state.mode === "pvc" && state.turn === state.computerSymbol && !state.gameOver;

  const scheduleComputerMove = () => {
    if (!isComputerTurn()) return;
    clearComputerTimer();
    state.computerThinking = true;
    const currentRound = state.roundId;
    renderBoard();
    renderTurn();
    const delay = 400 + Math.floor(Math.random() * 301);
    state.computerTimer = window.setTimeout(() => {
      state.computerTimer = null;
      if (currentRound !== state.roundId || state.gameOver || !isComputerTurn()) return;
      const move = chooseComputerMove();
      state.computerThinking = false;
      if (move !== undefined) makeComputerMove(move);
    }, delay);
  };

  const makeComputerMove = (index) => {
    if (!isComputerTurn() || state.board[index]) return;
    state.board[index] = state.computerSymbol;
    playClickSound();
    renderBoard();
    completeMove();
  };

  /* =========================================
     Sound, modal, and effects
     ========================================= */
  let audioContext = null;

  const getAudioContext = () => {
    if (!state.soundOn) return null;
    try {
      if (!audioContext) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return null;
        audioContext = new AudioContextClass();
      }
      if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
      return audioContext;
    } catch {
      return null;
    }
  };

  const playTone = (frequency, duration, type = "sine", startAt = 0, volume = 0.045) => {
    const context = getAudioContext();
    if (!context) return;
    const start = context.currentTime + startAt;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  };

  const playClickSound = () => playTone(560, 0.08, "sine", 0, 0.035);

  const playWinSound = () => {
    playTone(523.25, 0.16, "sine", 0, 0.04);
    playTone(659.25, 0.16, "sine", 0.1, 0.04);
    playTone(783.99, 0.28, "sine", 0.2, 0.05);
  };

  const playDrawSound = () => {
    playTone(330, 0.2, "triangle", 0, 0.035);
    playTone(277.18, 0.28, "triangle", 0.13, 0.03);
  };

  const createConfetti = () => {
    refs.confetti.replaceChildren();
    const colors = ["#59e8ff", "#ff81bf", "#a992ff", "#84ffc6", "#ffcf70"];
    const fragment = document.createDocumentFragment();
    for (let index = 0; index < 28; index += 1) {
      const piece = document.createElement("span");
      piece.className = "confetti-piece";
      piece.style.setProperty("--piece-color", colors[index % colors.length]);
      piece.style.setProperty("--piece-delay", `${Math.random() * 0.18}s`);
      piece.style.setProperty("--x", `${(Math.random() - 0.5) * 80}vw`);
      piece.style.setProperty("--y", `${32 + Math.random() * 38}vh`);
      piece.style.setProperty("--rotation", `${(Math.random() - 0.5) * 1080}deg`);
      piece.style.left = `${45 + Math.random() * 10}%`;
      piece.style.top = `${38 + Math.random() * 12}%`;
      fragment.appendChild(piece);
      window.setTimeout(() => piece.remove(), 1900);
    }
    refs.confetti.appendChild(fragment);
  };

  const openResultModal = (winner) => {
    state.modalTimer = null;
    if (!state.gameOver) return;

    const isDraw = !winner;
    const playerWon = winner && (state.mode === "pvp" || winner === state.playerSymbol);
    refs.resultTitle.textContent = isDraw
      ? "It's a draw"
      : state.mode === "pvc"
        ? playerWon ? "You win!" : "Computer wins"
        : `${winner} wins!`;
    refs.resultSubtitle.textContent = isDraw
      ? "No empty squares left. That was a close one."
      : playerWon ? "A brilliant three-in-a-row." : "The board had other plans this time.";
    refs.resultTitle.className = isDraw ? "result-draw" : playerWon ? "result-win" : "result-lose";
    refs.resultOrb.style.background = isDraw
      ? "radial-gradient(circle, rgba(169, 146, 255, 0.2), transparent 68%)"
      : winner === "O"
        ? "radial-gradient(circle, rgba(255, 129, 191, 0.24), transparent 68%)"
        : "radial-gradient(circle, rgba(89, 232, 255, 0.24), transparent 68%)";
    refs.resultSymbol.innerHTML = isDraw ? '<span class="draw-result" aria-hidden="true">=</span>' : symbolSvg(winner, "result-mark");
    refs.resultModal.hidden = false;
    window.requestAnimationFrame(() => refs.resultModal.classList.add("is-visible"));
    refs.playAgainButton.focus();
  };

  const closeResultModal = () => {
    refs.resultModal.classList.remove("is-visible");
    refs.resultModal.hidden = true;
  };

  /* =========================================
     Event handlers
     ========================================= */
  const selectMode = (mode) => {
    state.mode = mode;
    renderMenuChoices();
    playClickSound();
  };

  const selectDifficulty = (difficulty) => {
    state.difficulty = difficulty;
    renderMenuChoices();
    playClickSound();
  };

  const selectSymbol = (symbol) => {
    state.playerSymbol = symbol;
    state.computerSymbol = symbol === "X" ? "O" : "X";
    renderMenuChoices();
    playClickSound();
  };

  const handleCellKeydown = (event) => {
    const cell = event.target.closest("[data-cell]");
    if (!cell) return;
    const currentIndex = Number(cell.dataset.cell);
    const row = Math.floor(currentIndex / 3);
    const column = currentIndex % 3;
    let nextIndex = currentIndex;

    if (event.key === "ArrowUp" && row > 0) nextIndex -= 3;
    if (event.key === "ArrowDown" && row < 2) nextIndex += 3;
    if (event.key === "ArrowLeft" && column > 0) nextIndex -= 1;
    if (event.key === "ArrowRight" && column < 2) nextIndex += 1;

    if (nextIndex !== currentIndex) {
      event.preventDefault();
      refs.cells[nextIndex].focus();
    }
  };

  const createRipple = (event) => {
    const button = event.target.closest("[data-ripple]");
    if (!button || !refs.app.contains(button)) return;
    const existing = button.querySelectorAll(".ripple");
    existing.forEach((ripple) => ripple.remove());
    const ripple = document.createElement("span");
    ripple.className = "ripple";
    const bounds = button.getBoundingClientRect();
    ripple.style.left = `${event.clientX - bounds.left}px`;
    ripple.style.top = `${event.clientY - bounds.top}px`;
    button.appendChild(ripple);
    window.setTimeout(() => ripple.remove(), 650);
  };

  const bindEvents = () => {
    refs.modeOptions.forEach((option) => option.addEventListener("click", () => selectMode(option.dataset.mode)));
    refs.difficultyOptions.forEach((option) => option.addEventListener("click", () => selectDifficulty(option.dataset.difficulty)));
    refs.symbolOptions.forEach((option) => option.addEventListener("click", () => selectSymbol(option.dataset.symbolChoice)));

    refs.startButton.addEventListener("click", startRound);
    refs.newGameButtons.forEach((button) => button.addEventListener("click", newGame));
    refs.restartButton.addEventListener("click", restartRound);
    refs.resetScoresButton.addEventListener("click", () => {
      state.scores = { X: 0, O: 0, draws: 0 };
      writeStorage(STORAGE_KEYS.scores, state.scores);
      renderScores();
      playClickSound();
    });
    refs.playAgainButton.addEventListener("click", startRound);
    refs.board.addEventListener("click", (event) => {
      const cell = event.target.closest("[data-cell]");
      if (cell) makeMove(Number(cell.dataset.cell));
    });
    refs.board.addEventListener("keydown", handleCellKeydown);
    refs.soundToggle.addEventListener("click", () => {
      setSound(!state.soundOn, true);
      if (state.soundOn) playClickSound();
    });
    refs.themeToggle.addEventListener("click", () => {
      setTheme(root.dataset.theme === "light" ? "dark" : "light", true);
    });
    refs.homeLink.addEventListener("click", (event) => {
      event.preventDefault();
      newGame();
    });
    refs.app.addEventListener("click", createRipple);

    document.addEventListener("keydown", (event) => {
      const target = event.target;
      const editing = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target.isContentEditable;
      if (!editing && event.key.toLowerCase() === "r") {
        event.preventDefault();
        restartRound();
      }
    });
  };

  /* =========================================
     Initialization
     ========================================= */
  const init = () => {
    state.scores = loadScores();
    setTheme(getInitialTheme());
    const savedSound = readStorage(STORAGE_KEYS.sound, "off");
    setSound(savedSound === "on");
    renderScoreSymbols();
    renderMenuChoices();
    renderGame();
    bindEvents();
    showScreen(refs.menuScreen);
  };

  init();
})();
