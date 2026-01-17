document.addEventListener("DOMContentLoaded", () => {
  // Constants
  const MAX_GUESSES = 10;

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

  // Load embedded data
  function loadPlayersData() {
    try {
      // Check if PLAYERS_DATA is available (loaded from data/players_data.js)
      if (typeof PLAYERS_DATA === 'undefined' || !PLAYERS_DATA || PLAYERS_DATA.length === 0) {
        throw new Error('Dados dos jogadores não carregados. Por favor, verifique se data/players_data.js está incluído.');
      }
      
      ALL_PLAYERS = PLAYERS_DATA;
      console.log('Jogadores carregados:', ALL_PLAYERS.length);
      
      // Filter for daily secret selection: only easy/medium difficulty
      DAILY_ELIGIBLE_PLAYERS = ALL_PLAYERS.filter(player => 
        player.difficulty === 'easy' || player.difficulty === 'medium'
      );
      console.log('Jogadores elegíveis para segredo diário:', DAILY_ELIGIBLE_PLAYERS.length);
      
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
      
      // Initialize game
      if (DAILY_ELIGIBLE_PLAYERS.length > 0) {
        initializeGame();
        console.log('Jogo inicializado');
      } else {
        console.error('Nenhum jogador disponível');
        alert('Nenhum jogador disponível. Por favor, atualize a página.');
      }
    } catch (error) {
      console.error('Erro ao carregar dados dos jogadores:', error);
      alert('Falha ao carregar dados dos jogadores: ' + error.message + '. Por favor, atualize a página.');
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

  function calculateAge(dateOfBirth, deathDate = null) {
    const endDate = deathDate ? new Date(deathDate) : new Date();
    const birthDate = new Date(dateOfBirth);
    let age = endDate.getFullYear() - birthDate.getFullYear();
    const monthDiff = endDate.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && endDate.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

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
      'playedWorldCup': 'Copa do Mundo'
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
    
    if (comparison === 'match') {
      return '✅ ' + propertyName + ': ' + formattedValue;
    } else if (comparison === 'higher') {
      return '🔼 ' + propertyName + ': ' + formattedValue;
    } else if (comparison === 'lower') {
      return '🔽 ' + propertyName + ': ' + formattedValue;
    } else {
      return '❌ ' + propertyName + ': ' + formattedValue;
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
    const lowerQuery = query.toLowerCase().trim();
    // Allow guessing any player from the entire database
    return ALL_PLAYERS.filter(player => 
      player.name.toLowerCase().includes(lowerQuery) &&
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
      alert('Jogador não encontrado. Por favor, selecione das sugestões.');
      return;
    }
    
    // Check if already guessed
    if (gameState.guesses.some(g => g.name === guess.name)) {
      alert('Você já chutou este jogador!');
      return;
    }
    
    const comparisons = compareProperties(gameState.secretPlayer, guess);
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
      'playedWorldCup': 'Copa do Mundo'
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
    
    guessSection.style.display = 'none';
    shareSection.style.display = 'block';
  }

  function shareResults() {
    const gameUrl = window.location.origin + window.location.pathname;
    let shareText;
    
    if (gameState.isSolved) {
      const guessText = gameState.guesses.length === 1 ? 'palpite' : 'palpites';
      const status = `Resolvido em ${gameState.guesses.length} ${guessText}!`;
      shareText = `🎉 FutQuiz: o quiz diário da bola ⚽\n${status}\n\nJogue em: ${gameUrl}`;
    } else if (gameState.gaveUp) {
      const guessText = gameState.guesses.length === 1 ? 'palpite' : 'palpites';
      const status = `Desistiu após ${gameState.guesses.length} ${guessText}`;
      shareText = `😞 FutQuiz: o quiz diário da bola ⚽\n${status}\n\nJogue em: ${gameUrl}`;
    } else {
      const status = `Fim de Jogo após ${MAX_GUESSES} palpites`;
      shareText = `❌ FutQuiz: o quiz diário da bola ⚽\n${status}\n\nJogue em: ${gameUrl}`;
    }
    
    // Track share
    if (typeof gtag === 'function') {
      gtag('event', 'share_clicked', {
        solved: gameState.isSolved,
        guesses: gameState.guesses.length
      });
    }
    
    // Try to use Web Share API if available
    if (navigator.share) {
      navigator.share({
        title: 'FutQuiz: o quiz diário da bola',
        text: shareText
      }).catch(err => {
        // Fallback to clipboard
        copyToClipboard(shareText);
      });
    } else {
      // Fallback to clipboard
      copyToClipboard(shareText);
    }
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      // Show feedback
      const originalText = shareResultsBtn.textContent;
      shareResultsBtn.textContent = 'Copiado!';
      shareResultsBtn.style.backgroundColor = 'var(--success-color)';
      setTimeout(() => {
        shareResultsBtn.textContent = originalText;
        shareResultsBtn.style.backgroundColor = '';
      }, 2000);
    }).catch(err => {
      // Fallback: create temporary textarea
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        const originalText = shareResultsBtn.textContent;
        shareResultsBtn.textContent = 'Copiado!';
        shareResultsBtn.style.backgroundColor = 'var(--success-color)';
        setTimeout(() => {
          shareResultsBtn.textContent = originalText;
          shareResultsBtn.style.backgroundColor = '';
        }, 2000);
      } catch (err) {
        alert('Falha ao copiar. Por favor, copie manualmente:\n\n' + text);
      }
      document.body.removeChild(textarea);
    });
  }

  function updateGameState() {
    // Just show the count, no limit
    guessCountEl.textContent = gameState.guesses.length;
    
    // Clear status message if game is still active
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

  // Load data and initialize
  loadPlayersData();
});
