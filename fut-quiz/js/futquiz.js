document.addEventListener("DOMContentLoaded", async () => {
  // ========== SHARED UTILITIES INTEGRATION ==========
  const i18n = new I18n();
  await i18n.init();
  
  const gameStorage = new GameStorage('football');
  gameStorage.cleanupOldStates();
  
  const statsModal = new StatsModal(gameStorage, i18n);
  window.statsModal = statsModal;
  
  const statsBtn = document.getElementById('stats-btn');
  if (statsBtn) {
    statsBtn.addEventListener('click', () => statsModal.show());
  }
  
  const dailyState = gameStorage.getDailyState();
  let dailyCompleted = dailyState && dailyState.completed;
  
  // ========== CONSTANTS & DOM ELEMENTS ==========
  const MAX_GUESSES = 10;

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
  const dataUpdateDateEl = document.getElementById("data-update-date");
  
  // Autocomplete state
  let autocompleteState = {
    selectedIndex: -1,
    filteredPlayers: [],
    isOpen: false
  };

  // Data storage
  let ALL_PLAYERS = [];
  let DAILY_ELIGIBLE_PLAYERS = []; // Players eligible to be the daily secret (easy/medium)

  // Use centralized normalizeText from GameUtils
  const normalizeText = GameUtils.normalizeText;

  // API Configuration
  const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000/api/football'
    : 'https://snackable-api.vercel.app/api/football';
  const CACHE_KEY = 'snackable_football_cache_v1';
  const CACHE_TTL = 60 * 60 * 1000; // 1 hour

  function getCachedData() {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;
      const { timestamp, data } = JSON.parse(cached);
      if (Date.now() - timestamp > CACHE_TTL) {
        localStorage.removeItem(CACHE_KEY);
        return null;
      }
      return data;
    } catch (e) {
      return null;
    }
  }

  function setCachedData(data) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data }));
    } catch (e) { /* storage full, ignore */ }
  }

  async function fetchPlayersFromAPI() {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const json = await response.json();
    if (!json.success || !json.players) throw new Error('Invalid API response');
    return json.players;
  }

  async function loadPlayersData() {
    try {
      let playersData = getCachedData();

      if (!playersData) {
        playersData = await fetchPlayersFromAPI();
        setCachedData(playersData);
      }

      ALL_PLAYERS = playersData;

      DAILY_ELIGIBLE_PLAYERS = ALL_PLAYERS.filter(player =>
        player.difficulty === 'easy' || player.difficulty === 'medium'
      );

      const loadingState = document.getElementById('loading-state');
      if (loadingState) loadingState.style.display = 'none';

      if (DAILY_ELIGIBLE_PLAYERS.length > 0) {
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
        console.error('No players available');
        GameUtils.showError('common.noDataAvailable', true);
      }
    } catch (error) {
      console.error('Error loading player data:', error);
      const loadingState = document.getElementById('loading-state');
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

  function restoreInProgress(progress) {
    const savedGuesses = progress.gameData.guesses;
    gameState.guesses = savedGuesses;
    GameUtils.restoreInProgressUI({
      guesses: savedGuesses,
      displayGuess,
      updateCluesState,
      resetCluesState,
      guessesContainer,
      guessCountEl
    });
    renderCluesPanel();
  }

  function saveProgress() {
    if (gameState.isRandomMode || gameState.isGameOver) return;
    gameStorage.saveDailyProgress({
      gameData: {
        guesses: gameState.guesses.map(g => ({
          name: g.name,
          nationality: g.nationality,
          currentClub: g.currentClub,
          leaguesPlayed: g.leaguesPlayed,
          primaryPosition: g.primaryPosition,
          height: g.height,
          dateOfBirth: g.dateOfBirth,
          deathDate: g.deathDate,
          playedWorldCup: g.playedWorldCup,
          comparisons: g.comparisons
        }))
      }
    });
  }
  
  // Play Random - start a new random game
  function playRandom() {
    // Select random player using centralized utility
    const randomPlayer = GameUtils.selectRandomFromPool(DAILY_ELIGIBLE_PLAYERS, gameState.secretPlayer, 'name');
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
    
    // Reset clues
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
    
    // Focus input (already done by resetForRandomPlay)
    setTimeout(() => playerInput.focus(), 100);
    
    if (typeof gtag === 'function') {
      gtag('event', 'futquiz_play_random', { player: randomPlayer.name });
    }
  }

  // Clues State
  let cluesState = {
    ageMin: null, ageMax: null, ageConfirmed: null,
    heightMin: null, heightMax: null, heightConfirmed: null,
    nationalityConfirmed: null,
    clubConfirmed: null,
    positionConfirmed: null,
    worldCupConfirmed: null,
    matchedLeagues: new Set(),
    totalLeaguesCount: 0,
    excludedNationalities: new Set(),
    excludedClubs: new Set(),
    excludedPositions: new Set()
  };

  // Clues Panel Elements
  const cluesPanel = document.getElementById('clues-panel');
  const cluesContent = document.getElementById('clues-content');
  const cluesHeader = document.getElementById('clues-header');
  const cluesToggle = document.getElementById('clues-toggle');

  // Use centralized utility functions from GameUtils
  const getDateString = GameUtils.getDateString.bind(GameUtils);
  const calculateAge = GameUtils.calculateAge;

  function getDailyPlayer() {
    const dateString = getDateString();
    const index = GameUtils.getDailyIndex(dateString, DAILY_ELIGIBLE_PLAYERS.length, 'fut');
    return DAILY_ELIGIBLE_PLAYERS[index];
  }

  // Helper function to normalize property value (handle both string and array)
  function normalizeProperty(value) {
    if (Array.isArray(value)) {
      return value;
    }
    return [value];
  }

  // Helper function to compare array properties
  function compareArrayProperty(secretValue, guessValue) {
    const secretArray = normalizeProperty(secretValue);
    const guessArray = normalizeProperty(guessValue);
    
    const matches = [];
    const nonMatches = [];
    
    guessArray.forEach(guessItem => {
      if (secretArray.includes(guessItem)) {
        matches.push(guessItem);
      } else {
        nonMatches.push(guessItem);
      }
    });
    
    return {
      matches: matches,
      nonMatches: nonMatches,
      hasMatch: matches.length > 0,
      allMatch: matches.length === guessArray.length && matches.length === secretArray.length
    };
  }

  function compareProperties(secret, guess) {
    const comparisons = {};
    
    const nationalityComparison = compareArrayProperty(secret.nationality, guess.nationality);
    comparisons.nationality = nationalityComparison;
    
    comparisons.currentClub = secret.currentClub === guess.currentClub ? 'match' : 'different';
    
    const leaguesComparison = compareArrayProperty(secret.leaguesPlayed, guess.leaguesPlayed);
    comparisons.leaguesPlayed = leaguesComparison;
    
    comparisons.primaryPosition = secret.primaryPosition === guess.primaryPosition ? 'match' : 'different';
    
    const secretAge = calculateAge(secret.dateOfBirth, secret.deathDate);
    const guessAge = calculateAge(guess.dateOfBirth, guess.deathDate);
    if (secretAge === guessAge) {
      comparisons.age = 'match';
    } else if (guessAge > secretAge) {
      comparisons.age = 'lower';
    } else {
      comparisons.age = 'higher';
    }
    
    if (secret.height === guess.height) {
      comparisons.height = 'match';
    } else if (guess.height > secret.height) {
      comparisons.height = 'lower';
    } else {
      comparisons.height = 'higher';
    }
    
    comparisons.playedWorldCup = secret.playedWorldCup === guess.playedWorldCup ? 'match' : 'different';
    
    return comparisons;
  }

  function getFeedbackText(property, comparison, value) {
    const propertyNames = {
      'nationality': i18n.t('games.football.nationality') || 'Nationality',
      'currentClub': i18n.t('games.football.club') || 'Club',
      'leaguesPlayed': i18n.t('games.football.leagues') || 'Leagues',
      'primaryPosition': i18n.t('games.football.position') || 'Position',
      'age': i18n.t('games.football.age') || 'Age',
      'height': i18n.t('games.football.height') || 'Height',
      'playedWorldCup': i18n.t('games.football.worldCup') || 'World Cup?'
    };
    const propertyName = propertyNames[property] || property;
    
    const arrayProperties = ['nationality', 'leaguesPlayed'];
    if (arrayProperties.includes(property) && typeof comparison === 'object' && comparison.matches !== undefined) {
      const valueArray = normalizeProperty(value);
      const parts = [];
      
      valueArray.forEach(item => {
        if (comparison.matches.includes(item)) {
          parts.push(`<span class="value-match">${item}</span>`);
        } else {
          parts.push(`<span class="value-nomatch">${item}</span>`);
        }
      });
      
      const emoji = comparison.hasMatch ? '✅' : '❌';
      return emoji + ' ' + propertyName + ': ' + parts.join(', ');
    }
    
    const formattedValue = formatPropertyValue(property, value);
    
    // Use space instead of colon if property name ends with ?
    const separator = propertyName.endsWith('?') ? ' ' : ': ';
    
    if (comparison === 'match') {
      return '✅ ' + propertyName + separator + formattedValue;
    } else if (comparison === 'higher') {
      return '🔼 ' + propertyName + separator + formattedValue;
    } else if (comparison === 'lower') {
      return '🔽 ' + propertyName + separator + formattedValue;
    } else {
      return '❌ ' + propertyName + separator + formattedValue;
    }
  }

  function getFeedbackClass(comparison) {
    // Handle array comparison objects
    if (typeof comparison === 'object' && comparison.hasMatch !== undefined) {
      if (comparison.allMatch) {
        return 'feedback-match';
      } else if (comparison.hasMatch) {
        return 'feedback-partial-match'; // New class for partial matches
      } else {
        return 'feedback-different';
      }
    }
    
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
    const guessAge = calculateAge(guess.dateOfBirth, guess.deathDate);
    
    // Age
    if (comparisons.age === 'match') {
      cluesState.ageConfirmed = guessAge;
    } else if (comparisons.age === 'higher') {
      if (cluesState.ageMin === null || guessAge > cluesState.ageMin) cluesState.ageMin = guessAge;
    } else if (comparisons.age === 'lower') {
      if (cluesState.ageMax === null || guessAge < cluesState.ageMax) cluesState.ageMax = guessAge;
    }

    // Height
    if (comparisons.height === 'match') {
      cluesState.heightConfirmed = guess.height;
    } else if (comparisons.height === 'higher') {
      if (cluesState.heightMin === null || guess.height > cluesState.heightMin) cluesState.heightMin = guess.height;
    } else if (comparisons.height === 'lower') {
      if (cluesState.heightMax === null || guess.height < cluesState.heightMax) cluesState.heightMax = guess.height;
    }

    // Nationality
    if (comparisons.nationality.allMatch || comparisons.nationality.hasMatch) {
      comparisons.nationality.matches.forEach(n => {
        if (comparisons.nationality.allMatch) cluesState.nationalityConfirmed = n;
      });
    } else {
      normalizeProperty(guess.nationality).forEach(n => cluesState.excludedNationalities.add(n));
    }

    // Club
    GameUtils.updateCategoricalClue(cluesState, {
      comparison: comparisons.currentClub,
      guessValue: guess.currentClub,
      confirmedKey: 'clubConfirmed',
      excludedKey: 'excludedClubs'
    });

    // Position
    GameUtils.updateCategoricalClue(cluesState, {
      comparison: comparisons.primaryPosition,
      guessValue: guess.primaryPosition,
      confirmedKey: 'positionConfirmed',
      excludedKey: 'excludedPositions'
    });

    // World Cup (binary)
    const wcYes = i18n.t('common.yes') || 'Yes';
    const wcNo = i18n.t('common.no') || 'No';
    GameUtils.updateCategoricalClue(cluesState, {
      comparison: comparisons.playedWorldCup,
      guessValue: guess.playedWorldCup ? wcYes : wcNo,
      confirmedKey: 'worldCupConfirmed'
    });

    // Leagues
    if (cluesState.totalLeaguesCount === 0 && gameState.secretPlayer && gameState.secretPlayer.leaguesPlayed) {
      cluesState.totalLeaguesCount = gameState.secretPlayer.leaguesPlayed.length;
    }
    if (comparisons.leaguesPlayed && comparisons.leaguesPlayed.matches) {
      comparisons.leaguesPlayed.matches.forEach(l => cluesState.matchedLeagues.add(l));
    }
  }

  // Render clues panel
  function renderCluesPanel() {
    if (gameState.guesses.length === 0) {
      cluesPanel.style.display = 'none';
      return;
    }
    cluesPanel.style.display = 'block';

    function renderRange(itemId, valueId, min, max, confirmed, formatter = v => v) {
      const item = document.getElementById(itemId);
      const value = document.getElementById(valueId);
      if (confirmed !== null) {
        item.className = 'clue-item confirmed';
        value.textContent = formatter(confirmed);
      } else if (min !== null || max !== null) {
        item.className = 'clue-item narrowed';
        if (min !== null && max !== null) {
          value.textContent = `${formatter(min + 1)}-${formatter(max - 1)}`;
        } else if (min !== null) {
          value.textContent = `>${formatter(min)}`;
        } else {
          value.textContent = `<${formatter(max)}`;
        }
      } else {
        item.className = 'clue-item';
        value.textContent = '?';
      }
    }

    renderRange('clue-age', 'clue-age-value', cluesState.ageMin, cluesState.ageMax, cluesState.ageConfirmed);
    renderRange('clue-height', 'clue-height-value', cluesState.heightMin, cluesState.heightMax, cluesState.heightConfirmed, h => `${h}cm`);

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
    renderCategorical('clue-club', 'clue-club-value', cluesState.clubConfirmed);
    renderCategorical('clue-position', 'clue-position-value', cluesState.positionConfirmed);
    renderCategorical('clue-worldcup', 'clue-worldcup-value', cluesState.worldCupConfirmed);

    // Matched leagues with ???? for undiscovered
    const leaguesRow = document.getElementById('clue-leagues-row');
    const leaguesContainer = document.getElementById('clue-leagues');
    if (cluesState.totalLeaguesCount > 0) {
      leaguesRow.style.display = 'flex';
      const unknownCount = cluesState.totalLeaguesCount - cluesState.matchedLeagues.size;
      const matchedTags = [...cluesState.matchedLeagues].map(l => `<span class="clue-tag">${l}</span>`);
      const unknownTags = Array(unknownCount).fill('<span class="clue-tag unknown">????</span>');
      leaguesContainer.innerHTML = [...matchedTags, ...unknownTags].join('');
    } else {
      leaguesRow.style.display = 'none';
    }

    // Render excluded sections using centralized utility
    const excludedRow = document.getElementById('clue-excluded-row');
    const nationalitySection = document.getElementById('clue-excluded-nationality-section');
    const clubSection = document.getElementById('clue-excluded-club-section');
    const positionSection = document.getElementById('clue-excluded-position-section');
    
    const hasNationality = GameUtils.renderExcludedSection({
      containerEl: nationalitySection,
      excludedSet: cluesState.excludedNationalities,
      confirmedValue: cluesState.nationalityConfirmed,
      maxItems: 5
    });
    
    const hasClub = GameUtils.renderExcludedSection({
      containerEl: clubSection,
      excludedSet: cluesState.excludedClubs,
      confirmedValue: cluesState.clubConfirmed,
      maxItems: 4
    });
    
    const hasPosition = GameUtils.renderExcludedSection({
      containerEl: positionSection,
      excludedSet: cluesState.excludedPositions,
      confirmedValue: cluesState.positionConfirmed,
      maxItems: 4
    });
    
    excludedRow.style.display = (hasNationality || hasClub || hasPosition) ? 'flex' : 'none';
  }

  function resetCluesState() {
    cluesState = {
      ageMin: null, ageMax: null, ageConfirmed: null,
      heightMin: null, heightMax: null, heightConfirmed: null,
      nationalityConfirmed: null,
      clubConfirmed: null,
      positionConfirmed: null,
      worldCupConfirmed: null,
      matchedLeagues: new Set(),
      totalLeaguesCount: 0,
      excludedNationalities: new Set(),
      excludedClubs: new Set(),
      excludedPositions: new Set()
    };
  }

  function formatPropertyValue(property, value) {
    if (property === 'height') {
      return `${value} cm`;
    } else if (property === 'age') {
      return `${value}`;
    } else if (property === 'playedWorldCup') {
      const yes = i18n.t('common.yes') || 'Yes';
      const no = i18n.t('common.no') || 'No';
      return value ? yes : no;
    }
    return value;
  }

  function displayGuess(guess, comparisons) {
    const guessCard = document.createElement('div');
    guessCard.className = 'guess-card';
    
    const isCorrect = guess.name === gameState.secretPlayer.name;
    const playerNameClass = isCorrect ? 'guess-animal-name correct' : 'guess-animal-name';
    const emoji = '⚽';
    
    // Create the main container
    const guessLine = document.createElement('div');
    guessLine.className = 'guess-line';
    
    // Player name header
    const playerHeader = document.createElement('span');
    playerHeader.className = `guess-animal-header ${playerNameClass}`;
    playerHeader.innerHTML = `
      <span class="animal-emoji-inline">${emoji}</span>
      <span class="animal-name-inline">${guess.name}</span>
      ${isCorrect ? '<span class="correct-badge">🎉</span>' : '<span class="wrong-badge">😞</span>'}
    `;
    guessLine.appendChild(playerHeader);
    
    // Add all property feedbacks
    // Calculate age with deathDate for deceased players, add † symbol
    const guessAge = calculateAge(guess.dateOfBirth, guess.deathDate);
    const ageDisplay = guess.deathDate ? `${guessAge}†` : guessAge;
    
    const properties = [
      { key: 'nationality', value: guess.nationality, comparison: comparisons.nationality },
      { key: 'currentClub', value: guess.currentClub, comparison: comparisons.currentClub },
      { key: 'leaguesPlayed', value: guess.leaguesPlayed, comparison: comparisons.leaguesPlayed },
      { key: 'primaryPosition', value: guess.primaryPosition, comparison: comparisons.primaryPosition },
      { key: 'age', value: ageDisplay, comparison: comparisons.age },
      { key: 'height', value: guess.height, comparison: comparisons.height },
      { key: 'playedWorldCup', value: guess.playedWorldCup, comparison: comparisons.playedWorldCup }
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

  function filterPlayers(query) {
    if (!query || query.trim() === '') {
      return [];
    }
    const normalizedQuery = normalizeText(query.trim());
    // Allow guessing any player from the entire database
    return ALL_PLAYERS.filter(player => 
      normalizeText(player.name).includes(normalizedQuery) &&
      !gameState.guesses.some(g => g.name === player.name)
    ).slice(0, 10); // Limit to 10 results
  }

  function displayAutocomplete(results) {
    autocompleteDropdown.innerHTML = '';
    autocompleteState.filteredPlayers = results;
    autocompleteState.selectedIndex = -1;
    
    if (results.length === 0) {
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
    
    // Allow guessing any player from the entire database
    const guess = ALL_PLAYERS.find(p => p.name.toLowerCase() === inputValue.toLowerCase());
    if (!guess) {
      GameUtils.showWarning(i18n.t('common.notFound', { item: i18n.t('games.football.title') }));
      return;
    }
    
    // Check if already guessed
    if (gameState.guesses.some(g => g.name === guess.name)) {
      GameUtils.showWarning(i18n.t('common.alreadyGuessed', { item: i18n.t('games.football.title') }));
      return;
    }
    
    const comparisons = compareProperties(gameState.secretPlayer, guess);
    updateCluesState(guess, comparisons);
    
    // Store comparisons with the guess for restoration
    guess.comparisons = comparisons;
    gameState.guesses.push(guess);
    
    displayGuess(guess, comparisons);
    updateGameState();
    saveProgress();
    
    // Check if solved
    if (guess.name === gameState.secretPlayer.name) {
      endGame(true);
      return;
    }
    
    // Track guess
    if (typeof gtag === 'function') {
      gtag('event', 'guess', {
        player: guess.name,
        guess_number: gameState.guesses.length
      });
    }
    
    // Reset input
    playerInput.value = '';
    autocompleteDropdown.style.display = 'none';
    autocompleteState.isOpen = false;
  }

  function getAnswerFeedbackText(property, value) {
    const propertyNames = {
      'nationality': i18n.t('games.football.nationality') || 'Nationality',
      'currentClub': i18n.t('games.football.club') || 'Club',
      'leaguesPlayed': i18n.t('games.football.leagues') || 'Leagues',
      'primaryPosition': i18n.t('games.football.position') || 'Position',
      'age': i18n.t('games.football.age') || 'Age',
      'height': i18n.t('games.football.height') || 'Height',
      'playedWorldCup': i18n.t('games.football.worldCup') || 'World Cup?'
    };
    const propertyName = propertyNames[property] || property;
    
    // Handle array properties
    if (Array.isArray(value)) {
      return propertyName + ': ' + value.join(', ');
    }
    
    const formattedValue = formatPropertyValue(property, value);
    return propertyName + ': ' + formattedValue;
  }

  function displayAnswer() {
    // Display the answer with all properties in black (no emojis)
    const answerCard = document.createElement('div');
    answerCard.className = 'guess-card answer-reveal';
    const emoji = '⚽';
    const secret = gameState.secretPlayer;
    
    answerCard.innerHTML = `
      <div class="guess-line">
        <span class="guess-animal-header guess-animal-name answer-reveal-header">
          <span class="animal-emoji-inline">${emoji}</span>
          <span class="animal-name-inline">${secret.name}</span>
          <span>😞</span>
        </span>
        <span class="property-feedback answer-reveal-feedback">${getAnswerFeedbackText('nationality', secret.nationality)}</span>
        <span class="property-feedback answer-reveal-feedback">${getAnswerFeedbackText('currentClub', secret.currentClub)}</span>
        <span class="property-feedback answer-reveal-feedback">${getAnswerFeedbackText('leaguesPlayed', secret.leaguesPlayed)}</span>
        <span class="property-feedback answer-reveal-feedback">${getAnswerFeedbackText('primaryPosition', secret.primaryPosition)}</span>
        <span class="property-feedback answer-reveal-feedback">${getAnswerFeedbackText('age', secret.deathDate ? calculateAge(secret.dateOfBirth, secret.deathDate) + '†' : calculateAge(secret.dateOfBirth))}</span>
        <span class="property-feedback answer-reveal-feedback">${getAnswerFeedbackText('height', secret.height)}</span>
        <span class="property-feedback answer-reveal-feedback">${getAnswerFeedbackText('playedWorldCup', secret.playedWorldCup)}</span>
      </div>
    `;
    guessesContainer.insertBefore(answerCard, guessesContainer.firstChild);
  }

  function giveUp() {
    if (gameState.isSolved || gameState.isGameOver) return;
    
    gameState.gaveUp = true;
    endGame(false);
    displayAnswer();
    
    // Track give up
    if (typeof gtag === 'function') {
      gtag('event', 'game_gave_up', {
        guesses: gameState.guesses.length,
        date: gameState.currentDate
      });
    }
  }

  function endGame(solved) {
    gameState.isSolved = solved;
    gameState.isGameOver = true;
    
    if (solved) {
      const guessText = gameState.guesses.length === 1 ? 'palpite' : 'palpites';
      gameStatusEl.textContent = `🎉 Resolvido em ${gameState.guesses.length} ${guessText}!`;
      gameStatusEl.className = 'solved';
      
      // Track completion
      if (typeof gtag === 'function') {
        gtag('event', 'game_solved', {
          guesses: gameState.guesses.length,
          date: gameState.currentDate
        });
      }
    } else {
      if (gameState.gaveUp) {
        const guessText = gameState.guesses.length === 1 ? 'palpite' : 'palpites';
        gameStatusEl.textContent = `😔 Você desistiu após ${gameState.guesses.length} ${guessText}`;
      } else {
        const guessText = gameState.guesses.length === 1 ? 'palpite' : 'palpites';
        gameStatusEl.textContent = `❌ Fim de Jogo após ${gameState.guesses.length} ${guessText}`;
        displayAnswer();
      }
      gameStatusEl.className = 'game-over';
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
            currentClub: g.currentClub,
            leaguesPlayed: g.leaguesPlayed,
            primaryPosition: g.primaryPosition,
            height: g.height,
            dateOfBirth: g.dateOfBirth,
            deathDate: g.deathDate,
            playedWorldCup: g.playedWorldCup,
            comparisons: g.comparisons,
            isCorrect: g.isCorrect
          }))
        }
      });
      dailyCompleted = true;
      
      // Submit stats to API
      if (typeof GameUtils !== 'undefined' && GameUtils.submitQuizStats) {
        GameUtils.submitQuizStats({
          game: 'fut',
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
      const statusKey = gameState.guesses.length === 1 ? 'common.solvedIn' : 'common.solvedInPlural';
      const status = i18n.t(statusKey, { count: gameState.guesses.length });
      shareText = `🎉 FutQuiz ${gameType} ⚽\n${status}\n\n${gameUrl}`;
    } else if (gameState.gaveUp) {
      const statusKey = gameState.guesses.length === 1 ? 'common.gaveUpAfter' : 'common.gaveUpAfterPlural';
      const status = i18n.t(statusKey, { count: gameState.guesses.length });
      shareText = `😞 FutQuiz ${gameType} ⚽\n${status}\n\n${gameUrl}`;
    } else {
      const status = i18n.t('common.gaveUpAfterPlural', { count: MAX_GUESSES });
      shareText = `❌ FutQuiz ${gameType} ⚽\n${status}\n\n${gameUrl}`;
    }
    
    GameUtils.shareGameResult({
      text: shareText,
      title: 'FutQuiz Result',
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

  // copyToClipboard removed - using GameUtils.shareGameResult instead

  function updateGameState() {
    // Just show the count, no limit
    guessCountEl.textContent = gameState.guesses.length;
    renderCluesPanel();
    
    // Clear status message if game is still active
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
    
    // Clear previous guesses
    guessesContainer.innerHTML = '';
    guessCountEl.textContent = '0';
    gameStatusEl.textContent = '';
    gameStatusEl.className = '';
    guessSection.style.display = 'flex';
    shareSection.style.display = 'none';
    gameInfo.style.display = 'block';
    playerInput.value = '';
    autocompleteDropdown.style.display = 'none';
    
    // Track game start
    if (typeof gtag === 'function') {
      gtag('event', 'game_started', {
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
  
  playerInput.addEventListener('input', (e) => {
    const query = e.target.value;
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
  
  // Close autocomplete when clicking outside
  document.addEventListener('click', (e) => {
    if (!playerInput.contains(e.target) && !autocompleteDropdown.contains(e.target)) {
      autocompleteDropdown.style.display = 'none';
      autocompleteState.isOpen = false;
    }
  });

  // Clues panel toggle
  if (cluesHeader) {
    cluesHeader.addEventListener('click', () => {
      cluesContent.classList.toggle('collapsed');
      cluesToggle.classList.toggle('collapsed');
    });
  }

  // Load data and initialize
  loadPlayersData();
});
