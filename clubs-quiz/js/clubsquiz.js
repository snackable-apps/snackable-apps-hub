document.addEventListener("DOMContentLoaded", async () => {
  const i18n = new I18n();
  await i18n.init();

  const gameStorage = new GameStorage('clubs');
  gameStorage.cleanupOldStates();

  const statsModal = new StatsModal(gameStorage, i18n);
  window.statsModal = statsModal;

  const dailyState = gameStorage.getDailyState();
  let dailyCompleted = dailyState && dailyState.completed;

  // ========== DOM ELEMENTS ==========
  const clubInput = document.getElementById("club-input");
  const autocompleteDropdown = document.getElementById("autocomplete-dropdown");
  const submitBtn = document.getElementById("submit-guess");
  const giveUpBtn = document.getElementById("give-up-btn");
  const shareResultsBtn = document.getElementById("share-results-btn");
  const shareSection = document.getElementById("share-section");
  const guessesContainer = document.getElementById("guesses-container");
  const guessCountEl = document.getElementById("guess-count");
  const gameStatusEl = document.getElementById("game-status");
  const guessSection = document.getElementById("guess-section");
  const gameInfo = document.getElementById("game-info");

  let autocompleteState = { selectedIndex: -1, filteredClubs: [], isOpen: false };

  let ALL_CLUBS = [];
  let SECRET_POOL = [];

  const normalizeText = GameUtils.normalizeText;

  const API_URL = 'https://snackable-api.vercel.app/api/football?type=clubs';
  const CACHE_KEY = 'snackable_football_clubs_cache_v1';
  const CACHE_EXPIRY_HOURS = 24;

  function isCacheValid() {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return false;
      const { timestamp } = JSON.parse(cached);
      return (Date.now() - timestamp) / (1000 * 60 * 60) < CACHE_EXPIRY_HOURS;
    } catch { return false; }
  }

  function loadFromCache() {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;
      const { clubs } = JSON.parse(cached);
      return clubs;
    } catch { return null; }
  }

  function saveToCache(clubs) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ clubs, timestamp: Date.now() }));
    } catch (e) { console.warn('Cache write failed:', e); }
  }

  async function refreshCacheInBackground() {
    try {
      const resp = await fetch(API_URL);
      if (!resp.ok) return;
      const data = await resp.json();
      if (data.success && data.clubs?.length > 0) {
        saveToCache(data.clubs);
        if (Math.abs(data.clubs.length - ALL_CLUBS.length) > 5) {
          ALL_CLUBS = data.clubs;
        }
      }
    } catch { /* silent */ }
  }

  async function loadClubsData() {
    try {
      if (isCacheValid()) {
        const cached = loadFromCache();
        if (cached?.length > 0) {
          ALL_CLUBS = cached;
          initializeAfterLoad();
          refreshCacheInBackground();
          return;
        }
      }

      const resp = await fetch(API_URL);
      if (!resp.ok) throw new Error(`API error: ${resp.status}`);
      const data = await resp.json();
      if (!data.success || !data.clubs?.length) throw new Error('No clubs from API');

      ALL_CLUBS = data.clubs;
      saveToCache(ALL_CLUBS);
    } catch (apiError) {
      console.error('[ClubsQuiz] API fetch failed:', apiError.message);
      const fallback = loadFromCache();
      if (fallback?.length > 0) {
        ALL_CLUBS = fallback;
      } else {
        const loadingState = document.getElementById('loading-state');
        if (loadingState) loadingState.style.display = 'none';
        GameUtils.showError('common.loadError', true);
        return;
      }
    }
    initializeAfterLoad();
  }

  function initializeAfterLoad() {
    SECRET_POOL = ALL_CLUBS.filter(c => c.difficulty === 'easy' || c.difficulty === 'medium');

    const loadingState = document.getElementById('loading-state');
    if (loadingState) loadingState.style.display = 'none';

    if (SECRET_POOL.length > 0) {
      if (dailyCompleted && dailyState) {
        restoreDailyResult();
      } else {
        const inProgress = gameStorage.getDailyProgress();
        guessSection.style.display = 'flex';
        initializeGame();
        if (inProgress && inProgress.gameData && inProgress.gameData.guesses && inProgress.gameData.guesses.length > 0) {
          restoreInProgress(inProgress);
        }
      }
    } else {
      GameUtils.showError('common.noDataAvailable', true);
    }
  }

  // ========== GAME STATE ==========
  let gameState = {
    secretClub: null,
    guesses: [],
    isSolved: false,
    isGameOver: false,
    gaveUp: false,
    currentDate: null,
    isRandomMode: dailyCompleted,
    sessionStartTime: null,
    firstGuessTime: null
  };

  let cluesState = {
    foundedMin: null, foundedMax: null, foundedConfirmed: null,
    capacityMin: null, capacityMax: null, capacityConfirmed: null,
    countryConfirmed: null,
    matchedTitles: new Set(),
    totalTitlesCount: 0,
    excludedCountries: new Set()
  };

  const cluesPanel = document.getElementById('clues-panel');
  const cluesContent = document.getElementById('clues-content');
  const cluesHeader = document.getElementById('clues-header');
  const cluesToggle = document.getElementById('clues-toggle');

  const getDateString = GameUtils.getDateString.bind(GameUtils);

  function getDailyClub() {
    const dateString = getDateString();
    const index = GameUtils.getDailyIndex(dateString, SECRET_POOL.length, 'clubs');
    return SECRET_POOL[index];
  }

  // ========== COMPARE PROPERTIES ==========
  function compareArrayProperty(secretValue, guessValue) {
    const secretArr = Array.isArray(secretValue) ? secretValue : [];
    const guessArr = Array.isArray(guessValue) ? guessValue : [];
    const matches = [];
    const nonMatches = [];
    guessArr.forEach(item => {
      if (secretArr.includes(item)) matches.push(item);
      else nonMatches.push(item);
    });
    return {
      matches, nonMatches,
      hasMatch: matches.length > 0,
      allMatch: matches.length === guessArr.length && matches.length === secretArr.length
    };
  }

  function compareProperties(secret, guess) {
    const comparisons = {};

    comparisons.country = secret.country === guess.country ? 'match' : 'different';

    if (secret.foundedYear === guess.foundedYear) comparisons.foundedYear = 'match';
    else if (guess.foundedYear > secret.foundedYear) comparisons.foundedYear = 'lower';
    else comparisons.foundedYear = 'higher';

    if (secret.stadiumCapacity === guess.stadiumCapacity) comparisons.stadiumCapacity = 'match';
    else if (guess.stadiumCapacity > secret.stadiumCapacity) comparisons.stadiumCapacity = 'lower';
    else comparisons.stadiumCapacity = 'higher';

    comparisons.titles = compareArrayProperty(secret.titles, guess.titles);

    return comparisons;
  }

  // ========== DISPLAY ==========
  function formatCapacity(num) {
    if (num == null) return '?';
    return Math.round(num / 1000) + 'k';
  }

  function getFeedbackText(property, comparison, value) {
    const propertyNames = {
      'country': 'Country',
      'foundedYear': 'Founded',
      'stadiumCapacity': 'Capacity',
      'titles': 'Titles'
    };
    const propertyName = propertyNames[property] || property;

    if (property === 'titles' && typeof comparison === 'object') {
      if (!value || !Array.isArray(value) || value.length === 0) {
        return `❌ ${propertyName}: <span class="no-titles">None</span>`;
      }
      const titlesHtml = value.map(title => {
        if (comparison.matches.includes(title)) {
          return `<span class="title-match">${title}</span>`;
        }
        return `<span class="title-nomatch">${title}</span>`;
      }).join(', ');
      const emoji = comparison.allMatch ? '✅' : (comparison.hasMatch ? '🔶' : '❌');
      return `${emoji} ${propertyName}: ${titlesHtml}`;
    }

    if (property === 'stadiumCapacity') {
      value = value ? formatCapacity(value) : '?';
    }

    if (comparison === 'match') return `✅ ${propertyName}: ${value}`;
    if (comparison === 'higher') return `🔼 ${propertyName}: ${value}`;
    if (comparison === 'lower') return `🔽 ${propertyName}: ${value}`;
    return `❌ ${propertyName}: ${value}`;
  }

  function getFeedbackClass(comparison) {
    if (typeof comparison === 'object') {
      if (comparison.allMatch) return 'feedback-match';
      if (comparison.hasMatch) return 'feedback-partial-match';
      return 'feedback-different';
    }
    if (comparison === 'match') return 'feedback-match';
    if (comparison === 'higher') return 'feedback-higher';
    if (comparison === 'lower') return 'feedback-lower';
    return 'feedback-different';
  }

  function displayGuess(guess, comparisons) {
    const guessCard = document.createElement('div');
    guessCard.className = 'guess-card';

    const isCorrect = guess.name === gameState.secretClub.name;
    const headerClass = isCorrect ? 'guess-club-header correct' : 'guess-club-header';

    const guessLine = document.createElement('div');
    guessLine.className = 'guess-line';

    const clubHeader = document.createElement('span');
    clubHeader.className = headerClass;
    const badgeImg = guess.badgeUrl ? `<img src="${guess.badgeUrl}" class="club-badge-inline" alt="" onerror="this.style.display='none'">` : '<span class="club-badge-inline">🏟️</span>';
    clubHeader.innerHTML = `
      ${badgeImg}
      <span class="club-name-inline">${guess.name}</span>
      ${isCorrect ? '<span class="correct-badge">🏆</span>' : '<span class="wrong-badge">❌</span>'}
    `;
    guessLine.appendChild(clubHeader);

    const properties = [
      { key: 'country', value: guess.country, comparison: comparisons.country },
      { key: 'foundedYear', value: guess.foundedYear, comparison: comparisons.foundedYear },
      { key: 'stadiumCapacity', value: guess.stadiumCapacity, comparison: comparisons.stadiumCapacity },
      { key: 'titles', value: guess.titles, comparison: comparisons.titles }
    ];

    properties.forEach(prop => {
      const feedbackSpan = document.createElement('span');
      feedbackSpan.className = `property-feedback ${getFeedbackClass(prop.comparison)}`;
      feedbackSpan.innerHTML = getFeedbackText(prop.key, prop.comparison, prop.value);
      guessLine.appendChild(feedbackSpan);
    });

    guessCard.appendChild(guessLine);
    guessesContainer.insertBefore(guessCard, guessesContainer.firstChild);
  }

  // ========== CLUES ==========
  function updateCluesState(guess, comparisons) {
    if (comparisons.foundedYear === 'match') cluesState.foundedConfirmed = guess.foundedYear;
    else if (comparisons.foundedYear === 'higher') { if (cluesState.foundedMin === null || guess.foundedYear > cluesState.foundedMin) cluesState.foundedMin = guess.foundedYear; }
    else if (comparisons.foundedYear === 'lower') { if (cluesState.foundedMax === null || guess.foundedYear < cluesState.foundedMax) cluesState.foundedMax = guess.foundedYear; }

    if (comparisons.stadiumCapacity === 'match') cluesState.capacityConfirmed = guess.stadiumCapacity;
    else if (comparisons.stadiumCapacity === 'higher') { if (cluesState.capacityMin === null || guess.stadiumCapacity > cluesState.capacityMin) cluesState.capacityMin = guess.stadiumCapacity; }
    else if (comparisons.stadiumCapacity === 'lower') { if (cluesState.capacityMax === null || guess.stadiumCapacity < cluesState.capacityMax) cluesState.capacityMax = guess.stadiumCapacity; }

    GameUtils.updateCategoricalClue(cluesState, {
      comparison: comparisons.country,
      guessValue: guess.country,
      confirmedKey: 'countryConfirmed',
      excludedKey: 'excludedCountries'
    });

    if (cluesState.totalTitlesCount === 0 && gameState.secretClub && gameState.secretClub.titles) {
      cluesState.totalTitlesCount = gameState.secretClub.titles.length;
    }
    if (comparisons.titles && comparisons.titles.matches) {
      comparisons.titles.matches.forEach(t => cluesState.matchedTitles.add(t));
    }
  }

  function renderCluesPanel() {
    if (gameState.guesses.length === 0) { cluesPanel.style.display = 'none'; return; }
    cluesPanel.style.display = 'block';

    function renderRange(itemId, valueId, min, max, confirmed, formatter, step) {
      const item = document.getElementById(itemId);
      const value = document.getElementById(valueId);
      const fmt = formatter || (v => v);
      const s = step || 1;

      if (s > 1) {
        if (confirmed !== null && confirmed !== undefined) {
          item.className = 'clue-item confirmed';
          value.textContent = fmt(confirmed);
        } else if (min !== null || max !== null) {
          item.className = 'clue-item narrowed';
          if (min !== null && max !== null) {
            const lo = min + s, hi = max - s;
            value.textContent = lo >= hi ? fmt(lo) : `${fmt(lo)} – ${fmt(hi)}`;
          } else if (min !== null) {
            value.textContent = `> ${fmt(min + s)}`;
          } else {
            value.textContent = `< ${fmt(max - s)}`;
          }
        } else {
          item.className = 'clue-item';
          value.textContent = '?';
        }
        return;
      }

      const result = GameUtils.formatClueRange({ min, max, confirmed, formatter: fmt });
      item.className = result.className ? `clue-item ${result.className}` : 'clue-item';
      value.textContent = result.text;
    }

    renderRange('clue-founded', 'clue-founded-value', cluesState.foundedMin, cluesState.foundedMax, cluesState.foundedConfirmed);
    renderRange('clue-capacity', 'clue-capacity-value', cluesState.capacityMin, cluesState.capacityMax, cluesState.capacityConfirmed, formatCapacity, 1000);

    const countryItem = document.getElementById('clue-country');
    const countryValue = document.getElementById('clue-country-value');
    if (cluesState.countryConfirmed) { countryItem.className = 'clue-item confirmed'; countryValue.textContent = cluesState.countryConfirmed; }
    else { countryItem.className = 'clue-item'; countryValue.textContent = '?'; }

    const titlesRow = document.getElementById('clue-titles-row');
    const titlesContainer = document.getElementById('clue-titles');
    if (cluesState.totalTitlesCount > 0) {
      titlesRow.style.display = 'flex';
      const unknownCount = cluesState.totalTitlesCount - cluesState.matchedTitles.size;
      const matchedTags = [...cluesState.matchedTitles].map(t => `<span class="clue-tag">${t}</span>`);
      const unknownTags = Array(unknownCount).fill('<span class="clue-tag unknown">????</span>');
      titlesContainer.innerHTML = [...matchedTags, ...unknownTags].join('');
    } else if (gameState.guesses.length > 0 && gameState.secretClub && gameState.secretClub.titles && gameState.secretClub.titles.length === 0) {
      titlesRow.style.display = 'flex';
      titlesContainer.innerHTML = '<span class="clue-tag unknown" style="font-style:italic">No titles</span>';
    } else {
      titlesRow.style.display = 'none';
    }

    const excludedRow = document.getElementById('clue-excluded-row');
    const countrySection = document.getElementById('clue-excluded-country-section');
    const hasCountry = GameUtils.renderExcludedSection({
      containerEl: countrySection,
      excludedSet: cluesState.excludedCountries,
      confirmedValue: cluesState.countryConfirmed,
      maxItems: 6
    });
    excludedRow.style.display = hasCountry ? 'flex' : 'none';
  }

  function resetCluesState() {
    cluesState = {
      foundedMin: null, foundedMax: null, foundedConfirmed: null,
      capacityMin: null, capacityMax: null, capacityConfirmed: null,
      countryConfirmed: null,
      matchedTitles: new Set(),
      totalTitlesCount: 0,
      excludedCountries: new Set()
    };
  }

  // ========== AUTOCOMPLETE ==========
  function filterClubs(query) {
    if (!query || query.trim() === '') return [];
    const normalizedQuery = normalizeText(query.trim());
    return ALL_CLUBS.filter(club =>
      normalizeText(club.name).includes(normalizedQuery) &&
      !gameState.guesses.some(g => g.name === club.name)
    ).slice(0, 10);
  }

  function displayAutocomplete(results) {
    autocompleteDropdown.innerHTML = '';
    autocompleteState.filteredClubs = results;
    autocompleteState.selectedIndex = -1;

    if (results.length === 0) {
      autocompleteDropdown.style.display = 'none';
      autocompleteState.isOpen = false;
      return;
    }

    autocompleteDropdown.style.display = 'block';
    autocompleteState.isOpen = true;

    results.forEach((club, index) => {
      const item = document.createElement('div');
      item.className = 'autocomplete-item';
      const badge = club.badgeUrl ? `<img src="${club.badgeUrl}" class="club-badge" alt="" onerror="this.style.display='none'">` : '';
      item.innerHTML = `${badge}<span class="club-name">${club.name}</span><span class="club-country">${club.country || ''}</span>`;
      item.addEventListener('click', () => selectClub(club.name));
      item.addEventListener('mouseenter', () => { autocompleteState.selectedIndex = index; updateAutocompleteSelection(); });
      autocompleteDropdown.appendChild(item);
    });
  }

  function updateAutocompleteSelection() {
    const items = autocompleteDropdown.querySelectorAll('.autocomplete-item');
    items.forEach((item, index) => { item.classList.toggle('selected', index === autocompleteState.selectedIndex); });
  }

  function selectClub(clubName) {
    clubInput.value = clubName;
    autocompleteDropdown.style.display = 'none';
    autocompleteState.isOpen = false;
    clubInput.focus();
  }

  // ========== GAME ACTIONS ==========
  function submitGuess() {
    if (gameState.isSolved || gameState.isGameOver) return;

    const inputValue = clubInput.value.trim();
    if (!inputValue) return;

    const guess = ALL_CLUBS.find(c => c.name.toLowerCase() === inputValue.toLowerCase());
    if (!guess) {
      GameUtils.showWarning(i18n.t('common.notFound', { item: 'club' }));
      return;
    }

    if (gameState.guesses.some(g => g.name === guess.name)) {
      GameUtils.showWarning(i18n.t('common.alreadyGuessed', { item: 'club' }));
      return;
    }

    if (gameState.guesses.length === 0 && !gameState.firstGuessTime) {
      gameState.firstGuessTime = Date.now();
    }

    const comparisons = compareProperties(gameState.secretClub, guess);
    updateCluesState(guess, comparisons);

    guess.comparisons = comparisons;
    gameState.guesses.push(guess);

    displayGuess(guess, comparisons);
    updateGameState();
    saveProgress();

    if (guess.name === gameState.secretClub.name) {
      endGame(true);
      return;
    }

    if (typeof gtag === 'function') {
      gtag('event', 'guess', { club: guess.name, guess_number: gameState.guesses.length });
    }

    clubInput.value = '';
    autocompleteDropdown.style.display = 'none';
    autocompleteState.isOpen = false;
  }

  function displayAnswer() {
    const answerCard = document.createElement('div');
    answerCard.className = 'guess-card answer-reveal';
    const secret = gameState.secretClub;
    const badgeImg = secret.badgeUrl ? `<img src="${secret.badgeUrl}" class="answer-badge" alt="" onerror="this.style.display='none'">` : '';

    const titlesDisplay = secret.titles && secret.titles.length > 0
      ? secret.titles.join(', ')
      : 'None';

    answerCard.innerHTML = `
      <div class="guess-line" style="flex-direction: column; align-items: center; gap: 0.5rem;">
        ${badgeImg}
        <span class="guess-club-header answer-reveal-header" style="min-width: auto;">
          <span class="club-name-inline" style="font-size: 1.2rem;">${secret.name}</span>
          <span>🏆</span>
        </span>
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: center;">
          <span class="property-feedback answer-reveal-feedback">Country: ${secret.country}</span>
          <span class="property-feedback answer-reveal-feedback">Founded: ${secret.foundedYear}</span>
          <span class="property-feedback answer-reveal-feedback">Stadium: ${secret.stadium} (${formatCapacity(secret.stadiumCapacity)})</span>
          <span class="property-feedback answer-reveal-feedback">Titles: ${titlesDisplay}</span>
        </div>
      </div>
    `;
    guessesContainer.insertBefore(answerCard, guessesContainer.firstChild);
  }

  function giveUp() {
    if (gameState.isSolved || gameState.isGameOver) return;
    gameState.gaveUp = true;

    if (typeof gtag === 'function') {
      gtag('event', 'game_gave_up', { guesses: gameState.guesses.length, date: gameState.currentDate });
    }

    endGame(false);
    displayAnswer();
  }

  function endGame(solved) {
    gameState.isSolved = solved;
    gameState.isGameOver = true;

    const guessText = gameState.guesses.length === 1 ? 'guess' : 'guesses';
    if (solved) {
      gameStatusEl.textContent = `🏆 Solved in ${gameState.guesses.length} ${guessText}!`;
      gameStatusEl.className = 'solved';
    } else {
      gameStatusEl.textContent = gameState.gaveUp
        ? `😔 Gave up after ${gameState.guesses.length} ${guessText}`
        : `❌ Game Over after ${gameState.guesses.length} ${guessText}`;
      gameStatusEl.className = 'game-over';
    }

    if (!dailyCompleted && !gameState.isRandomMode) {
      gameStorage.completeDailyGame({
        won: solved,
        guesses: gameState.guesses.length,
        club: gameState.secretClub.name,
        gameData: {
          won: solved,
          guesses: gameState.guesses.map(g => ({
            name: g.name, country: g.country, foundedYear: g.foundedYear,
            stadiumCapacity: g.stadiumCapacity, stadium: g.stadium,
            badgeUrl: g.badgeUrl, titles: g.titles, comparisons: g.comparisons
          }))
        }
      });
      dailyCompleted = true;

      if (typeof GameUtils !== 'undefined' && GameUtils.submitQuizStats) {
        GameUtils.submitQuizStats({
          game: 'clubs',
          dateString: getDateString(),
          result: solved ? 'solved' : 'gave_up',
          tries: gameState.guesses.length,
          isRandomMode: false
        });
      }
    }

    guessSection.style.display = 'none';
    shareSection.style.display = 'flex';
    shareResultsBtn.style.display = gameState.isRandomMode ? 'none' : '';
    if (cluesPanel) cluesPanel.style.display = 'none';
  }

  function shareResults() {
    const shareText = GameUtils.generateQuizShareText({
      gameName: 'Clubs Quiz', gameEmoji: '🏟️',
      isSolved: gameState.isSolved, gaveUp: gameState.gaveUp,
      isRandomMode: gameState.isRandomMode,
      guessCount: gameState.guesses.length,
      dateString: getDateString()
    });

    GameUtils.shareGameResult({
      text: shareText, title: 'Clubs Quiz Result',
      button: shareResultsBtn,
      successMessage: '✅ ' + i18n.t('share.copiedToClipboard'),
      originalHTML: shareResultsBtn.innerHTML,
      analytics: {
        gtag: typeof gtag === 'function' ? gtag : null,
        event: 'share_clicked',
        params: { solved: gameState.isSolved, guesses: gameState.guesses.length }
      }
    });
  }

  function updateGameState() {
    guessCountEl.textContent = gameState.guesses.length;
    renderCluesPanel();
  }

  // ========== INIT / RESTORE ==========
  function initializeGame() {
    gameState.currentDate = getDateString();
    gameState.secretClub = getDailyClub();
    gameState.guesses = [];
    gameState.isSolved = false;
    gameState.isGameOver = false;
    gameState.gaveUp = false;
    gameState.sessionStartTime = Date.now();
    gameState.firstGuessTime = null;

    resetCluesState();

    guessesContainer.innerHTML = '';
    guessCountEl.textContent = '0';
    gameStatusEl.textContent = '';
    gameStatusEl.className = '';
    guessSection.style.display = 'flex';
    shareSection.style.display = 'none';
    gameInfo.style.display = 'block';
    clubInput.value = '';
    autocompleteDropdown.style.display = 'none';
  }

  function restoreDailyResult() {
    const todaysClub = getDailyClub();
    gameState.secretClub = todaysClub;
    gameState.currentDate = getDateString();
    gameState.isGameOver = true;
    gameState.isRandomMode = false;

    if (dailyState.gameData) {
      gameState.guesses = dailyState.gameData.guesses || [];
      gameState.isSolved = dailyState.gameData.won;
      gameState.gaveUp = !dailyState.gameData.won;
    } else {
      gameState.guesses = [];
      gameState.isSolved = dailyState.won || false;
      gameState.gaveUp = !gameState.isSolved;
    }

    GameUtils.restoreDailyGameUI({
      guesses: gameState.guesses, displayGuess, updateCluesState, resetCluesState,
      guessesContainer, guessSection, shareSection, gameInfo, gameStatusEl, cluesPanel,
      isSolved: gameState.isSolved, guessCount: gameState.guesses.length, displayAnswer
    });
    guessCountEl.textContent = gameState.guesses.length;
  }

  function restoreInProgress(progress) {
    const savedGuesses = progress.gameData.guesses;
    gameState.guesses = savedGuesses;
    GameUtils.restoreInProgressUI({
      guesses: savedGuesses, displayGuess, updateCluesState, resetCluesState,
      guessesContainer, guessCountEl
    });
    renderCluesPanel();
  }

  function saveProgress() {
    if (gameState.isRandomMode || gameState.isGameOver) return;
    gameStorage.saveDailyProgress({
      gameData: {
        guesses: gameState.guesses.map(g => ({
          name: g.name, country: g.country, foundedYear: g.foundedYear,
          stadiumCapacity: g.stadiumCapacity, stadium: g.stadium,
          badgeUrl: g.badgeUrl, titles: g.titles, comparisons: g.comparisons
        }))
      }
    });
  }

  function playRandom() {
    const randomClub = GameUtils.selectRandomFromPool(SECRET_POOL, gameState.secretClub, 'name');
    if (!randomClub) return;

    gameState.secretClub = randomClub;
    gameState.currentDate = getDateString();
    gameState.guesses = [];
    gameState.isSolved = false;
    gameState.isGameOver = false;
    gameState.gaveUp = false;
    gameState.isRandomMode = true;

    resetCluesState();

    GameUtils.resetForRandomPlay({
      elements: {
        guessSection, shareSection, shareResultsBtn,
        inputEl: clubInput, submitBtn, giveUpBtn,
        autocompleteDropdown, guessesContainer, guessCountEl, gameStatusEl, cluesPanel
      },
      autocompleteState
    });

    setTimeout(() => clubInput.focus(), 100);
  }

  // ========== EVENT LISTENERS ==========
  submitBtn.addEventListener('click', submitGuess);
  giveUpBtn.addEventListener('click', giveUp);
  shareResultsBtn.addEventListener('click', shareResults);

  const playRandomBtn = document.getElementById('play-random-btn');
  if (playRandomBtn) playRandomBtn.addEventListener('click', playRandom);

  clubInput.addEventListener('input', (e) => { displayAutocomplete(filterClubs(e.target.value)); });

  clubInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (autocompleteState.isOpen && autocompleteState.selectedIndex >= 0) {
        selectClub(autocompleteState.filteredClubs[autocompleteState.selectedIndex].name);
        submitGuess();
      } else { submitGuess(); }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (autocompleteState.isOpen && autocompleteState.filteredClubs.length > 0) {
        autocompleteState.selectedIndex = Math.min(autocompleteState.selectedIndex + 1, autocompleteState.filteredClubs.length - 1);
        updateAutocompleteSelection();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (autocompleteState.isOpen) {
        autocompleteState.selectedIndex = Math.max(autocompleteState.selectedIndex - 1, -1);
        updateAutocompleteSelection();
      }
    } else if (e.key === 'Escape') {
      autocompleteDropdown.style.display = 'none';
      autocompleteState.isOpen = false;
    }
  });

  document.addEventListener('click', (e) => {
    if (!clubInput.contains(e.target) && !autocompleteDropdown.contains(e.target)) {
      autocompleteDropdown.style.display = 'none';
      autocompleteState.isOpen = false;
    }
  });

  if (cluesHeader) {
    cluesHeader.addEventListener('click', () => {
      cluesContent.classList.toggle('collapsed');
      cluesToggle.classList.toggle('collapsed');
    });
  }

  loadClubsData();
});
