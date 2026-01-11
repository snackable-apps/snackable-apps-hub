document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
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

  // Load embedded data
  function loadDriversData() {
    try {
      if (typeof DRIVERS_DATA === 'undefined' || !DRIVERS_DATA || DRIVERS_DATA.length === 0) {
        throw new Error('Driver data not loaded. Please check if data/drivers_data.js is included.');
      }
      
      // All drivers available for guessing
      ALL_DRIVERS_LIST = DRIVERS_DATA;
      console.log('Total drivers loaded:', ALL_DRIVERS_LIST.length);
      
      // Secret pool: only easy + medium drivers
      SECRET_POOL = ALL_DRIVERS_LIST.filter(driver => 
        driver.difficulty === 'easy' || driver.difficulty === 'medium'
      );
      console.log('Secret pool (easy+medium):', SECRET_POOL.length);
      
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
      
      if (SECRET_POOL.length > 0) {
        initializeGame();
        console.log('Game initialized');
      } else {
        console.error('No drivers available in secret pool');
        alert('No drivers available.');
      }
    } catch (error) {
      console.error('Error loading driver data:', error);
      alert('Failed to load driver data: ' + error.message);
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
    // Timing tracking
    sessionStartTime: null,
    firstGuessTime: null
  };

  // Utility Functions
  function getDateString() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function calculateAge(birthdate, deathDate = null) {
    const endDate = deathDate ? new Date(deathDate) : new Date();
    const birth = new Date(birthdate);
    let age = endDate.getFullYear() - birth.getFullYear();
    const monthDiff = endDate.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && endDate.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }

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
    const lowerQuery = query.toLowerCase().trim();
    return ALL_DRIVERS_LIST.filter(driver => 
      driver.name.toLowerCase().includes(lowerQuery) &&
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
      alert('Driver not found. Please select from suggestions.');
      return;
    }
    
    if (gameState.guesses.some(g => g.name === guess.name)) {
      alert('You already guessed this driver!');
      return;
    }
    
    // Track first guess time
    if (gameState.guesses.length === 0 && !gameState.firstGuessTime) {
      gameState.firstGuessTime = Date.now();
    }
    
    const comparisons = compareProperties(gameState.secretDriver, guess);
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
    
    guessSection.style.display = 'none';
    shareSection.style.display = 'block';
  }

  function shareResults() {
    const gameUrl = window.location.origin + window.location.pathname;
    const guessText = gameState.guesses.length === 1 ? 'guess' : 'guesses';
    
    let shareText;
    if (gameState.isSolved) {
      shareText = `🏎️ F1 Quiz: Guess the Driver\n🏆 Solved in ${gameState.guesses.length} ${guessText}!\n\nPlay: ${gameUrl}`;
    } else {
      shareText = `🏎️ F1 Quiz: Guess the Driver\n😔 Gave up after ${gameState.guesses.length} ${guessText}\n\nPlay: ${gameUrl}`;
    }
    
    // Track share click
    if (typeof gtag === 'function') {
      gtag('event', 'share_clicked', {
        solved: gameState.isSolved,
        guesses: gameState.guesses.length
      });
    }
    
    if (navigator.share) {
      navigator.share({ title: 'F1 Quiz', text: shareText }).catch(() => copyToClipboard(shareText));
    } else {
      copyToClipboard(shareText);
    }
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      const originalText = shareResultsBtn.textContent;
      shareResultsBtn.textContent = 'Copied!';
      shareResultsBtn.style.backgroundColor = 'var(--success-color)';
      setTimeout(() => {
        shareResultsBtn.textContent = originalText;
        shareResultsBtn.style.backgroundColor = '';
      }, 2000);
    }).catch(() => {
      alert('Failed to copy. Please copy manually:\n\n' + text);
    });
  }

  function updateGameState() {
    guessCountEl.textContent = gameState.guesses.length;
    if (!gameState.isSolved && !gameState.isGameOver) {
      gameStatusEl.textContent = '';
      gameStatusEl.className = '';
    }
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

  // Initialize
  loadDriversData();
});

