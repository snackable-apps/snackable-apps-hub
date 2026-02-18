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

  // Load embedded data
  function loadPlayersData() {
    try {
      // Check if PLAYERS_DATA is available (loaded from data/players_data.js)
      if (typeof PLAYERS_DATA === 'undefined' || !PLAYERS_DATA || PLAYERS_DATA.length === 0) {
        throw new Error('Player data not loaded. Please check if data/players_data.js is included.');
      }
      
      ALL_PLAYERS = PLAYERS_DATA;
      
      // Filter for daily secret selection: only easy/medium difficulty
      DAILY_ELIGIBLE_PLAYERS = ALL_PLAYERS.filter(player => 
        player.difficulty === 'easy' || player.difficulty === 'medium'
      );
      
      // Display data update date
      if (typeof DATA_UPDATE_DATE !== 'undefined' && dataUpdateDateEl) {
        const updateDate = new Date(DATA_UPDATE_DATE);
        const formattedDate = updateDate.toLocaleDateString('pt-BR', { 
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric' 
        });
        dataUpdateDateEl.textContent = formattedDate;
      }
      
      // Hide loading state, show game
      const loadingState = document.getElementById('loading-state');
      if (loadingState) loadingState.style.display = 'none';
      
      // Initialize game
      if (DAILY_ELIGIBLE_PLAYERS.length > 0) {
        // Check if daily is completed - show result instead of restarting
        if (dailyCompleted && dailyState) {
          restoreDailyResult();
        } else {
          guessSection.style.display = 'flex';
          initializeGame();
        }
      } else {
        console.error('No players available');
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
    footConfirmed: null,
    worldCupConfirmed: null,
    matchedLeagues: new Set(),
    totalLeaguesCount: 0,
    matchedTeamTitles: new Set(),
    totalTitlesCount: 0,
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
    const date = new Date(dateString);
    const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
    const index = dayOfYear % DAILY_ELIGIBLE_PLAYERS.length;
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
    
    // Nationality - can be array or string
    const nationalityComparison = compareArrayProperty(secret.nationality, guess.nationality);
    comparisons.nationality = nationalityComparison;
    
    // Current Club - categorical
    comparisons.currentClub = secret.currentClub === guess.currentClub ? 'match' : 'different';
    
    // Leagues Played - array
    const leaguesComparison = compareArrayProperty(secret.leaguesPlayed, guess.leaguesPlayed);
    comparisons.leaguesPlayed = leaguesComparison;
    
    // Primary Position - categorical
    comparisons.primaryPosition = secret.primaryPosition === guess.primaryPosition ? 'match' : 'different';
    
    // Age - calculate from dateOfBirth and compare (numeric)
    // Use deathDate for deceased players to show age at death
    const secretAge = calculateAge(secret.dateOfBirth, secret.deathDate);
    const guessAge = calculateAge(guess.dateOfBirth, guess.deathDate);
    if (secretAge === guessAge) {
      comparisons.age = 'match';
    } else if (guessAge > secretAge) {
      comparisons.age = 'lower'; // Guess is higher, so secret is lower - tell user to guess lower
    } else {
      comparisons.age = 'higher'; // Guess is lower, so secret is higher - tell user to guess higher
    }
    
    // Preferred Foot - categorical
    comparisons.preferredFoot = secret.preferredFoot === guess.preferredFoot ? 'match' : 'different';
    
    // Height - numeric
    if (secret.height === guess.height) {
      comparisons.height = 'match';
    } else if (guess.height > secret.height) {
      comparisons.height = 'lower'; // Guess is higher, so secret is lower - tell user to guess lower
    } else {
      comparisons.height = 'higher'; // Guess is lower, so secret is higher - tell user to guess higher
    }
    
    // Individual Titles - array (just check if there's overlap)
    const individualTitlesComparison = compareArrayProperty(secret.individualTitles, guess.individualTitles);
    comparisons.individualTitles = individualTitlesComparison;
    
    // Team Titles - array (just check if there's overlap)
    const teamTitlesComparison = compareArrayProperty(secret.teamTitles, guess.teamTitles);
    comparisons.teamTitles = teamTitlesComparison;
    
    // Played World Cup - boolean/categorical
    comparisons.playedWorldCup = secret.playedWorldCup === guess.playedWorldCup ? 'match' : 'different';
    
    return comparisons;
  }

  function getFeedbackText(property, comparison, value) {
    const propertyNames = {
      'nationality': 'Nacionalidade',
      'currentClub': 'Clube Atual',
      'leaguesPlayed': 'Ligas Jogadas',
      'primaryPosition': 'Posição Primária',
      'age': 'Idade',
      'preferredFoot': 'Pé Preferido',
      'height': 'Altura',
      'individualTitles': 'Prêmios Individuais',
      'teamTitles': 'Títulos Coletivos',
      'playedWorldCup': 'Jogou Copa?'
    };
    const propertyName = propertyNames[property] || property;
    
    // Handle array properties (nationality, leaguesPlayed, individualTitles, teamTitles)
    const arrayProperties = ['nationality', 'leaguesPlayed', 'individualTitles', 'teamTitles'];
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
    if (comparisons.currentClub === 'match') {
      cluesState.clubConfirmed = guess.currentClub;
    } else {
      cluesState.excludedClubs.add(guess.currentClub);
    }

    // Position
    if (comparisons.primaryPosition === 'match') {
      cluesState.positionConfirmed = guess.primaryPosition;
    } else {
      cluesState.excludedPositions.add(guess.primaryPosition);
    }

    // Foot
    if (comparisons.preferredFoot === 'match') {
      cluesState.footConfirmed = guess.preferredFoot;
    }

    // World Cup
    if (comparisons.playedWorldCup === 'match') {
      cluesState.worldCupConfirmed = guess.playedWorldCup ? 'Sim' : 'Não';
    }

    // Leagues - track total count on first guess
    if (cluesState.totalLeaguesCount === 0 && gameState.secretPlayer && gameState.secretPlayer.leaguesPlayed) {
      cluesState.totalLeaguesCount = gameState.secretPlayer.leaguesPlayed.length;
    }
    if (comparisons.leaguesPlayed && comparisons.leaguesPlayed.matches) {
      comparisons.leaguesPlayed.matches.forEach(l => cluesState.matchedLeagues.add(l));
    }

    // Team Titles - track total count on first guess
    if (cluesState.totalTitlesCount === 0 && gameState.secretPlayer && gameState.secretPlayer.teamTitles) {
      cluesState.totalTitlesCount = gameState.secretPlayer.teamTitles.length;
    }
    if (comparisons.teamTitles && comparisons.teamTitles.matches) {
      comparisons.teamTitles.matches.forEach(t => cluesState.matchedTeamTitles.add(t));
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
    renderCategorical('clue-foot', 'clue-foot-value', cluesState.footConfirmed);
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

    // Matched team titles with ???? for undiscovered
    const titlesRow = document.getElementById('clue-titles-row');
    const titlesContainer = document.getElementById('clue-titles');
    if (cluesState.totalTitlesCount > 0) {
      titlesRow.style.display = 'flex';
      const unknownCount = cluesState.totalTitlesCount - cluesState.matchedTeamTitles.size;
      const matchedTags = [...cluesState.matchedTeamTitles].map(t => `<span class="clue-tag">${t}</span>`);
      const unknownTags = Array(unknownCount).fill('<span class="clue-tag unknown">????</span>');
      titlesContainer.innerHTML = [...matchedTags, ...unknownTags].join('');
    } else {
      titlesRow.style.display = 'none';
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
      footConfirmed: null,
      worldCupConfirmed: null,
      matchedLeagues: new Set(),
      totalLeaguesCount: 0,
      matchedTeamTitles: new Set(),
      totalTitlesCount: 0,
      excludedNationalities: new Set(),
      excludedClubs: new Set(),
      excludedPositions: new Set()
    };
  }

  function formatPropertyValue(property, value) {
    if (property === 'height') {
      return `${value} cm`;
    } else if (property === 'age') {
      return `${value} anos`;
    } else if (property === 'playedWorldCup') {
      return value ? 'Sim' : 'Não';
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
      { key: 'preferredFoot', value: guess.preferredFoot, comparison: comparisons.preferredFoot },
      { key: 'height', value: guess.height, comparison: comparisons.height },
      { key: 'individualTitles', value: guess.individualTitles, comparison: comparisons.individualTitles },
      { key: 'teamTitles', value: guess.teamTitles, comparison: comparisons.teamTitles },
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
    gameState.guesses.push(guess);
    
    displayGuess(guess, comparisons);
    updateGameState();
    
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
      'nationality': 'Nacionalidade',
      'currentClub': 'Clube Atual',
      'leaguesPlayed': 'Ligas Jogadas',
      'primaryPosition': 'Posição Primária',
      'age': 'Idade',
      'preferredFoot': 'Pé Preferido',
      'height': 'Altura',
      'individualTitles': 'Prêmios Individuais',
      'teamTitles': 'Títulos Coletivos',
      'playedWorldCup': 'Jogou Copa?'
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
        <span class="property-feedback answer-reveal-feedback">${getAnswerFeedbackText('preferredFoot', secret.preferredFoot)}</span>
        <span class="property-feedback answer-reveal-feedback">${getAnswerFeedbackText('height', secret.height)}</span>
        <span class="property-feedback answer-reveal-feedback">${getAnswerFeedbackText('individualTitles', secret.individualTitles)}</span>
        <span class="property-feedback answer-reveal-feedback">${getAnswerFeedbackText('teamTitles', secret.teamTitles)}</span>
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
            club: g.club,
            position: g.position,
            foot: g.foot,
            height: g.height,
            birthdate: g.birthdate,
            worldCup: g.worldCup,
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
