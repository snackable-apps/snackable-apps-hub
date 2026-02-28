document.addEventListener("DOMContentLoaded", async () => {
  // ========== SHARED UTILITIES INTEGRATION ==========
  const i18n = new I18n();
  await i18n.init();
  
  const gameStorage = new GameStorage('tennis');
  gameStorage.cleanupOldStates();
  
  const statsModal = new StatsModal(gameStorage, i18n);
  window.statsModal = statsModal;
  
  const statsBtn = document.getElementById('stats-btn');
  if (statsBtn) {
    statsBtn.addEventListener('click', () => statsModal.show());
  }
  
  const dailyState = gameStorage.getDailyState();
  let dailyCompleted = dailyState && dailyState.completed;
  
  // ========== DOM ELEMENTS ==========
  const playerInput = document.getElementById("player-input");
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
  
  // Autocomplete state
  let autocompleteState = {
    selectedIndex: -1,
    filteredPlayers: [],
    isOpen: false
  };

  // Data storage
  let ALL_PLAYERS = [];
  let SECRET_POOL = [];

  // Use centralized normalizeText from GameUtils
  const normalizeText = GameUtils.normalizeText;

  // API + Cache config
  const API_URL = 'https://snackable-api.vercel.app/api/tennis-players';
  const CACHE_KEY = 'snackable_tennis_players_cache_v1';
  const CACHE_EXPIRY_HOURS = 24;

  function isCacheValid(cached) {
    if (!cached || !cached.timestamp || !cached.players) return false;
    const age = (Date.now() - cached.timestamp) / (1000 * 60 * 60);
    return age < CACHE_EXPIRY_HOURS;
  }

  function loadFromCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const cached = JSON.parse(raw);
      return isCacheValid(cached) ? cached : null;
    } catch { return null; }
  }

  function saveToCache(players) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ players, timestamp: Date.now() }));
    } catch (e) { console.warn('Cache save failed:', e); }
  }

  function refreshCacheInBackground() {
    setTimeout(async () => {
      try {
        const response = await fetch(API_URL);
        if (!response.ok) return;
        const data = await response.json();
        if (data.success && data.players && data.players.length > 0) {
          saveToCache(data.players);
          console.log('Tennis players cache refreshed in background');
        }
      } catch { /* silent */ }
    }, 2000);
  }

  async function loadPlayersData() {
    const loadingState = document.getElementById('loading-state');
    try {
      // Try cache first
      const cached = loadFromCache();
      let players = null;

      if (cached) {
        players = cached.players;
        console.log('Tennis players loaded from cache:', players.length);
        refreshCacheInBackground();
      } else {
        // Fetch from API
        console.log('Fetching tennis players from API...');
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error(`API error ${response.status}`);
        const data = await response.json();
        if (!data.success || !data.players) throw new Error('Invalid API response');
        players = data.players;
        saveToCache(players);
        console.log('Tennis players fetched from API:', players.length);
      }

      ALL_PLAYERS = players;

      // Update data freshness label with current year
      const updateDateEl = document.getElementById('data-update-date');
      if (updateDateEl) {
        updateDateEl.textContent = new Date().getFullYear();
      }

      // Secret pool: only easy + medium players
      SECRET_POOL = ALL_PLAYERS.filter(p => p.difficulty === 'easy' || p.difficulty === 'medium');
      console.log('Secret pool (easy+medium):', SECRET_POOL.length);

      if (loadingState) loadingState.style.display = 'none';

      if (SECRET_POOL.length > 0) {
        if (dailyCompleted && dailyState) {
          restoreDailyResult();
        } else {
          guessSection.style.display = 'flex';
          initializeGame();
        }
      } else {
        console.error('No players available in secret pool');
        GameUtils.showError('common.noDataAvailable', true);
      }
    } catch (error) {
      console.error('Error loading player data:', error);
      if (loadingState) loadingState.style.display = 'none';
      GameUtils.showError('common.loadError', true);
    }
  }

  // Game State
  let gameState = {
    secretPlayer: null,
    guesses: [],
    isSolved: false,
    isGameOver: false,
    gaveUp: false,
    currentDate: null,
    isRandomMode: dailyCompleted
  };
  
  // Restore and display the completed daily game result
  function restoreDailyResult() {
    const todaysPlayer = getDailyPlayer();

    gameState.secretPlayer = todaysPlayer;
    gameState.currentDate = getDateString();
    gameState.isGameOver = true;
    gameState.isRandomMode = false;

    // Restore guesses and state from storage
    if (dailyState.gameData) {
      gameState.guesses = dailyState.gameData.guesses || [];
      gameState.isSolved = dailyState.gameData.won;
      gameState.gaveUp = !dailyState.gameData.won;
    } else {
      gameState.guesses = [];
      gameState.isSolved = dailyState.won || false;
      gameState.gaveUp = !gameState.isSolved;
    }

    // Use centralized restore function
    GameUtils.restoreDailyGameUI({
      guesses: gameState.guesses,
      displayGuess,
      updateCluesState,
      resetCluesState,
      guessesContainer,
      guessSection,
      shareSection,
      gameInfo,
      gameStatusEl,
      cluesPanel,
      isSolved: gameState.isSolved,
      guessCount: gameState.guesses.length,
      displayAnswer
    });

    // Update guess count display
    guessCountEl.textContent = gameState.guesses.length;
  }
  
  // Play Random
  function playRandom() {
    // Select random player using centralized utility
    const randomPlayer = GameUtils.selectRandomFromPool(SECRET_POOL, gameState.secretPlayer, 'name');
    if (!randomPlayer) {
      console.error('playRandom: No players available');
      return;
    }
    
    // Reset game state
    gameState.secretPlayer = randomPlayer;
    gameState.currentDate = getDateString();
    gameState.guesses = [];
    gameState.isSolved = false;
    gameState.isGameOver = false;
    gameState.gaveUp = false;
    gameState.isRandomMode = true;
    
    resetCluesState();
    
    // Use centralized UI reset
    GameUtils.resetForRandomPlay({
      elements: {
        guessSection,
        shareSection,
        shareResultsBtn,
        inputEl: playerInput,
        submitBtn,
        giveUpBtn,
        autocompleteDropdown,
        guessesContainer,
        guessCountEl,
        gameStatusEl,
        cluesPanel
      },
      autocompleteState
    });
    
    if (typeof gtag === 'function') {
      gtag('event', 'tennis_play_random', { player: randomPlayer.name });
    }
  }

  // Clues State
  let cluesState = {
    ageMin: null, ageMax: null, ageConfirmed: null,
    rankingMin: null, rankingMax: null, rankingConfirmed: null,
    bestRankMin: null, bestRankMax: null, bestRankConfirmed: null,
    slamsMin: null, slamsMax: null, slamsConfirmed: null,
    titlesMin: null, titlesMax: null, titlesConfirmed: null,
    nationalityConfirmed: null,
    tourConfirmed: null,
    excludedNationalities: new Set()
  };

  // Clues Panel Elements
  const cluesPanel = document.getElementById('clues-panel');
  const cluesContent = document.getElementById('clues-content');
  const cluesHeader = document.getElementById('clues-header');
  const cluesToggle = document.getElementById('clues-toggle');

  // Use centralized utility functions from GameUtils
  const getDateString = GameUtils.getDateString.bind(GameUtils);
  const calculateAge = GameUtils.calculateAge;

  function formatRanking(ranking) {
    // 9999 = Retired (from RETIRED_RANKING constant in data file)
    if (ranking >= 9999) {
      return 'Retired';
    }
    return '#' + ranking;
  }

  function getDailyPlayer() {
    const dateString = getDateString();
    const date = new Date(dateString);
    const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
    
    const index = dayOfYear % SECRET_POOL.length;
    return SECRET_POOL[index];
  }

  function compareProperties(secret, guess) {
    const comparisons = {};
    
    // Nationality
    comparisons.nationality = secret.nationality === guess.nationality ? 'match' : 'different';

    // Tour (ATP / WTA)
    comparisons.tour = secret.tour === guess.tour ? 'match' : 'different';

    // Current Ranking (lower number = better = "higher" position)
    const secretRank = secret.currentRanking;
    const guessRank = guess.currentRanking;
    if (secretRank === guessRank) {
      comparisons.currentRanking = 'match';
    } else {
      comparisons.currentRanking = secretRank < guessRank ? 'higher' : 'lower';
    }

    // Grand Slam Titles
    if (secret.grandSlamTitles === guess.grandSlamTitles) {
      comparisons.grandSlamTitles = 'match';
    } else if (guess.grandSlamTitles > secret.grandSlamTitles) {
      comparisons.grandSlamTitles = 'lower';
    } else {
      comparisons.grandSlamTitles = 'higher';
    }

    // Career Titles
    if (secret.careerTitles === guess.careerTitles) {
      comparisons.careerTitles = 'match';
    } else if (guess.careerTitles > secret.careerTitles) {
      comparisons.careerTitles = 'lower';
    } else {
      comparisons.careerTitles = 'higher';
    }

    // Highest Ranking (lower number = better = "higher" position)
    if (secret.highestRanking === guess.highestRanking) {
      comparisons.highestRanking = 'match';
    } else if (secret.highestRanking < guess.highestRanking) {
      comparisons.highestRanking = 'higher';
    } else {
      comparisons.highestRanking = 'lower';
    }

    // Age (use death date for deceased players)
    const secretAge = calculateAge(secret.birthdate, secret.deathDate);
    const guessAge = calculateAge(guess.birthdate, guess.deathDate);
    if (secretAge === guessAge) {
      comparisons.age = 'match';
    } else if (guessAge > secretAge) {
      comparisons.age = 'lower';
    } else {
      comparisons.age = 'higher';
    }

    return comparisons;
  }

  function getFeedbackText(property, comparison, value) {
    const propertyNames = {
      'nationality': 'Country',
      'tour': 'Tour',
      'currentRanking': 'Current Rank',
      'grandSlamTitles': 'Grand Slams',
      'careerTitles': 'Titles',
      'highestRanking': 'Best Rank',
      'age': 'Age'
    };
    const propertyName = propertyNames[property] || property;
    
    if (comparison === 'match') {
      return `✅ ${propertyName}: ${value}`;
    } else if (comparison === 'higher') {
      return `🔼 ${propertyName}: ${value}`;
    } else if (comparison === 'lower') {
      return `🔽 ${propertyName}: ${value}`;
    } else {
      return `❌ ${propertyName}: ${value}`;
    }
  }

  function getFeedbackClass(comparison) {
    if (comparison === 'match') {
      return 'feedback-match';
    } else if (comparison === 'higher') {
      return 'feedback-higher';
    } else if (comparison === 'lower') {
      return 'feedback-lower';
    } else {
      return 'feedback-different';
    }
  }

  // Update clues state after a guess
  function updateCluesState(guess, comparisons) {
    const guessAge = calculateAge(guess.birthdate, guess.deathDate);
    
    // Age
    if (comparisons.age === 'match') {
      cluesState.ageConfirmed = guessAge;
    } else if (comparisons.age === 'higher') {
      if (cluesState.ageMin === null || guessAge > cluesState.ageMin) cluesState.ageMin = guessAge;
    } else if (comparisons.age === 'lower') {
      if (cluesState.ageMax === null || guessAge < cluesState.ageMax) cluesState.ageMax = guessAge;
    }

    // Current Ranking (lower is better, so inverted arrows)
    if (comparisons.currentRanking === 'match') {
      cluesState.rankingConfirmed = guess.currentRanking;
    } else if (comparisons.currentRanking === 'higher') {
      // Secret is better (lower) than guess
      if (cluesState.rankingMax === null || guess.currentRanking < cluesState.rankingMax) cluesState.rankingMax = guess.currentRanking;
    } else if (comparisons.currentRanking === 'lower') {
      // Secret is worse (higher) than guess
      if (cluesState.rankingMin === null || guess.currentRanking > cluesState.rankingMin) cluesState.rankingMin = guess.currentRanking;
    }

    // Best Ranking (lower is better)
    if (comparisons.highestRanking === 'match') {
      cluesState.bestRankConfirmed = guess.highestRanking;
    } else if (comparisons.highestRanking === 'higher') {
      if (cluesState.bestRankMax === null || guess.highestRanking < cluesState.bestRankMax) cluesState.bestRankMax = guess.highestRanking;
    } else if (comparisons.highestRanking === 'lower') {
      if (cluesState.bestRankMin === null || guess.highestRanking > cluesState.bestRankMin) cluesState.bestRankMin = guess.highestRanking;
    }

    // Grand Slams
    if (comparisons.grandSlamTitles === 'match') {
      cluesState.slamsConfirmed = guess.grandSlamTitles;
    } else if (comparisons.grandSlamTitles === 'higher') {
      if (cluesState.slamsMin === null || guess.grandSlamTitles > cluesState.slamsMin) cluesState.slamsMin = guess.grandSlamTitles;
    } else if (comparisons.grandSlamTitles === 'lower') {
      if (cluesState.slamsMax === null || guess.grandSlamTitles < cluesState.slamsMax) cluesState.slamsMax = guess.grandSlamTitles;
    }

    // Career Titles
    if (comparisons.careerTitles === 'match') {
      cluesState.titlesConfirmed = guess.careerTitles;
    } else if (comparisons.careerTitles === 'higher') {
      if (cluesState.titlesMin === null || guess.careerTitles > cluesState.titlesMin) cluesState.titlesMin = guess.careerTitles;
    } else if (comparisons.careerTitles === 'lower') {
      if (cluesState.titlesMax === null || guess.careerTitles < cluesState.titlesMax) cluesState.titlesMax = guess.careerTitles;
    }

    // Categorical clues (nationality, tour)
    GameUtils.updateCategoricalClue(cluesState, {
      comparison: comparisons.nationality,
      guessValue: guess.nationality,
      confirmedKey: 'nationalityConfirmed',
      excludedKey: 'excludedNationalities'
    });
    GameUtils.updateCategoricalClue(cluesState, {
      comparison: comparisons.tour,
      guessValue: guess.tour,
      confirmedKey: 'tourConfirmed',
      excludedKey: null
    });
  }

  // Render clues panel
  function renderCluesPanel() {
    if (gameState.guesses.length === 0) {
      cluesPanel.style.display = 'none';
      return;
    }
    cluesPanel.style.display = 'block';

    // Helper for range display using centralized utility
    function renderRange(itemId, valueId, min, max, confirmed, formatter = v => v) {
      const item = document.getElementById(itemId);
      const value = document.getElementById(valueId);
      const result = GameUtils.formatClueRange({ min, max, confirmed, formatter });
      item.className = result.className ? `clue-item ${result.className}` : 'clue-item';
      value.textContent = result.text;
    }

    // Helper for ranking (inverted - lower number is better)
    function renderRankingRange(itemId, valueId, min, max, confirmed) {
      const item = document.getElementById(itemId);
      const value = document.getElementById(valueId);
      if (confirmed !== null) {
        item.className = 'clue-item confirmed';
        value.textContent = formatRanking(confirmed);
      } else if (min !== null || max !== null) {
        item.className = 'clue-item narrowed';
        if (min !== null && max !== null) {
          const rangeMin = min + 1;
          const rangeMax = max - 1;
          value.textContent = rangeMin === rangeMax ? `#${rangeMin}` : `#${rangeMin}-#${rangeMax}`;
        } else if (min !== null) {
          value.textContent = `worse than #${min}`;
        } else {
          value.textContent = `better than #${max}`;
        }
      } else {
        item.className = 'clue-item';
        value.textContent = '?';
      }
    }

    renderRange('clue-age', 'clue-age-value', cluesState.ageMin, cluesState.ageMax, cluesState.ageConfirmed);
    renderRankingRange('clue-ranking', 'clue-ranking-value', cluesState.rankingMin, cluesState.rankingMax, cluesState.rankingConfirmed);
    renderRankingRange('clue-best-rank', 'clue-best-rank-value', cluesState.bestRankMin, cluesState.bestRankMax, cluesState.bestRankConfirmed);
    renderRange('clue-slams', 'clue-slams-value', cluesState.slamsMin, cluesState.slamsMax, cluesState.slamsConfirmed);
    renderRange('clue-titles', 'clue-titles-value', cluesState.titlesMin, cluesState.titlesMax, cluesState.titlesConfirmed);

    // Categorical properties
    function renderCategorical(itemId, valueId, confirmed) {
      const item = document.getElementById(itemId);
      const value = document.getElementById(valueId);
      if (confirmed) {
        item.className = 'clue-item confirmed';
        value.textContent = confirmed;
      } else {
        item.className = 'clue-item';
        value.textContent = '?';
      }
    }

    renderCategorical('clue-nationality', 'clue-nationality-value', cluesState.nationalityConfirmed);
    renderCategorical('clue-tour', 'clue-tour-value', cluesState.tourConfirmed);

    // Excluded nationalities
    const excludedRow = document.getElementById('clue-excluded-row');
    const nationalitySection = document.getElementById('clue-excluded-nationality-section');

    const hasNationality = GameUtils.renderExcludedSection({
      containerEl: nationalitySection,
      excludedSet: cluesState.excludedNationalities,
      confirmedValue: cluesState.nationalityConfirmed,
      maxItems: 5
    });

    excludedRow.style.display = hasNationality ? 'flex' : 'none';
  }

  // Reset clues state
  function resetCluesState() {
    cluesState = {
      ageMin: null, ageMax: null, ageConfirmed: null,
      rankingMin: null, rankingMax: null, rankingConfirmed: null,
      bestRankMin: null, bestRankMax: null, bestRankConfirmed: null,
      slamsMin: null, slamsMax: null, slamsConfirmed: null,
      titlesMin: null, titlesMax: null, titlesConfirmed: null,
      nationalityConfirmed: null,
      tourConfirmed: null,
      excludedNationalities: new Set()
    };
  }

  function displayGuess(guess, comparisons) {
    const guessCard = document.createElement('div');
    guessCard.className = 'guess-card';
    
    const isCorrect = guess.name === gameState.secretPlayer.name;
    const playerNameClass = isCorrect ? 'guess-player-header correct' : 'guess-player-header';
    const guessAge = calculateAge(guess.birthdate, guess.deathDate);
    // Add † for deceased players
    const ageDisplay = guess.deathDate ? `${guessAge}†` : guessAge;
    
    guessCard.innerHTML = `
      <div class="guess-line">
        <span class="${playerNameClass}">
          <span class="player-emoji-inline">🎾</span>
          <span class="player-name-inline">${guess.name}</span>
          ${isCorrect ? '<span class="correct-badge">🎉</span>' : '<span class="wrong-badge">❌</span>'}
        </span>
        <span class="property-feedback ${getFeedbackClass(comparisons.nationality)}">${getFeedbackText('nationality', comparisons.nationality, guess.nationality)}</span>
        <span class="property-feedback ${getFeedbackClass(comparisons.tour)}">${getFeedbackText('tour', comparisons.tour, guess.tour)}</span>
        <span class="property-feedback ${getFeedbackClass(comparisons.currentRanking)}">${getFeedbackText('currentRanking', comparisons.currentRanking, formatRanking(guess.currentRanking))}</span>
        <span class="property-feedback ${getFeedbackClass(comparisons.age)}">${getFeedbackText('age', comparisons.age, ageDisplay)}</span>
        <span class="property-feedback ${getFeedbackClass(comparisons.grandSlamTitles)}">${getFeedbackText('grandSlamTitles', comparisons.grandSlamTitles, guess.grandSlamTitles)}</span>
        <span class="property-feedback ${getFeedbackClass(comparisons.careerTitles)}">${getFeedbackText('careerTitles', comparisons.careerTitles, guess.careerTitles)}</span>
        <span class="property-feedback ${getFeedbackClass(comparisons.highestRanking)}">${getFeedbackText('highestRanking', comparisons.highestRanking, '#' + guess.highestRanking)}</span>
      </div>
    `;
    
    guessesContainer.insertBefore(guessCard, guessesContainer.firstChild);
  }

  function filterPlayers(query) {
    if (!query || query.trim() === '' || !ALL_PLAYERS || ALL_PLAYERS.length === 0) {
      return [];
    }
    const normalizedQuery = normalizeText(query.trim());
    return ALL_PLAYERS.filter(player => 
      normalizeText(player.name).includes(normalizedQuery) &&
      !gameState.guesses.some(g => g.name === player.name)
    ).slice(0, 10);
  }

  function displayAutocomplete(results) {
    if (!autocompleteDropdown) return;
    
    autocompleteDropdown.innerHTML = '';
    autocompleteState.filteredPlayers = results || [];
    autocompleteState.selectedIndex = -1;
    
    if (!results || results.length === 0) {
      autocompleteDropdown.style.display = 'none';
      autocompleteState.isOpen = false;
      return;
    }
    
    autocompleteDropdown.style.display = 'block';
    autocompleteState.isOpen = true;
    
    results.forEach((player, index) => {
      const item = document.createElement('div');
      item.className = 'autocomplete-item';
      item.textContent = player.name;
      item.addEventListener('click', () => {
        selectPlayer(player.name);
      });
      item.addEventListener('mouseenter', () => {
        autocompleteState.selectedIndex = index;
        updateAutocompleteSelection();
      });
      autocompleteDropdown.appendChild(item);
    });
  }

  function updateAutocompleteSelection() {
    const items = autocompleteDropdown.querySelectorAll('.autocomplete-item');
    items.forEach((item, index) => {
      if (index === autocompleteState.selectedIndex) {
        item.classList.add('selected');
      } else {
        item.classList.remove('selected');
      }
    });
  }

  function selectPlayer(playerName) {
    playerInput.value = playerName;
    autocompleteDropdown.style.display = 'none';
    autocompleteState.isOpen = false;
    playerInput.focus();
  }

  function submitGuess() {
    if (gameState.isSolved || gameState.isGameOver) return;
    
    const inputValue = playerInput.value.trim();
    if (!inputValue) return;
    
    const guess = ALL_PLAYERS.find(p => p.name.toLowerCase() === inputValue.toLowerCase());
    if (!guess) {
      GameUtils.showWarning(i18n.t('common.notFound', { item: i18n.t('games.tennis.title') }));
      return;
    }
    
    if (gameState.guesses.some(g => g.name === guess.name)) {
      GameUtils.showWarning(i18n.t('common.alreadyGuessed', { item: i18n.t('games.tennis.title') }));
      return;
    }
    
    const comparisons = compareProperties(gameState.secretPlayer, guess);
    updateCluesState(guess, comparisons);
    
    // Store comparisons with the guess for restoration
    guess.comparisons = comparisons;
    gameState.guesses.push(guess);
    
    displayGuess(guess, comparisons);
    updateGameState();
    
    if (guess.name === gameState.secretPlayer.name) {
      endGame(true);
      return;
    }
    
    // Track guess
    if (typeof gtag === 'function') {
      gtag('event', 'tennis_guess', {
        player: guess.name,
        guess_number: gameState.guesses.length
      });
    }
    
    playerInput.value = '';
    autocompleteDropdown.style.display = 'none';
    autocompleteState.isOpen = false;
  }

  function getAnswerFeedbackText(property, value) {
    const propertyNames = {
      'nationality': 'Country',
      'tour': 'Tour',
      'status': 'Status',
      'grandSlamTitles': 'Grand Slams',
      'careerTitles': 'Titles',
      'highestRanking': 'Best Rank',
      'age': 'Age'
    };
    const propertyName = propertyNames[property] || property;
    return `${propertyName}: ${value}`;
  }

  function displayAnswer() {
    const answerCard = document.createElement('div');
    answerCard.className = 'guess-card answer-reveal';
    const secret = gameState.secretPlayer;
    const secretAge = calculateAge(secret.birthdate, secret.deathDate);
    const ageDisplay = secret.deathDate ? `${secretAge}†` : secretAge;

    answerCard.innerHTML = `
      <div class="guess-line">
        <span class="guess-player-header answer-reveal-header">
          <span class="player-emoji-inline">🎾</span>
          <span class="player-name-inline">${secret.name}</span>
          <span>😔</span>
        </span>
        <span class="property-feedback answer-reveal-feedback">${getAnswerFeedbackText('nationality', secret.nationality)}</span>
        <span class="property-feedback answer-reveal-feedback">${getAnswerFeedbackText('tour', secret.tour)}</span>
        <span class="property-feedback answer-reveal-feedback">${getAnswerFeedbackText('status', formatRanking(secret.currentRanking))}</span>
        <span class="property-feedback answer-reveal-feedback">${getAnswerFeedbackText('age', ageDisplay)}</span>
        <span class="property-feedback answer-reveal-feedback">${getAnswerFeedbackText('grandSlamTitles', secret.grandSlamTitles)}</span>
        <span class="property-feedback answer-reveal-feedback">${getAnswerFeedbackText('careerTitles', secret.careerTitles)}</span>
        <span class="property-feedback answer-reveal-feedback">${getAnswerFeedbackText('highestRanking', '#' + secret.highestRanking)}</span>
      </div>
    `;
    guessesContainer.insertBefore(answerCard, guessesContainer.firstChild);
  }

  function giveUp() {
    if (gameState.isSolved || gameState.isGameOver) return;
    
    gameState.gaveUp = true;
    endGame(false);
    displayAnswer();
    
    if (typeof gtag === 'function') {
      gtag('event', 'tennis_gave_up', {
        guesses: gameState.guesses.length,
        date: gameState.currentDate
      });
    }
  }

  function endGame(solved) {
    gameState.isSolved = solved;
    gameState.isGameOver = true;
    
    if (solved) {
      gameStatusEl.textContent = `🎉 Solved in ${gameState.guesses.length} guess${gameState.guesses.length !== 1 ? 'es' : ''}!`;
      gameStatusEl.className = 'solved';
      
      if (typeof gtag === 'function') {
        gtag('event', 'tennis_solved', {
          guesses: gameState.guesses.length,
          date: gameState.currentDate
        });
      }
    } else {
      if (gameState.gaveUp) {
        gameStatusEl.textContent = `😔 You gave up after ${gameState.guesses.length} guess${gameState.guesses.length !== 1 ? 'es' : ''}`;
      } else {
        gameStatusEl.textContent = `❌ Game Over after ${gameState.guesses.length} guess${gameState.guesses.length !== 1 ? 'es' : ''}`;
        displayAnswer();
      }
      gameStatusEl.className = 'game-over';
      
      if (typeof gtag === 'function') {
        gtag('event', 'tennis_game_over', {
          guesses: gameState.guesses.length,
          gave_up: gameState.gaveUp,
          date: gameState.currentDate
        });
      }
    }
    
    // Save game result to storage
    if (!dailyCompleted && !gameState.isRandomMode) {
      gameStorage.completeDailyGame({
        won: solved,
        guesses: gameState.guesses.length,
        player: gameState.secretPlayer.name,
        gameData: {
          won: solved,
          guesses: gameState.guesses.map(g => ({
            name: g.name,
            nationality: g.nationality,
            tour: g.tour,
            currentRanking: g.currentRanking,
            highestRanking: g.highestRanking,
            grandSlamTitles: g.grandSlamTitles,
            careerTitles: g.careerTitles,
            birthdate: g.birthdate,
            deathDate: g.deathDate,
            comparisons: g.comparisons,
            isCorrect: g.isCorrect
          }))
        }
      });
      dailyCompleted = true;
      
      // Submit stats to API
      if (typeof GameUtils !== 'undefined' && GameUtils.submitQuizStats) {
        GameUtils.submitQuizStats({
          game: 'tennis',
          dateString: getDateString(),
          result: solved ? 'solved' : 'gave_up',
          tries: gameState.guesses.length,
          isRandomMode: false
        });
      }
    }
    
    guessSection.style.display = 'none';
    shareSection.style.display = 'flex';
    
    // Hide share button for random games (only daily results can be shared)
    shareResultsBtn.style.display = gameState.isRandomMode ? 'none' : '';
    
    // Hide clues panel when game ends
    if (cluesPanel) cluesPanel.style.display = 'none';
  }

  function shareResults() {
    const gameUrl = window.location.origin + window.location.pathname;
    const gameType = gameState.isRandomMode ? '🎲' : getDateString();
    let shareText;
    
    if (gameState.isSolved) {
      const status = `Solved in ${gameState.guesses.length} guess${gameState.guesses.length !== 1 ? 'es' : ''}!`;
      shareText = `🎉 Tennis Quiz ${gameType} 🎾\n${status}\n\nPlay at: ${gameUrl}`;
    } else if (gameState.gaveUp) {
      const status = `Gave up after ${gameState.guesses.length} guess${gameState.guesses.length !== 1 ? 'es' : ''}`;
      shareText = `😞 Tennis Quiz ${gameType} 🎾\n${status}\n\nPlay at: ${gameUrl}`;
    } else {
      const status = `Game Over after ${gameState.guesses.length} guess${gameState.guesses.length !== 1 ? 'es' : ''}`;
      shareText = `❌ Tennis Quiz ${gameType} 🎾\n${status}\n\nPlay at: ${gameUrl}`;
    }
    
    GameUtils.shareGameResult({
      text: shareText,
      title: 'Tennis Quiz Result',
      button: shareResultsBtn,
      successMessage: '✅ ' + i18n.t('share.copiedToClipboard'),
      originalHTML: shareResultsBtn.innerHTML
    });
  }

  // copyToClipboard removed - using GameUtils.shareGameResult instead

  function updateGameState() {
    guessCountEl.textContent = gameState.guesses.length;
    renderCluesPanel();
    
    if (!gameState.isSolved && !gameState.isGameOver) {
      gameStatusEl.textContent = '';
      gameStatusEl.className = '';
    }
    
    // Keep clues panel visible after game over so user can see the summary
  }

  function initializeGame() {
    gameState.currentDate = getDateString();
    gameState.secretPlayer = getDailyPlayer();
    gameState.guesses = [];
    gameState.isSolved = false;
    gameState.isGameOver = false;
    gameState.gaveUp = false;
    
    resetCluesState();
    
    guessesContainer.innerHTML = '';
    guessCountEl.textContent = '0';
    gameStatusEl.textContent = '';
    gameStatusEl.className = '';
    guessSection.style.display = 'flex';
    shareSection.style.display = 'none';
    gameInfo.style.display = 'block';
    playerInput.value = '';
    autocompleteDropdown.style.display = 'none';
    
    if (typeof gtag === 'function') {
      gtag('event', 'tennis_game_started', {
        date: gameState.currentDate
      });
    }
  }

  // Event Listeners
  submitBtn.addEventListener('click', submitGuess);
  giveUpBtn.addEventListener('click', giveUp);
  shareResultsBtn.addEventListener('click', shareResults);
  
  const playRandomBtn = document.getElementById('play-random-btn');
  if (playRandomBtn) {
    playRandomBtn.addEventListener('click', playRandom);
  }
  
  if (playerInput) {
    playerInput.addEventListener('input', (e) => {
      const query = e.target.value;
      if (!ALL_PLAYERS || ALL_PLAYERS.length === 0) {
        console.warn('Players not loaded yet');
        return;
      }
      const results = filterPlayers(query);
      displayAutocomplete(results);
    });
    
    playerInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (autocompleteState.isOpen && autocompleteState.selectedIndex >= 0) {
          const selectedPlayer = autocompleteState.filteredPlayers[autocompleteState.selectedIndex];
          selectPlayer(selectedPlayer.name);
          submitGuess();
        } else {
          submitGuess();
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (autocompleteState.isOpen && autocompleteState.filteredPlayers.length > 0) {
          autocompleteState.selectedIndex = Math.min(
            autocompleteState.selectedIndex + 1,
            autocompleteState.filteredPlayers.length - 1
          );
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
      if (playerInput && autocompleteDropdown && 
          !playerInput.contains(e.target) && !autocompleteDropdown.contains(e.target)) {
        autocompleteDropdown.style.display = 'none';
        autocompleteState.isOpen = false;
      }
    });
  }

  // Clues panel toggle
  if (cluesHeader) {
    cluesHeader.addEventListener('click', () => {
      cluesContent.classList.toggle('collapsed');
      cluesToggle.classList.toggle('collapsed');
    });
  }

  // Load data and initialize
  await loadPlayersData();
});
