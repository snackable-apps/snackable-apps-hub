document.addEventListener("DOMContentLoaded", () => {
  // Constants
  const MAX_GUESSES = 10;

  // DOM Elements
  const musicInput = document.getElementById("music-input");
  const autocompleteDropdown = document.getElementById("autocomplete-dropdown");
  const submitBtn = document.getElementById("submit-guess");
  const giveUpBtn = document.getElementById("give-up-btn");
  const shareResultsBtn = document.getElementById("share-results-btn");
  const shareSection = document.getElementById("share-section");
  const guessesContainer = document.getElementById("guesses-container");
  const guessCountEl = document.getElementById("guess-count");
  const gameStatusEl = document.getElementById("game-status");
  const guessSection = document.getElementById("guess-section");
  const difficultySection = document.getElementById("difficulty-section");
  const gameInfo = document.getElementById("game-info");
  const currentDifficultyEl = document.getElementById("current-difficulty");
  const difficultyButtons = document.querySelectorAll(".difficulty-btn");
  
  // Autocomplete state
  let autocompleteState = {
    selectedIndex: -1,
    filteredSongs: [],
    isOpen: false
  };

  // Data storage
  let ALL_SONGS = [];
  let SONGS = []; // Filtered by difficulty
  let currentDifficulty = 'easy';

  // Load embedded data
  function loadSongsData() {
    try {
      // Check if SONGS_DATA is available (loaded from data/music_data.js)
      if (typeof SONGS_DATA === 'undefined' || !SONGS_DATA || SONGS_DATA.length === 0) {
        throw new Error('Songs data not loaded. Please ensure data/music_data.js is included.');
      }
      
      ALL_SONGS = SONGS_DATA;
      console.log('Loaded songs:', ALL_SONGS.length);
      
      // Set default difficulty and initialize game
      filterByDifficulty('easy');
      console.log('Filtered songs for easy:', SONGS.length);
      
      // Show difficulty selector
      if (difficultySection) {
        difficultySection.style.display = 'block';
      }
      
      // Auto-initialize game with easy difficulty
      if (SONGS.length > 0) {
        initializeGame();
        console.log('Game initialized');
      } else {
        console.error('No songs available for easy difficulty');
        alert('No songs available. Please try a different difficulty.');
      }
    } catch (error) {
      console.error('Error loading songs data:', error);
      alert('Failed to load songs data: ' + error.message + '. Please refresh the page.');
    }
  }

  // Filter songs by difficulty
  function filterByDifficulty(difficulty) {
    currentDifficulty = difficulty;
    SONGS = ALL_SONGS.filter(song => {
      if (difficulty === 'easy') {
        return song.difficulty === 'easy';
      } else if (difficulty === 'medium') {
        return song.difficulty === 'easy' || song.difficulty === 'medium';
      } else { // hard
        return true; // All songs
      }
    });
    
    // Update UI
    currentDifficultyEl.textContent = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
    difficultyButtons.forEach(btn => {
      if (btn.dataset.difficulty === difficulty) {
        btn.classList.add('selected');
      } else {
        btn.classList.remove('selected');
      }
    });
  }

  // Game State
  let gameState = {
    secretSong: null,
    guesses: [],
    isSolved: false,
    isGameOver: false,
    gaveUp: false,
    currentDate: null,
    difficulty: 'easy'
  };

  // Helper function to get emoji for music
  function getMusicEmoji(songName) {
    return "🎵"; // Default music emoji
  }

  // Utility Functions
  function getDateString() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function getDailySong(difficulty) {
    const dateString = getDateString();
    const date = new Date(dateString);
    const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
    
    // Add difficulty offset to ensure different difficulties get different songs on the same day
    // but same difficulty always gets the same song on the same day
    let difficultyOffset = 0;
    if (difficulty === 'medium') {
      difficultyOffset = 1000; // Large offset to ensure different selection
    } else if (difficulty === 'hard') {
      difficultyOffset = 2000; // Different offset for hard
    }
    
    const index = (dayOfYear + difficultyOffset) % SONGS.length;
    return SONGS[index];
  }

  function formatGroupMembers(members) {
    if (members === 1) return "Solo";
    if (members === 2) return "Duo";
    return members.toString();
  }

  function formatDuration(duration) {
    const minutes = Math.floor(duration);
    const seconds = Math.round((duration - minutes) * 60);
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
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
    
    // Artist - categorical
    comparisons.artist = secret.artist === guess.artist ? 'match' : 'different';
    
    // Artist Country - can be array or string
    const artistCountryComparison = compareArrayProperty(secret.artistCountry, guess.artistCountry);
    comparisons.artistCountry = artistCountryComparison;
    
    // Group Members - numeric (inverted)
    if (secret.groupMembers === guess.groupMembers) {
      comparisons.groupMembers = 'match';
    } else if (guess.groupMembers > secret.groupMembers) {
      comparisons.groupMembers = 'lower';
    } else {
      comparisons.groupMembers = 'higher';
    }
    
    // Release Year - numeric (inverted)
    if (secret.releaseYear === guess.releaseYear) {
      comparisons.releaseYear = 'match';
    } else if (guess.releaseYear > secret.releaseYear) {
      comparisons.releaseYear = 'lower';
    } else {
      comparisons.releaseYear = 'higher';
    }

    // Decade - categorical
    comparisons.decade = secret.decade === guess.decade ? 'match' : 'different';
    
    // Primary Genre - categorical
    comparisons.primaryGenre = secret.primaryGenre === guess.primaryGenre ? 'match' : 'different';
    
    // Language - can be array or string
    const languageComparison = compareArrayProperty(secret.language, guess.language);
    comparisons.language = languageComparison;
    
    // Duration - numeric (inverted)
    if (secret.duration === guess.duration) {
      comparisons.duration = 'match';
    } else if (guess.duration > secret.duration) {
      comparisons.duration = 'lower';
    } else {
      comparisons.duration = 'higher';
    }
    
    return comparisons;
  }

  function getFeedbackText(property, comparison, value) {
    const propertyNames = {
      'artist': 'Artist',
      'artistCountry': 'Artist Country',
      'groupMembers': 'Group Members',
      'releaseYear': 'Release Year',
      'decade': 'Decade',
      'primaryGenre': 'Primary Genre',
      'language': 'Language',
      'duration': 'Duration'
    };
    const propertyName = propertyNames[property] || property;
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
    if (property === 'groupMembers') {
      return formatGroupMembers(value);
    } else if (property === 'duration') {
      return formatDuration(value);
    } else if (property === 'releaseYear') {
      return value.toString();
    }
    return value;
  }

  function displayGuess(guess, comparisons) {
    const guessCard = document.createElement('div');
    guessCard.className = 'guess-card';
    
    const isCorrect = guess.name === gameState.secretSong.name;
    const songNameClass = isCorrect ? 'guess-animal-name correct' : 'guess-animal-name';
    const emoji = getMusicEmoji(guess.name);
    
    guessCard.innerHTML = `
      <div class="guess-line">
        <span class="guess-animal-header ${songNameClass}">
          <span class="animal-emoji-inline">${emoji}</span>
          <span class="animal-name-inline">${guess.name}</span>
          ${isCorrect ? '<span class="correct-badge">🎉</span>' : '<span class="wrong-badge">😞</span>'}
        </span>
        <span class="property-feedback ${getFeedbackClass(comparisons.artist)}">${getFeedbackText('artist', comparisons.artist, guess.artist)}</span>
        <span class="property-feedback ${getFeedbackClass(comparisons.artistCountry)}">${getFeedbackText('artistCountry', comparisons.artistCountry, guess.artistCountry)}</span>
        <span class="property-feedback ${getFeedbackClass(comparisons.groupMembers)}">${getFeedbackText('groupMembers', comparisons.groupMembers, guess.groupMembers)}</span>
        <span class="property-feedback ${getFeedbackClass(comparisons.releaseYear)}">${getFeedbackText('releaseYear', comparisons.releaseYear, guess.releaseYear)}</span>
        <span class="property-feedback ${getFeedbackClass(comparisons.decade)}">${getFeedbackText('decade', comparisons.decade, guess.decade)}</span>
        <span class="property-feedback ${getFeedbackClass(comparisons.primaryGenre)}">${getFeedbackText('primaryGenre', comparisons.primaryGenre, guess.primaryGenre)}</span>
        <span class="property-feedback ${getFeedbackClass(comparisons.language)}">${getFeedbackText('language', comparisons.language, guess.language)}</span>
        <span class="property-feedback ${getFeedbackClass(comparisons.duration)}">${getFeedbackText('duration', comparisons.duration, guess.duration)}</span>
      </div>
    `;
    
    guessesContainer.insertBefore(guessCard, guessesContainer.firstChild);
  }

  function filterSongs(query) {
    if (!query || query.trim() === '' || !ALL_SONGS || ALL_SONGS.length === 0) {
      return [];
    }
    const lowerQuery = query.toLowerCase().trim();
    // Allow guessing any song from the entire database
    return ALL_SONGS.filter(song => 
      song.name.toLowerCase().startsWith(lowerQuery) &&
      !gameState.guesses.some(g => g.name === song.name)
    ).slice(0, 10); // Limit to 10 results
  }

  function displayAutocomplete(results) {
    if (!autocompleteDropdown) {
      console.error('Autocomplete dropdown element not found');
      return;
    }
    
    autocompleteDropdown.innerHTML = '';
    autocompleteState.filteredSongs = results || [];
    autocompleteState.selectedIndex = -1;
    
    if (!results || results.length === 0) {
      autocompleteDropdown.style.display = 'none';
      autocompleteState.isOpen = false;
      return;
    }
    
    autocompleteDropdown.style.display = 'block';
    autocompleteState.isOpen = true;
    
    results.forEach((song, index) => {
      const item = document.createElement('div');
      item.className = 'autocomplete-item';
      item.textContent = song.name;
      item.addEventListener('click', () => {
        selectSong(song.name);
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

  function selectSong(songName) {
    musicInput.value = songName;
    autocompleteDropdown.style.display = 'none';
    autocompleteState.isOpen = false;
    musicInput.focus();
  }

  function submitGuess() {
    if (gameState.isSolved || gameState.isGameOver) return;
    
    const inputValue = musicInput.value.trim();
    if (!inputValue) return;
    
    // Allow guessing any song from the entire database
    const guess = ALL_SONGS.find(s => s.name.toLowerCase() === inputValue.toLowerCase());
    if (!guess) {
      alert('Song not found. Please select from the suggestions.');
      return;
    }
    
    // Check if already guessed
    if (gameState.guesses.some(g => g.name === guess.name)) {
      alert('You already guessed this song!');
      return;
    }
    
    const comparisons = compareProperties(gameState.secretSong, guess);
    gameState.guesses.push(guess);
    
    displayGuess(guess, comparisons);
    updateGameState();
    
    // Check if solved
    if (guess.name === gameState.secretSong.name) {
      endGame(true);
      return;
    }
    
    // Track guess
    if (typeof gtag === 'function') {
      gtag('event', 'music_guess', {
        song: guess.name,
        guess_number: gameState.guesses.length,
        difficulty: currentDifficulty
      });
    }
    
    // Reset input
    musicInput.value = '';
    autocompleteDropdown.style.display = 'none';
    autocompleteState.isOpen = false;
  }

  function getAnswerFeedbackText(property, value) {
    const propertyNames = {
      'artist': 'Artist',
      'artistCountry': 'Artist Country',
      'groupMembers': 'Group Members',
      'releaseYear': 'Release Year',
      'decade': 'Decade',
      'primaryGenre': 'Primary Genre',
      'language': 'Language',
      'duration': 'Duration'
    };
    const propertyName = propertyNames[property] || property;
    
    // Handle array properties
    if ((property === 'artistCountry' || property === 'language') && Array.isArray(value)) {
      return propertyName + ': ' + value.join(', ');
    }
    
    const formattedValue = formatPropertyValue(property, value);
    return propertyName + ': ' + formattedValue;
  }

  function displayAnswer() {
    // Display the answer with all properties in black (no emojis)
    const answerCard = document.createElement('div');
    answerCard.className = 'guess-card answer-reveal';
    const emoji = getMusicEmoji(gameState.secretSong.name);
    const secret = gameState.secretSong;
    
    answerCard.innerHTML = `
      <div class="guess-line">
        <span class="guess-animal-header guess-animal-name answer-reveal-header">
          <span class="animal-emoji-inline">${emoji}</span>
          <span class="animal-name-inline">${secret.name}</span>
          <span>😞</span>
        </span>
        <span class="property-feedback answer-reveal-feedback">${getAnswerFeedbackText('artist', secret.artist)}</span>
        <span class="property-feedback answer-reveal-feedback">${getAnswerFeedbackText('artistCountry', secret.artistCountry)}</span>
        <span class="property-feedback answer-reveal-feedback">${getAnswerFeedbackText('groupMembers', secret.groupMembers)}</span>
        <span class="property-feedback answer-reveal-feedback">${getAnswerFeedbackText('releaseYear', secret.releaseYear)}</span>
        <span class="property-feedback answer-reveal-feedback">${getAnswerFeedbackText('decade', secret.decade)}</span>
        <span class="property-feedback answer-reveal-feedback">${getAnswerFeedbackText('primaryGenre', secret.primaryGenre)}</span>
        <span class="property-feedback answer-reveal-feedback">${getAnswerFeedbackText('language', secret.language)}</span>
        <span class="property-feedback answer-reveal-feedback">${getAnswerFeedbackText('duration', secret.duration)}</span>
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
      gtag('event', 'music_gave_up', {
        guesses: gameState.guesses.length,
        date: gameState.currentDate,
        difficulty: currentDifficulty
      });
    }
  }

  function endGame(solved) {
    gameState.isSolved = solved;
    gameState.isGameOver = true;
    
    if (solved) {
      gameStatusEl.textContent = `🎉 Solved in ${gameState.guesses.length} guess${gameState.guesses.length !== 1 ? 'es' : ''}!`;
      gameStatusEl.className = 'solved';
      
      // Track completion
      if (typeof gtag === 'function') {
        gtag('event', 'music_solved', {
          guesses: gameState.guesses.length,
          date: gameState.currentDate,
          difficulty: currentDifficulty
        });
      }
    } else {
      if (gameState.gaveUp) {
        gameStatusEl.textContent = `😔 You gave up after ${gameState.guesses.length} guess${gameState.guesses.length !== 1 ? 'es' : ''}`;
      } else {
        // This shouldn't happen anymore since there's no limit, but keep for safety
        gameStatusEl.textContent = `❌ Game Over after ${gameState.guesses.length} guess${gameState.guesses.length !== 1 ? 'es' : ''}`;
        // Display answer when losing (not when giving up, as giveUp() already displays it)
        displayAnswer();
      }
      gameStatusEl.className = 'game-over';
      
      // Track game over
      if (typeof gtag === 'function') {
        gtag('event', 'music_game_over', {
          guesses: gameState.guesses.length,
          gave_up: gameState.gaveUp,
          date: gameState.currentDate,
          difficulty: currentDifficulty
        });
      }
    }
    
    guessSection.style.display = 'none';
    shareSection.style.display = 'block';
  }

  function shareResults() {
    const gameUrl = window.location.origin + window.location.pathname;
    const difficultyText = currentDifficulty.charAt(0).toUpperCase() + currentDifficulty.slice(1);
    let shareText;
    
    if (gameState.isSolved) {
      const status = `Solved in ${gameState.guesses.length} guess${gameState.guesses.length !== 1 ? 'es' : ''}!`;
      shareText = `🎉 Music of the Day 🎵\n${status} (${difficultyText})\n\nPlay at: ${gameUrl}`;
    } else if (gameState.gaveUp) {
      const status = `Gave up after ${gameState.guesses.length} guess${gameState.guesses.length !== 1 ? 'es' : ''}`;
      shareText = `😞 Music of the Day 🎵\n${status} (${difficultyText})\n\nPlay at: ${gameUrl}`;
    } else {
      const status = `Game Over after ${gameState.guesses.length} guess${gameState.guesses.length !== 1 ? 'es' : ''}`;
      shareText = `❌ Music of the Day 🎵\n${status} (${difficultyText})\n\nPlay at: ${gameUrl}`;
    }
    
    // Try to use Web Share API if available
    if (navigator.share) {
      navigator.share({
        title: 'Music of the Day',
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
      shareResultsBtn.textContent = 'Copied!';
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
    gameState.secretSong = getDailySong(currentDifficulty);
    gameState.guesses = [];
    gameState.isSolved = false;
    gameState.isGameOver = false;
    gameState.gaveUp = false;
    gameState.difficulty = currentDifficulty;
    
    // Clear previous guesses
    guessesContainer.innerHTML = '';
    guessCountEl.textContent = '0';
    gameStatusEl.textContent = '';
    gameStatusEl.className = '';
    guessSection.style.display = 'flex';
    shareSection.style.display = 'none';
    gameInfo.style.display = 'block';
    musicInput.value = '';
    autocompleteDropdown.style.display = 'none';
    
    // Track game start
    if (typeof gtag === 'function') {
      gtag('event', 'music_game_started', {
        date: gameState.currentDate,
        difficulty: currentDifficulty
      });
    }
  }

  // Difficulty selection handler
  function handleDifficultySelection(difficulty) {
    filterByDifficulty(difficulty);
    initializeGame();
  }

  // Event Listeners
  submitBtn.addEventListener('click', submitGuess);
  giveUpBtn.addEventListener('click', giveUp);
  shareResultsBtn.addEventListener('click', shareResults);
  
  // Difficulty button listeners
  difficultyButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      handleDifficultySelection(btn.dataset.difficulty);
    });
  });
  
  if (musicInput) {
  musicInput.addEventListener('input', (e) => {
    const query = e.target.value;
    if (!ALL_SONGS || ALL_SONGS.length === 0) {
      console.warn('Songs not loaded yet');
      return;
    }
    const results = filterSongs(query);
    displayAutocomplete(results);
  });
    
    musicInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (autocompleteState.isOpen && autocompleteState.selectedIndex >= 0) {
        const selectedSong = autocompleteState.filteredSongs[autocompleteState.selectedIndex];
        selectSong(selectedSong.name);
        submitGuess();
      } else {
        submitGuess();
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (autocompleteState.isOpen && autocompleteState.filteredSongs.length > 0) {
        autocompleteState.selectedIndex = Math.min(
          autocompleteState.selectedIndex + 1,
          autocompleteState.filteredSongs.length - 1
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
      if (musicInput && autocompleteDropdown && 
          !musicInput.contains(e.target) && !autocompleteDropdown.contains(e.target)) {
        autocompleteDropdown.style.display = 'none';
        autocompleteState.isOpen = false;
      }
    });
  }

  // Load data and initialize
  loadSongsData();
});
