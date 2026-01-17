document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
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
      
      if (SECRET_POOL.length > 0) {
        initializeGame();
        console.log('Game initialized');
      } else {
        console.error('No players available in secret pool');
        alert('No players available.');
      }
    } catch (error) {
      console.error('Error loading player data:', error);
      alert('Failed to load player data: ' + error.message);
    }
  }

  // Game State
  let gameState = {
    secretPlayer: null,
    guesses: [],
    isSolved: false,
    isGameOver: false,
    gaveUp: false,
    currentDate: null
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
    const lowerQuery = query.toLowerCase().trim();
    return ALL_PLAYERS.filter(player => 
      player.name.toLowerCase().includes(lowerQuery) &&
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
      alert('Player not found. Please select from the suggestions.');
      return;
    }
    
    if (gameState.guesses.some(g => g.name === guess.name)) {
      alert('You already guessed this player!');
      return;
    }
    
    const comparisons = compareProperties(gameState.secretPlayer, guess);
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
    
    guessSection.style.display = 'none';
    shareSection.style.display = 'block';
  }

  function shareResults() {
    const gameUrl = window.location.origin + window.location.pathname;
    let shareText;
    
    if (gameState.isSolved) {
      const status = `Solved in ${gameState.guesses.length} guess${gameState.guesses.length !== 1 ? 'es' : ''}!`;
      shareText = `🎉 Tennis Quiz 🎾\n${status}\n\nPlay at: ${gameUrl}`;
    } else if (gameState.gaveUp) {
      const status = `Gave up after ${gameState.guesses.length} guess${gameState.guesses.length !== 1 ? 'es' : ''}`;
      shareText = `😞 Tennis Quiz 🎾\n${status}\n\nPlay at: ${gameUrl}`;
    } else {
      const status = `Game Over after ${gameState.guesses.length} guess${gameState.guesses.length !== 1 ? 'es' : ''}`;
      shareText = `❌ Tennis Quiz 🎾\n${status}\n\nPlay at: ${gameUrl}`;
    }
    
    if (navigator.share) {
      navigator.share({
        title: 'Tennis Quiz',
        text: shareText
      }).catch(() => {
        copyToClipboard(shareText);
      });
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
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        const originalText = shareResultsBtn.textContent;
        shareResultsBtn.textContent = 'Copied!';
        shareResultsBtn.style.backgroundColor = 'var(--success-color)';
        setTimeout(() => {
          shareResultsBtn.textContent = originalText;
          shareResultsBtn.style.backgroundColor = '';
        }, 2000);
      } catch (err) {
        alert('Failed to copy. Please copy manually:\n\n' + text);
      }
      document.body.removeChild(textarea);
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
    gameState.secretPlayer = getDailyPlayer();
    gameState.guesses = [];
    gameState.isSolved = false;
    gameState.isGameOver = false;
    gameState.gaveUp = false;
    
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

  // Load data and initialize
  loadPlayersData();
});
