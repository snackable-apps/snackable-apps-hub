document.addEventListener("DOMContentLoaded", async () => {
  // ========== SHARED UTILITIES INTEGRATION ==========
  const i18n = new I18n();
  await i18n.init();
  
  const gameStorage = new GameStorage('f1');
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
  const driverInput = document.getElementById("driver-input");
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
  const dataSeasonInfoEl = document.getElementById("data-season-info");
  
  // Autocomplete state
  let autocompleteState = {
    selectedIndex: -1,
    filteredDrivers: [],
    isOpen: false
  };

  // Data storage
  let ALL_DRIVERS_LIST = []; // All drivers (for guessing)
  let SECRET_POOL = []; // Easy + Medium drivers (for daily secret selection)

  // Use centralized normalizeText from GameUtils
  const normalizeText = GameUtils.normalizeText;

  // Load embedded data
  function loadDriversData() {
    try {
      if (typeof DRIVERS_DATA === 'undefined' || !DRIVERS_DATA || DRIVERS_DATA.length === 0) {
        throw new Error('Driver data not loaded. Please check if data/drivers_data.js is included.');
      }
      
      // All drivers available for guessing
      ALL_DRIVERS_LIST = DRIVERS_DATA;
      
      // Secret pool: only easy + medium drivers
      SECRET_POOL = ALL_DRIVERS_LIST.filter(driver => 
        driver.difficulty === 'easy' || driver.difficulty === 'medium'
      );
      
      // Set data freshness info
      if (dataSeasonInfoEl) {
        try {
          if (typeof DATA_SEASON !== 'undefined' && typeof DATA_LAST_RACE !== 'undefined' && typeof DATA_LAST_RACE_DATE !== 'undefined') {
            const raceDate = new Date(DATA_LAST_RACE_DATE).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            dataSeasonInfoEl.textContent = `${DATA_SEASON} season (${DATA_LAST_RACE}, ${raceDate})`;
          } else {
            dataSeasonInfoEl.textContent = '2025 season';
          }
        } catch (e) {
          console.error('Error setting data freshness:', e);
          dataSeasonInfoEl.textContent = '2025 season';
        }
      }
      
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
        console.error('No drivers available in secret pool');
        GameUtils.showError('common.noDataAvailable', true);
      }
    } catch (error) {
      console.error('Error loading driver data:', error);
      // Hide loading on error too
      const loadingState = document.getElementById('loading-state');
      if (loadingState) loadingState.style.display = 'none';
      GameUtils.showError('common.loadError', true);
    }
  }
  
  // Restore and display the completed daily game result
  function restoreDailyResult() {
    const todaysDriver = getDailyDriver();
    
    gameState.secretDriver = todaysDriver;
    gameState.currentDate = getDateString();
    gameState.isGameOver = true;
    gameState.isRandomMode = false;
    
    // Restore guesses and state from storage
    if (dailyState.gameData) {
      gameState.guesses = dailyState.gameData.guesses || [];
      gameState.isSolved = dailyState.gameData.won;
      gameState.gaveUp = !dailyState.gameData.won;
    } else {
      // Fallback if no detailed data
      gameState.guesses = [];
      gameState.isSolved = dailyState.won || false;
      gameState.gaveUp = !gameState.isSolved;
    }
    
    // Rebuild clues state from guesses
    resetCluesState();
    gameState.guesses.forEach(guess => {
      if (guess.comparisons) {
        updateCluesState(guess, guess.comparisons);
      }
    });
    
    // Hide guess section, show share section
    guessSection.style.display = 'none';
    shareSection.style.display = 'flex';
    
    // Hide clues panel when showing completed result
    if (cluesPanel) cluesPanel.style.display = 'none';
    
    // Update UI to show result
    updateGameState();
    
    // Ensure clues panel stays hidden after updateGameState
    if (cluesPanel) cluesPanel.style.display = 'none';
  }
  
  // Play Random - start a new random game
  function playRandom() {
    const currentName = gameState.secretDriver ? gameState.secretDriver.name : null;
    const availableDrivers = SECRET_POOL.filter(d => d.name !== currentName);
    const randomIndex = Math.floor(Math.random() * availableDrivers.length);
    const randomDriver = availableDrivers[randomIndex] || SECRET_POOL[0];
    
    // Reset game state
    gameState.secretDriver = randomDriver;
    gameState.currentDate = getDateString();
    gameState.guesses = [];
    gameState.isSolved = false;
    gameState.isGameOver = false;
    gameState.gaveUp = false;
    gameState.isRandomMode = true;
    
    // Reset clues
    resetCluesState();
    
    // Reset UI
    guessesContainer.innerHTML = '';
    guessCountEl.textContent = '0';
    gameStatusEl.textContent = '';
    gameStatusEl.className = '';
    guessSection.style.display = 'flex';
    shareSection.style.display = 'none';
    driverInput.value = '';
    driverInput.disabled = false;
    autocompleteDropdown.style.display = 'none';
    if (cluesPanel) cluesPanel.style.display = 'none';
    
    // Focus input
    setTimeout(() => driverInput.focus(), 100);
    
    if (typeof gtag === 'function') {
      gtag('event', 'f1_play_random', { driver: randomDriver.name });
    }
  }

  // Game State
  let gameState = {
    secretDriver: null,
    guesses: [],
    isSolved: false,
    isGameOver: false,
    gaveUp: false,
    currentDate: null,
    isRandomMode: dailyCompleted,
    // Timing tracking
    sessionStartTime: null,
    firstGuessTime: null
  };

  // Clues State
  let cluesState = {
    ageMin: null, ageMax: null, ageConfirmed: null,
    wdcMin: null, wdcMax: null, wdcConfirmed: null,
    winsMin: null, winsMax: null, winsConfirmed: null,
    podiumsMin: null, podiumsMax: null, podiumsConfirmed: null,
    nationalityConfirmed: null,
    teamConfirmed: null,
    matchedTeams: new Set(),
    totalTeamsCount: 0,
    excludedNationalities: new Set(),
    excludedTeams: new Set()
  };

  const cluesPanel = document.getElementById('clues-panel');
  const cluesContent = document.getElementById('clues-content');
  const cluesHeader = document.getElementById('clues-header');
  const cluesToggle = document.getElementById('clues-toggle');

  // Use centralized utility functions from GameUtils
  const getDateString = GameUtils.getDateString.bind(GameUtils);
  const calculateAge = GameUtils.calculateAge;

  function getDailyDriver() {
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
    
    // Current Team
    comparisons.currentTeam = secret.currentTeam === guess.currentTeam ? 'match' : 'different';
    
    // World Championships
    if (secret.worldChampionships === guess.worldChampionships) {
      comparisons.worldChampionships = 'match';
    } else if (guess.worldChampionships > secret.worldChampionships) {
      comparisons.worldChampionships = 'lower';
    } else {
      comparisons.worldChampionships = 'higher';
    }
    
    // Wins
    if (secret.wins === guess.wins) {
      comparisons.wins = 'match';
    } else if (guess.wins > secret.wins) {
      comparisons.wins = 'lower';
    } else {
      comparisons.wins = 'higher';
    }
    
    // Podiums
    if (secret.podiums === guess.podiums) {
      comparisons.podiums = 'match';
    } else if (guess.podiums > secret.podiums) {
      comparisons.podiums = 'lower';
    } else {
      comparisons.podiums = 'higher';
    }
    
    // Age (use death date for deceased drivers)
    const secretAge = calculateAge(secret.birthdate, secret.deathDate);
    const guessAge = calculateAge(guess.birthdate, guess.deathDate);
    if (secretAge === guessAge) {
      comparisons.age = 'match';
    } else if (guessAge > secretAge) {
      comparisons.age = 'lower';
    } else {
      comparisons.age = 'higher';
    }
    
    // Teams history - check for overlap
    const secretTeams = new Set(secret.teamsHistory);
    const guessTeams = guess.teamsHistory;
    const commonTeams = guessTeams.filter(t => secretTeams.has(t));
    comparisons.teamsHistory = {
      matches: commonTeams,
      nonMatches: guessTeams.filter(t => !secretTeams.has(t)),
      hasMatch: commonTeams.length > 0,
      allMatch: commonTeams.length === guessTeams.length && commonTeams.length === secret.teamsHistory.length
    };
    
    return comparisons;
  }

  function getFeedbackText(property, comparison, value) {
    const propertyNames = {
      'nationality': 'Nationality',
      'currentTeam': 'Current Team',
      'worldChampionships': 'WDC',
      'wins': 'Wins',
      'podiums': 'Podiums',
      'age': 'Age',
      'teamsHistory': 'Teams History'
    };
    const propertyName = propertyNames[property] || property;
    
    // Handle teams history (array) with individual match highlighting
    if (property === 'teamsHistory' && typeof comparison === 'object') {
      const teamsHtml = value.map(team => {
        if (comparison.matches.includes(team)) {
          return `<span class="team-match">${team}</span>`;
        } else {
          return `<span class="team-nomatch">${team}</span>`;
        }
      }).join(', ');
      const emoji = comparison.allMatch ? '✅' : (comparison.hasMatch ? '🔶' : '❌');
      return `${emoji} ${propertyName}: ${teamsHtml}`;
    }
    
    const formattedValue = property === 'age' ? `${value}` : value;
    
    if (comparison === 'match') {
      return `✅ ${propertyName}: ${formattedValue}`;
    } else if (comparison === 'higher') {
      return `🔼 ${propertyName}: ${formattedValue}`;
    } else if (comparison === 'lower') {
      return `🔽 ${propertyName}: ${formattedValue}`;
    } else {
      return `❌ ${propertyName}: ${formattedValue}`;
    }
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

  function updateCluesState(guess, comparisons) {
    const guessAge = calculateAge(guess.birthdate, guess.deathDate);
    
    if (comparisons.age === 'match') cluesState.ageConfirmed = guessAge;
    else if (comparisons.age === 'higher') { if (cluesState.ageMin === null || guessAge > cluesState.ageMin) cluesState.ageMin = guessAge; }
    else if (comparisons.age === 'lower') { if (cluesState.ageMax === null || guessAge < cluesState.ageMax) cluesState.ageMax = guessAge; }

    if (comparisons.worldChampionships === 'match') cluesState.wdcConfirmed = guess.worldChampionships;
    else if (comparisons.worldChampionships === 'higher') { if (cluesState.wdcMin === null || guess.worldChampionships > cluesState.wdcMin) cluesState.wdcMin = guess.worldChampionships; }
    else if (comparisons.worldChampionships === 'lower') { if (cluesState.wdcMax === null || guess.worldChampionships < cluesState.wdcMax) cluesState.wdcMax = guess.worldChampionships; }

    if (comparisons.wins === 'match') cluesState.winsConfirmed = guess.wins;
    else if (comparisons.wins === 'higher') { if (cluesState.winsMin === null || guess.wins > cluesState.winsMin) cluesState.winsMin = guess.wins; }
    else if (comparisons.wins === 'lower') { if (cluesState.winsMax === null || guess.wins < cluesState.winsMax) cluesState.winsMax = guess.wins; }

    if (comparisons.podiums === 'match') cluesState.podiumsConfirmed = guess.podiums;
    else if (comparisons.podiums === 'higher') { if (cluesState.podiumsMin === null || guess.podiums > cluesState.podiumsMin) cluesState.podiumsMin = guess.podiums; }
    else if (comparisons.podiums === 'lower') { if (cluesState.podiumsMax === null || guess.podiums < cluesState.podiumsMax) cluesState.podiumsMax = guess.podiums; }

    if (comparisons.nationality === 'match') cluesState.nationalityConfirmed = guess.nationality;
    else cluesState.excludedNationalities.add(guess.nationality);

    if (comparisons.currentTeam === 'match') cluesState.teamConfirmed = guess.currentTeam;
    else cluesState.excludedTeams.add(guess.currentTeam);

    // Teams History - track total count on first guess
    if (cluesState.totalTeamsCount === 0 && gameState.secretDriver && gameState.secretDriver.teamsHistory) {
      cluesState.totalTeamsCount = gameState.secretDriver.teamsHistory.length;
    }
    if (comparisons.teamsHistory && comparisons.teamsHistory.matches) {
      comparisons.teamsHistory.matches.forEach(t => cluesState.matchedTeams.add(t));
    }
  }

  function renderCluesPanel() {
    if (gameState.guesses.length === 0) { cluesPanel.style.display = 'none'; return; }
    cluesPanel.style.display = 'block';

    function renderRange(itemId, valueId, min, max, confirmed) {
      const item = document.getElementById(itemId);
      const value = document.getElementById(valueId);
      if (confirmed !== null) { item.className = 'clue-item confirmed'; value.textContent = confirmed; }
      else if (min !== null || max !== null) {
        item.className = 'clue-item narrowed';
        if (min !== null && max !== null) value.textContent = `${min + 1}-${max - 1}`;
        else if (min !== null) value.textContent = `>${min}`;
        else value.textContent = `<${max}`;
      } else { item.className = 'clue-item'; value.textContent = '?'; }
    }

    renderRange('clue-age', 'clue-age-value', cluesState.ageMin, cluesState.ageMax, cluesState.ageConfirmed);
    renderRange('clue-wdc', 'clue-wdc-value', cluesState.wdcMin, cluesState.wdcMax, cluesState.wdcConfirmed);
    renderRange('clue-wins', 'clue-wins-value', cluesState.winsMin, cluesState.winsMax, cluesState.winsConfirmed);
    renderRange('clue-podiums', 'clue-podiums-value', cluesState.podiumsMin, cluesState.podiumsMax, cluesState.podiumsConfirmed);

    function renderCategorical(itemId, valueId, confirmed) {
      const item = document.getElementById(itemId);
      const value = document.getElementById(valueId);
      if (confirmed) { item.className = 'clue-item confirmed'; value.textContent = confirmed; }
      else { item.className = 'clue-item'; value.textContent = '?'; }
    }

    renderCategorical('clue-nationality', 'clue-nationality-value', cluesState.nationalityConfirmed);
    renderCategorical('clue-team', 'clue-team-value', cluesState.teamConfirmed);

    const teamsRow = document.getElementById('clue-teams-row');
    const teamsContainer = document.getElementById('clue-teams');
    if (cluesState.totalTeamsCount > 0) {
      teamsRow.style.display = 'flex';
      const unknownCount = cluesState.totalTeamsCount - cluesState.matchedTeams.size;
      const matchedTags = [...cluesState.matchedTeams].map(t => `<span class="clue-tag">${t}</span>`);
      const unknownTags = Array(unknownCount).fill('<span class="clue-tag unknown">????</span>');
      teamsContainer.innerHTML = [...matchedTags, ...unknownTags].join('');
    } else { teamsRow.style.display = 'none'; }

    // Render excluded sections using centralized utility
    const excludedRow = document.getElementById('clue-excluded-row');
    const nationalitySection = document.getElementById('clue-excluded-nationality-section');
    const teamSection = document.getElementById('clue-excluded-team-section');
    
    const hasNationality = GameUtils.renderExcludedSection({
      containerEl: nationalitySection,
      excludedSet: cluesState.excludedNationalities,
      confirmedValue: cluesState.nationalityConfirmed,
      maxItems: 5
    });
    
    const hasTeam = GameUtils.renderExcludedSection({
      containerEl: teamSection,
      excludedSet: cluesState.excludedTeams,
      confirmedValue: cluesState.teamConfirmed,
      maxItems: 4
    });
    
    excludedRow.style.display = (hasNationality || hasTeam) ? 'flex' : 'none';
  }

  function resetCluesState() {
    cluesState = { ageMin: null, ageMax: null, ageConfirmed: null, wdcMin: null, wdcMax: null, wdcConfirmed: null, winsMin: null, winsMax: null, winsConfirmed: null, podiumsMin: null, podiumsMax: null, podiumsConfirmed: null, nationalityConfirmed: null, teamConfirmed: null, matchedTeams: new Set(), totalTeamsCount: 0, excludedNationalities: new Set(), excludedTeams: new Set() };
  }

  function displayGuess(guess, comparisons) {
    const guessCard = document.createElement('div');
    guessCard.className = 'guess-card';
    
    const isCorrect = guess.name === gameState.secretDriver.name;
    const driverNameClass = isCorrect ? 'guess-driver-header correct' : 'guess-driver-header';
    
    const guessLine = document.createElement('div');
    guessLine.className = 'guess-line';
    
    // Driver header
    const driverHeader = document.createElement('span');
    driverHeader.className = driverNameClass;
    driverHeader.innerHTML = `
      <span class="driver-emoji-inline">🏎️</span>
      <span class="driver-name-inline">${guess.name}</span>
      ${isCorrect ? '<span class="correct-badge">🏆</span>' : '<span class="wrong-badge">❌</span>'}
    `;
    guessLine.appendChild(driverHeader);
    
    // Properties
    const properties = [
      { key: 'nationality', value: guess.nationality, comparison: comparisons.nationality },
      { key: 'currentTeam', value: guess.currentTeam, comparison: comparisons.currentTeam },
      { key: 'worldChampionships', value: guess.worldChampionships, comparison: comparisons.worldChampionships },
      { key: 'wins', value: guess.wins, comparison: comparisons.wins },
      { key: 'podiums', value: guess.podiums, comparison: comparisons.podiums },
      { key: 'age', value: calculateAge(guess.birthdate, guess.deathDate) + (guess.deathDate ? ' †' : ''), comparison: comparisons.age },
      { key: 'teamsHistory', value: guess.teamsHistory, comparison: comparisons.teamsHistory }
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

  function filterDrivers(query) {
    if (!query || query.trim() === '') return [];
    const normalizedQuery = normalizeText(query.trim());
    return ALL_DRIVERS_LIST.filter(driver => 
      normalizeText(driver.name).includes(normalizedQuery) &&
      !gameState.guesses.some(g => g.name === driver.name)
    ).slice(0, 10);
  }

  function displayAutocomplete(results) {
    autocompleteDropdown.innerHTML = '';
    autocompleteState.filteredDrivers = results;
    autocompleteState.selectedIndex = -1;
    
    if (results.length === 0) {
      autocompleteDropdown.style.display = 'none';
      autocompleteState.isOpen = false;
      return;
    }
    
    autocompleteDropdown.style.display = 'block';
    autocompleteState.isOpen = true;
    
    results.forEach((driver, index) => {
      const item = document.createElement('div');
      item.className = 'autocomplete-item';
      item.innerHTML = `<span class="driver-name">${driver.name}</span>`;
      item.addEventListener('click', () => selectDriver(driver.name));
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
      item.classList.toggle('selected', index === autocompleteState.selectedIndex);
    });
  }

  function selectDriver(driverName) {
    driverInput.value = driverName;
    autocompleteDropdown.style.display = 'none';
    autocompleteState.isOpen = false;
    driverInput.focus();
  }

  function submitGuess() {
    if (gameState.isSolved || gameState.isGameOver) return;
    
    const inputValue = driverInput.value.trim();
    if (!inputValue) return;
    
    const guess = ALL_DRIVERS_LIST.find(d => d.name.toLowerCase() === inputValue.toLowerCase());
    if (!guess) {
      GameUtils.showWarning(i18n.t('common.notFound', { item: i18n.t('games.f1.title') }));
      return;
    }
    
    if (gameState.guesses.some(g => g.name === guess.name)) {
      GameUtils.showWarning(i18n.t('common.alreadyGuessed', { item: i18n.t('games.f1.title') }));
      return;
    }
    
    // Track first guess time
    if (gameState.guesses.length === 0 && !gameState.firstGuessTime) {
      gameState.firstGuessTime = Date.now();
    }
    
    const comparisons = compareProperties(gameState.secretDriver, guess);
    updateCluesState(guess, comparisons);
    gameState.guesses.push(guess);
    
    displayGuess(guess, comparisons);
    updateGameState();
    
    if (guess.name === gameState.secretDriver.name) {
      endGame(true);
      return;
    }
    
    if (typeof gtag === 'function') {
      gtag('event', 'guess', {
        driver: guess.name,
        guess_number: gameState.guesses.length
      });
    }
    
    driverInput.value = '';
    autocompleteDropdown.style.display = 'none';
    autocompleteState.isOpen = false;
  }

  function displayAnswer() {
    const answerCard = document.createElement('div');
    answerCard.className = 'guess-card answer-reveal';
    const secret = gameState.secretDriver;
    
    answerCard.innerHTML = `
      <div class="guess-line">
        <span class="guess-driver-header answer-reveal-header">
          <span class="driver-emoji-inline">🏎️</span>
          <span class="driver-name-inline">${secret.name}</span>
          <span>🏆</span>
        </span>
        <span class="property-feedback answer-reveal-feedback">Nationality: ${secret.nationality}</span>
        <span class="property-feedback answer-reveal-feedback">Current Team: ${secret.currentTeam}</span>
        <span class="property-feedback answer-reveal-feedback">WDC: ${secret.worldChampionships}</span>
        <span class="property-feedback answer-reveal-feedback">Wins: ${secret.wins}</span>
        <span class="property-feedback answer-reveal-feedback">Podiums: ${secret.podiums}</span>
        <span class="property-feedback answer-reveal-feedback">Age: ${calculateAge(secret.birthdate, secret.deathDate)}${secret.deathDate ? ' †' : ''}</span>
      </div>
    `;
    guessesContainer.insertBefore(answerCard, guessesContainer.firstChild);
  }

  function giveUp() {
    if (gameState.isSolved || gameState.isGameOver) return;
    
    gameState.gaveUp = true;
    
    if (typeof gtag === 'function') {
      const giveUpTime = Date.now();
      const timeToGiveUp = gameState.firstGuessTime 
        ? Math.round((giveUpTime - gameState.firstGuessTime) / 1000)
        : null;
      const sessionDuration = gameState.sessionStartTime 
        ? Math.round((giveUpTime - gameState.sessionStartTime) / 1000)
        : null;
      
      gtag('event', 'game_gave_up', {
        guesses: gameState.guesses.length,
        date: gameState.currentDate,
        time_to_give_up_seconds: timeToGiveUp,
        session_duration_seconds: sessionDuration
      });
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
      
      if (typeof gtag === 'function') {
        const solveTime = Date.now();
        const timeToSolve = gameState.firstGuessTime 
          ? Math.round((solveTime - gameState.firstGuessTime) / 1000)
          : null;
        const sessionDuration = gameState.sessionStartTime 
          ? Math.round((solveTime - gameState.sessionStartTime) / 1000)
          : null;
        
        gtag('event', 'game_solved', {
          guesses: gameState.guesses.length,
          date: gameState.currentDate,
          time_to_solve_seconds: timeToSolve,
          session_duration_seconds: sessionDuration
        });
      }
    } else {
      if (gameState.gaveUp) {
        gameStatusEl.textContent = `😔 Gave up after ${gameState.guesses.length} ${guessText}`;
      } else {
        gameStatusEl.textContent = `❌ Game Over after ${gameState.guesses.length} ${guessText}`;
        displayAnswer();
      }
      gameStatusEl.className = 'game-over';
    }
    
    // Save game result to storage
    if (!dailyCompleted && !gameState.isRandomMode) {
      gameStorage.completeDailyGame({
        won: solved,
        guesses: gameState.guesses.length,
        driver: gameState.secretDriver.name,
        gameData: {
          won: solved,
          guesses: gameState.guesses.map(g => ({
            name: g.name,
            nationality: g.nationality,
            currentTeam: g.currentTeam,
            worldChampionships: g.worldChampionships,
            wins: g.wins,
            podiums: g.podiums,
            birthdate: g.birthdate,
            deathDate: g.deathDate,
            comparisons: g.comparisons,
            isCorrect: g.isCorrect
          }))
        }
      });
      dailyCompleted = true;
    }
    
    guessSection.style.display = 'none';
    shareSection.style.display = 'flex';
    
    // Hide clues panel when game ends
    if (cluesPanel) cluesPanel.style.display = 'none';
  }

  function shareResults() {
    const gameUrl = window.location.origin + window.location.pathname;
    const guessText = gameState.guesses.length === 1 ? 'guess' : 'guesses';
    const gameType = gameState.isRandomMode ? '🎲 Random' : getDateString();
    
    let shareText;
    if (gameState.isSolved) {
      shareText = `🏎️ F1 Quiz ${gameType}\n🏆 Solved in ${gameState.guesses.length} ${guessText}!\n\nPlay: ${gameUrl}`;
    } else {
      shareText = `🏎️ F1 Quiz ${gameType}\n😔 Gave up after ${gameState.guesses.length} ${guessText}\n\nPlay: ${gameUrl}`;
    }
    
    GameUtils.shareGameResult({
      text: shareText,
      title: 'F1 Quiz Result',
      button: shareResultsBtn,
      successMessage: '✅ Copied!',
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
    gameState.secretDriver = getDailyDriver();
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
    driverInput.value = '';
    autocompleteDropdown.style.display = 'none';
    
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
  
  driverInput.addEventListener('input', (e) => {
    const results = filterDrivers(e.target.value);
    displayAutocomplete(results);
  });
  
  driverInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (autocompleteState.isOpen && autocompleteState.selectedIndex >= 0) {
        selectDriver(autocompleteState.filteredDrivers[autocompleteState.selectedIndex].name);
        submitGuess();
      } else {
        submitGuess();
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (autocompleteState.isOpen && autocompleteState.filteredDrivers.length > 0) {
        autocompleteState.selectedIndex = Math.min(
          autocompleteState.selectedIndex + 1,
          autocompleteState.filteredDrivers.length - 1
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
    if (!driverInput.contains(e.target) && !autocompleteDropdown.contains(e.target)) {
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

  // Initialize
  loadDriversData();
});

