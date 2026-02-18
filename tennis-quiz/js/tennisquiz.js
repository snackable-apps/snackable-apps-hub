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

  // Load embedded data
  function loadPlayersData() {
    try {
      if (typeof PLAYERS_DATA === 'undefined' || !PLAYERS_DATA || PLAYERS_DATA.length === 0) {
        throw new Error('Player data not loaded. Please check if data/players_data.js is included.');
      }
      
      ALL_PLAYERS = PLAYERS_DATA;
      console.log('Total players loaded:', ALL_PLAYERS.length);
      
      // Display data update date
      const updateDateEl = document.getElementById('data-update-date');
      if (updateDateEl && typeof DATA_UPDATE_DATE !== 'undefined') {
        updateDateEl.textContent = DATA_UPDATE_DATE;
      }
      
      // Secret pool: only easy + medium players
      SECRET_POOL = ALL_PLAYERS.filter(player => 
        player.difficulty === 'easy' || player.difficulty === 'medium'
      );
      console.log('Secret pool (easy+medium):', SECRET_POOL.length);
      
      // Hide loading state, show game
      const loadingState = document.getElementById('loading-state');
      if (loadingState) loadingState.style.display = 'none';
      
      if (SECRET_POOL.length > 0) {
        // Check if daily is completed - show result instead of restarting
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
      // Hide loading on error too
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
    proMin: null, proMax: null, proConfirmed: null,
    nationalityConfirmed: null,
    handConfirmed: null,
    backhandConfirmed: null,
    excludedNationalities: new Set(),
    excludedHands: new Set(),
    excludedBackhands: new Set()
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
    
    // Current Ranking (number for all players, 9999 = Retired)
    // Lower number = better ranking, #1 is the TOP (arrow up)
    const secretRank = secret.currentRanking;
    const guessRank = guess.currentRanking;
    if (secretRank === guessRank) {
      comparisons.currentRanking = 'match';
    } else {
      // For rankings: lower number = better = "higher" position (arrow up)
      // If secret is #1 and guess is #50, arrow should point UP (secret is "higher")
      comparisons.currentRanking = secretRank < guessRank ? 'higher' : 'lower';
    }
    
    // Hand
    comparisons.hand = secret.hand === guess.hand ? 'match' : 'different';
    
    // Backhand
    comparisons.backhand = secret.backhand === guess.backhand ? 'match' : 'different';
    
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
      // Secret has better (lower) highest ranking = arrow UP
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
    
    // Turned Pro Year
    if (secret.turnedPro === guess.turnedPro) {
      comparisons.turnedPro = 'match';
    } else if (guess.turnedPro > secret.turnedPro) {
      comparisons.turnedPro = 'lower';
    } else {
      comparisons.turnedPro = 'higher';
    }
    
    return comparisons;
  }

  function getFeedbackText(property, comparison, value) {
    const propertyNames = {
      'nationality': 'Country',
      'currentRanking': 'Current Rank',
      'hand': 'Hand',
      'backhand': 'Backhand',
      'grandSlamTitles': 'Grand Slams',
      'careerTitles': 'Titles',
      'highestRanking': 'Best Rank',
      'age': 'Age',
      'turnedPro': 'Pro Since'
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

    // Turned Pro
    if (comparisons.turnedPro === 'match') {
      cluesState.proConfirmed = guess.turnedPro;
    } else if (comparisons.turnedPro === 'higher') {
      if (cluesState.proMin === null || guess.turnedPro > cluesState.proMin) cluesState.proMin = guess.turnedPro;
    } else if (comparisons.turnedPro === 'lower') {
      if (cluesState.proMax === null || guess.turnedPro < cluesState.proMax) cluesState.proMax = guess.turnedPro;
    }

    // Nationality
    if (comparisons.nationality === 'match') {
      cluesState.nationalityConfirmed = guess.nationality;
    } else {
      cluesState.excludedNationalities.add(guess.nationality);
    }

    // Hand
    if (comparisons.hand === 'match') {
      cluesState.handConfirmed = guess.hand;
    } else {
      cluesState.excludedHands.add(guess.hand);
    }

    // Backhand
    if (comparisons.backhand === 'match') {
      cluesState.backhandConfirmed = guess.backhand;
    } else {
      cluesState.excludedBackhands.add(guess.backhand);
    }
  }

  // Render clues panel
  function renderCluesPanel() {
    if (gameState.guesses.length === 0) {
      cluesPanel.style.display = 'none';
      return;
    }
    cluesPanel.style.display = 'block';

    // Helper for range display
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

    // Helper for ranking (inverted - lower number is better)
    // min = largest guess where secret is WORSE (higher number) than guess. So: secret > min
    // max = smallest guess where secret is BETTER (lower number) than guess. So: secret < max
    // Range: min < secret < max, display: #(min+1) to #(max-1)
    function renderRankingRange(itemId, valueId, min, max, confirmed) {
      const item = document.getElementById(itemId);
      const value = document.getElementById(valueId);
      if (confirmed !== null) {
        item.className = 'clue-item confirmed';
        value.textContent = formatRanking(confirmed);
      } else if (min !== null || max !== null) {
        item.className = 'clue-item narrowed';
        if (min !== null && max !== null) {
          // Secret is between min+1 and max-1 (secret > min AND secret < max)
          value.textContent = `#${min + 1}-#${max - 1}`;
        } else if (min !== null) {
          // Only know secret > min (worse rank), so secret could be #min+1 or higher
          value.textContent = `worse than #${min}`;
        } else {
          // Only know secret < max (better rank), so secret could be #max-1 or lower
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
    renderRange('clue-pro', 'clue-pro-value', cluesState.proMin, cluesState.proMax, cluesState.proConfirmed);

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
    renderCategorical('clue-hand', 'clue-hand-value', cluesState.handConfirmed);
    renderCategorical('clue-backhand', 'clue-backhand-value', cluesState.backhandConfirmed);

    // Render excluded sections using centralized utility
    const excludedRow = document.getElementById('clue-excluded-row');
    const nationalitySection = document.getElementById('clue-excluded-nationality-section');
    const handSection = document.getElementById('clue-excluded-hand-section');
    const backhandSection = document.getElementById('clue-excluded-backhand-section');
    
    const hasNationality = GameUtils.renderExcludedSection({
      containerEl: nationalitySection,
      excludedSet: cluesState.excludedNationalities,
      confirmedValue: cluesState.nationalityConfirmed,
      maxItems: 5
    });
    
    const hasHand = GameUtils.renderExcludedSection({
      containerEl: handSection,
      excludedSet: cluesState.excludedHands,
      confirmedValue: cluesState.handConfirmed,
      maxItems: 2
    });
    
    const hasBackhand = GameUtils.renderExcludedSection({
      containerEl: backhandSection,
      excludedSet: cluesState.excludedBackhands,
      confirmedValue: cluesState.backhandConfirmed,
      maxItems: 2
    });
    
    excludedRow.style.display = (hasNationality || hasHand || hasBackhand) ? 'flex' : 'none';
  }

  // Reset clues state
  function resetCluesState() {
    cluesState = {
      ageMin: null, ageMax: null, ageConfirmed: null,
      rankingMin: null, rankingMax: null, rankingConfirmed: null,
      bestRankMin: null, bestRankMax: null, bestRankConfirmed: null,
      slamsMin: null, slamsMax: null, slamsConfirmed: null,
      titlesMin: null, titlesMax: null, titlesConfirmed: null,
      proMin: null, proMax: null, proConfirmed: null,
      nationalityConfirmed: null,
      handConfirmed: null,
      backhandConfirmed: null,
      excludedNationalities: new Set(),
      excludedHands: new Set(),
      excludedBackhands: new Set()
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
        <span class="property-feedback ${getFeedbackClass(comparisons.currentRanking)}">${getFeedbackText('currentRanking', comparisons.currentRanking, formatRanking(guess.currentRanking))}</span>
        <span class="property-feedback ${getFeedbackClass(comparisons.age)}">${getFeedbackText('age', comparisons.age, ageDisplay)}</span>
        <span class="property-feedback ${getFeedbackClass(comparisons.hand)}">${getFeedbackText('hand', comparisons.hand, guess.hand)}</span>
        <span class="property-feedback ${getFeedbackClass(comparisons.backhand)}">${getFeedbackText('backhand', comparisons.backhand, guess.backhand)}</span>
        <span class="property-feedback ${getFeedbackClass(comparisons.grandSlamTitles)}">${getFeedbackText('grandSlamTitles', comparisons.grandSlamTitles, guess.grandSlamTitles)}</span>
        <span class="property-feedback ${getFeedbackClass(comparisons.careerTitles)}">${getFeedbackText('careerTitles', comparisons.careerTitles, guess.careerTitles)}</span>
        <span class="property-feedback ${getFeedbackClass(comparisons.highestRanking)}">${getFeedbackText('highestRanking', comparisons.highestRanking, '#' + guess.highestRanking)}</span>
        <span class="property-feedback ${getFeedbackClass(comparisons.turnedPro)}">${getFeedbackText('turnedPro', comparisons.turnedPro, guess.turnedPro)}</span>
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
      'status': 'Status',
      'hand': 'Hand',
      'backhand': 'Backhand',
      'grandSlamTitles': 'Grand Slams',
      'careerTitles': 'Titles',
      'highestRanking': 'Best Rank',
      'age': 'Age',
      'turnedPro': 'Pro Since'
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
        <span class="property-feedback answer-reveal-feedback">${getAnswerFeedbackText('status', secret.status)}</span>
        <span class="property-feedback answer-reveal-feedback">${getAnswerFeedbackText('age', ageDisplay)}</span>
        <span class="property-feedback answer-reveal-feedback">${getAnswerFeedbackText('hand', secret.hand)}</span>
        <span class="property-feedback answer-reveal-feedback">${getAnswerFeedbackText('backhand', secret.backhand)}</span>
        <span class="property-feedback answer-reveal-feedback">${getAnswerFeedbackText('grandSlamTitles', secret.grandSlamTitles)}</span>
        <span class="property-feedback answer-reveal-feedback">${getAnswerFeedbackText('careerTitles', secret.careerTitles)}</span>
        <span class="property-feedback answer-reveal-feedback">${getAnswerFeedbackText('highestRanking', '#' + secret.highestRanking)}</span>
        <span class="property-feedback answer-reveal-feedback">${getAnswerFeedbackText('turnedPro', secret.turnedPro)}</span>
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
            hand: g.hand,
            age: g.age,
            grandSlams: g.grandSlams,
            ranking: g.ranking,
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
      successMessage: '✅ Copied!',
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
  loadPlayersData();
});
