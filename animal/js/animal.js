document.addEventListener("DOMContentLoaded", async () => {
  // ========== SHARED UTILITIES INTEGRATION ==========
  const i18n = new I18n();
  await i18n.init();
  
  const gameStorage = new GameStorage('animal');
  gameStorage.cleanupOldStates();
  
  const statsModal = new StatsModal(gameStorage, i18n);
  window.statsModal = statsModal;
  
  const statsBtn = document.getElementById('stats-btn');
  if (statsBtn) {
    statsBtn.addEventListener('click', () => statsModal.show());
  }
  
  function updateStreakDisplay() {
    const streakEl = document.getElementById('streak-display');
    if (!streakEl) return;
    const streak = gameStorage.getStreak();
    if (streak.currentStreak > 0) {
      streakEl.innerHTML = `<span class="streak-badge"><span class="streak-icon">🔥</span> ${streak.currentStreak}</span>`;
    } else {
      streakEl.innerHTML = '';
    }
  }
  updateStreakDisplay();
  
  const dailyState = gameStorage.getDailyState();
  let dailyCompleted = dailyState && dailyState.completed;
  
  // ========== CONSTANTS & DOM ELEMENTS ==========
  const MAX_GUESSES = 10;

  const animalInput = document.getElementById("animal-input");
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
    filteredAnimals: [],
    isOpen: false
  };

  // Data storage
  let ALL_ANIMALS = []; // All animals (for guessing)
  let SECRET_POOL = []; // Easy + Medium animals (for daily secret selection)

  // Text normalization for accent-insensitive search
  function normalizeText(text) {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritical marks
      .toLowerCase();
  }

  // Load embedded data
  function loadAnimalsData() {
    try {
      // Check if ANIMALS_DATA is available (loaded from data/animals_data.js)
      if (typeof ANIMALS_DATA === 'undefined' || !ANIMALS_DATA || ANIMALS_DATA.length === 0) {
        throw new Error('Animals data not loaded. Please ensure data/animals_data.js is included.');
      }
      
      // All animals available for guessing
      ALL_ANIMALS = ANIMALS_DATA;
      console.log('Total animals loaded:', ALL_ANIMALS.length);
      
      // Secret pool: only easy + medium animals
      SECRET_POOL = ALL_ANIMALS.filter(animal => 
        animal.difficulty === 'easy' || animal.difficulty === 'medium'
      );
      console.log('Secret pool (easy+medium):', SECRET_POOL.length);
      
      // Auto-initialize game
      if (SECRET_POOL.length > 0) {
        initializeGame();
        console.log('Game initialized');
      } else {
        console.error('No animals available in secret pool');
        alert('No animals available.');
      }
    } catch (error) {
      console.error('Error loading animals data:', error);
      alert('Failed to load animals data: ' + error.message + '. Please refresh the page.');
    }
  }

  // Game State
  let gameState = {
    secretAnimal: null,
    guesses: [],
    isSolved: false,
    isGameOver: false,
    gaveUp: false,
    currentDate: null
  };

  // Clues State
  let cluesState = {
    weightMin: null, weightMax: null, weightConfirmed: null,
    lifespanMin: null, lifespanMax: null, lifespanConfirmed: null,
    classConfirmed: null, dietConfirmed: null, activityConfirmed: null,
    matchedContinents: new Set(), matchedHabitats: new Set(),
    excludedClasses: new Set(), excludedDiets: new Set()
  };

  const cluesPanel = document.getElementById('clues-panel');
  const cluesContent = document.getElementById('clues-content');
  const cluesHeader = document.getElementById('clues-header');
  const cluesToggle = document.getElementById('clues-toggle');

  // Helper function to get image path
  function getImagePath(animalName) {
    const filename = animalName.toLowerCase().replace(/\s+/g, '-');
    return `assets/animals/${filename}.jpg`;
  }

  // Default emojis by animal class
  const classEmojis = {
    'Mammal': '🐾',
    'Bird': '🐦',
    'Fish': '🐟',
    'Reptile': '🦎',
    'Amphibian': '🐸',
    'Insect': '🐛',
    'Arachnid': '🕷️',
    'Crustacean': '🦀',
    'Cephalopod': '🐙',
    'Cnidarian': '🪼',
    'Mollusk': '🐚'
  };

  // Helper function to get emoji for animal
  function getAnimalEmoji(animalName) {
    const animal = ALL_ANIMALS.find(a => a.name === animalName);
    if (!animal) return "🐾";
    
    // If emoji is the default paws, use class-based emoji
    if (animal.emoji === "🐾") {
      return classEmojis[animal.class] || "🐾";
    }
    
    return animal.emoji;
  }

  // Utility Functions
  function getDateString() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function getDailyAnimal() {
    const dateString = getDateString();
    const date = new Date(dateString);
    const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
    
    const index = dayOfYear % SECRET_POOL.length;
    return SECRET_POOL[index];
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
    
    // Class - categorical
    comparisons.class = secret.class === guess.class ? 'match' : 'different';
    
    // Diet - categorical
    comparisons.diet = secret.diet === guess.diet ? 'match' : 'different';
    
    // Continent - can be array or string
    const continentComparison = compareArrayProperty(secret.continent, guess.continent);
    comparisons.continent = continentComparison;
    
    // Habitat - can be array or string
    const habitatComparison = compareArrayProperty(secret.habitat, guess.habitat);
    comparisons.habitat = habitatComparison;
    
    // Weight - numeric (inverted: if guess is higher, secret is lower, so tell user to guess lower)
    if (secret.weight === guess.weight) {
      comparisons.weight = 'match';
    } else if (guess.weight > secret.weight) {
      comparisons.weight = 'lower'; // Guess is higher, so secret is lower - tell user to guess lower
    } else {
      comparisons.weight = 'higher'; // Guess is lower, so secret is higher - tell user to guess higher
    }
    
    // Lifespan - numeric (inverted: if guess is higher, secret is lower, so tell user to guess lower)
    if (secret.lifespan === guess.lifespan) {
      comparisons.lifespan = 'match';
    } else if (guess.lifespan > secret.lifespan) {
      comparisons.lifespan = 'lower'; // Guess is higher, so secret is lower - tell user to guess lower
    } else {
      comparisons.lifespan = 'higher'; // Guess is lower, so secret is higher - tell user to guess higher
    }
    
    // Activity - categorical
    comparisons.activity = secret.activity === guess.activity ? 'match' : 'different';
    
    // Domesticated - boolean/categorical
    comparisons.domesticated = secret.domesticated === guess.domesticated ? 'match' : 'different';
    
    return comparisons;
  }

  function getFeedbackText(property, comparison, value) {
    const propertyNames = {
      'class': 'Class',
      'diet': 'Diet',
      'continent': 'Continent',
      'habitat': 'Habitat',
      'weight': 'Weight',
      'lifespan': 'Lifespan',
      'activity': 'Activity',
      'domesticated': 'Domesticated'
    };
    const propertyName = propertyNames[property] || property;
    
    // Handle array properties (continent, habitat)
    if ((property === 'continent' || property === 'habitat') && typeof comparison === 'object' && comparison.matches !== undefined) {
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

  function updateCluesState(guess, comparisons) {
    if (comparisons.weight === 'match') cluesState.weightConfirmed = guess.weight;
    else if (comparisons.weight === 'higher') { if (cluesState.weightMin === null || guess.weight > cluesState.weightMin) cluesState.weightMin = guess.weight; }
    else if (comparisons.weight === 'lower') { if (cluesState.weightMax === null || guess.weight < cluesState.weightMax) cluesState.weightMax = guess.weight; }

    if (comparisons.lifespan === 'match') cluesState.lifespanConfirmed = guess.lifespan;
    else if (comparisons.lifespan === 'higher') { if (cluesState.lifespanMin === null || guess.lifespan > cluesState.lifespanMin) cluesState.lifespanMin = guess.lifespan; }
    else if (comparisons.lifespan === 'lower') { if (cluesState.lifespanMax === null || guess.lifespan < cluesState.lifespanMax) cluesState.lifespanMax = guess.lifespan; }

    if (comparisons.class === 'match') cluesState.classConfirmed = guess.class;
    else cluesState.excludedClasses.add(guess.class);

    if (comparisons.diet === 'match') cluesState.dietConfirmed = guess.diet;
    else cluesState.excludedDiets.add(guess.diet);

    if (comparisons.activity === 'match') cluesState.activityConfirmed = guess.activity;

    if (comparisons.continent && comparisons.continent.matches) comparisons.continent.matches.forEach(c => cluesState.matchedContinents.add(c));
    if (comparisons.habitat && comparisons.habitat.matches) comparisons.habitat.matches.forEach(h => cluesState.matchedHabitats.add(h));
  }

  function renderCluesPanel() {
    if (gameState.guesses.length === 0) { cluesPanel.style.display = 'none'; return; }
    cluesPanel.style.display = 'block';

    function renderRange(itemId, valueId, min, max, confirmed, formatter = v => v) {
      const item = document.getElementById(itemId);
      const value = document.getElementById(valueId);
      if (confirmed !== null) { item.className = 'clue-item confirmed'; value.textContent = formatter(confirmed); }
      else if (min !== null || max !== null) {
        item.className = 'clue-item narrowed';
        if (min !== null && max !== null) value.textContent = `${formatter(min + 1)}-${formatter(max - 1)}`;
        else if (min !== null) value.textContent = `>${formatter(min)}`;
        else value.textContent = `<${formatter(max)}`;
      } else { item.className = 'clue-item'; value.textContent = '?'; }
    }

    const formatWeight = w => w >= 1000 ? `${(w/1000).toFixed(0)}t` : `${w}kg`;
    renderRange('clue-weight', 'clue-weight-value', cluesState.weightMin, cluesState.weightMax, cluesState.weightConfirmed, formatWeight);
    renderRange('clue-lifespan', 'clue-lifespan-value', cluesState.lifespanMin, cluesState.lifespanMax, cluesState.lifespanConfirmed, l => `${l}y`);

    function renderCategorical(itemId, valueId, confirmed) {
      const item = document.getElementById(itemId);
      const value = document.getElementById(valueId);
      if (confirmed) { item.className = 'clue-item confirmed'; value.textContent = confirmed; }
      else { item.className = 'clue-item'; value.textContent = '?'; }
    }

    renderCategorical('clue-class', 'clue-class-value', cluesState.classConfirmed);
    renderCategorical('clue-diet', 'clue-diet-value', cluesState.dietConfirmed);
    renderCategorical('clue-activity', 'clue-activity-value', cluesState.activityConfirmed);

    const continentsRow = document.getElementById('clue-continents-row');
    const continentsContainer = document.getElementById('clue-continents');
    if (cluesState.matchedContinents.size > 0) {
      continentsRow.style.display = 'flex';
      continentsContainer.innerHTML = [...cluesState.matchedContinents].map(c => `<span class="clue-tag">${c}</span>`).join('');
    } else { continentsRow.style.display = 'none'; }

    const habitatsRow = document.getElementById('clue-habitats-row');
    const habitatsContainer = document.getElementById('clue-habitats');
    if (cluesState.matchedHabitats.size > 0) {
      habitatsRow.style.display = 'flex';
      habitatsContainer.innerHTML = [...cluesState.matchedHabitats].map(h => `<span class="clue-tag">${h}</span>`).join('');
    } else { habitatsRow.style.display = 'none'; }

    const excludedRow = document.getElementById('clue-excluded-row');
    const excludedContainer = document.getElementById('clue-excluded');
    const allExcluded = [];
    if (!cluesState.classConfirmed) allExcluded.push(...cluesState.excludedClasses);
    if (!cluesState.dietConfirmed) allExcluded.push(...cluesState.excludedDiets);
    if (allExcluded.length > 0) { excludedRow.style.display = 'flex'; excludedContainer.textContent = allExcluded.slice(0, 8).join(', '); }
    else { excludedRow.style.display = 'none'; }
  }

  function resetCluesState() {
    cluesState = { weightMin: null, weightMax: null, weightConfirmed: null, lifespanMin: null, lifespanMax: null, lifespanConfirmed: null, classConfirmed: null, dietConfirmed: null, activityConfirmed: null, matchedContinents: new Set(), matchedHabitats: new Set(), excludedClasses: new Set(), excludedDiets: new Set() };
  }

  function formatPropertyValue(property, value) {
    if (property === 'weight') {
      return value >= 1000 ? `${(value / 1000).toFixed(1)}t` : `${value}kg`;
    } else if (property === 'lifespan') {
      return `${value} years`;
    } else if (property === 'domesticated') {
      return value ? 'Yes' : 'No';
    }
    return value;
  }

  function displayGuess(guess, comparisons) {
    const guessCard = document.createElement('div');
    guessCard.className = 'guess-card';
    
    const isCorrect = guess.name === gameState.secretAnimal.name;
    const animalNameClass = isCorrect ? 'guess-animal-name correct' : 'guess-animal-name';
    const emoji = getAnimalEmoji(guess.name);
    
    // Create the main container
    const guessLine = document.createElement('div');
    guessLine.className = 'guess-line';
    
    // Animal name header
    const animalHeader = document.createElement('span');
    animalHeader.className = `guess-animal-header ${animalNameClass}`;
    animalHeader.innerHTML = `
      <span class="animal-emoji-inline">${emoji}</span>
      <span class="animal-name-inline">${guess.name}</span>
      ${isCorrect ? '<span class="correct-badge">🎉</span>' : '<span class="wrong-badge">😞</span>'}
    `;
    guessLine.appendChild(animalHeader);
    
    // Add all property feedbacks
    const properties = [
      { key: 'class', value: guess.class, comparison: comparisons.class },
      { key: 'diet', value: guess.diet, comparison: comparisons.diet },
      { key: 'continent', value: guess.continent, comparison: comparisons.continent },
      { key: 'habitat', value: guess.habitat, comparison: comparisons.habitat },
      { key: 'weight', value: guess.weight, comparison: comparisons.weight },
      { key: 'lifespan', value: guess.lifespan, comparison: comparisons.lifespan },
      { key: 'activity', value: guess.activity, comparison: comparisons.activity },
      { key: 'domesticated', value: guess.domesticated, comparison: comparisons.domesticated }
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

  function filterAnimals(query) {
    if (!query || query.trim() === '') {
      return [];
    }
    const normalizedQuery = normalizeText(query.trim());
    // Allow guessing any animal from the entire database
    return ALL_ANIMALS.filter(animal => 
      normalizeText(animal.name).startsWith(normalizedQuery) &&
      !gameState.guesses.some(g => g.name === animal.name)
    ).slice(0, 10); // Limit to 10 results
  }

  function displayAutocomplete(results) {
    autocompleteDropdown.innerHTML = '';
    autocompleteState.filteredAnimals = results;
    autocompleteState.selectedIndex = -1;
    
    if (results.length === 0) {
      autocompleteDropdown.style.display = 'none';
      autocompleteState.isOpen = false;
      return;
    }
    
    autocompleteDropdown.style.display = 'block';
    autocompleteState.isOpen = true;
    
    results.forEach((animal, index) => {
      const item = document.createElement('div');
      item.className = 'autocomplete-item';
      item.textContent = animal.name;
      item.addEventListener('click', () => {
        selectAnimal(animal.name);
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

  function selectAnimal(animalName) {
    animalInput.value = animalName;
    autocompleteDropdown.style.display = 'none';
    autocompleteState.isOpen = false;
    animalInput.focus();
  }

  function submitGuess() {
    if (gameState.isSolved || gameState.isGameOver) return;
    
    const inputValue = animalInput.value.trim();
    if (!inputValue) return;
    
    // Allow guessing any animal from the entire database
    const guess = ALL_ANIMALS.find(a => a.name.toLowerCase() === inputValue.toLowerCase());
    if (!guess) {
      alert('Animal not found. Please select from the suggestions.');
      return;
    }
    
    // Check if already guessed
    if (gameState.guesses.some(g => g.name === guess.name)) {
      alert('You already guessed this animal!');
      return;
    }
    
    const comparisons = compareProperties(gameState.secretAnimal, guess);
    updateCluesState(guess, comparisons);
    gameState.guesses.push(guess);
    
    displayGuess(guess, comparisons);
    updateGameState();
    
    // Check if solved
    if (guess.name === gameState.secretAnimal.name) {
      endGame(true);
      return;
    }
    
    // Track guess
    if (typeof gtag === 'function') {
      gtag('event', 'animal_guess', {
        animal: guess.name,
        guess_number: gameState.guesses.length
      });
    }
    
    // Reset input
    animalInput.value = '';
    autocompleteDropdown.style.display = 'none';
    autocompleteState.isOpen = false;
  }

  function getAnswerFeedbackText(property, value) {
    const propertyNames = {
      'class': 'Class',
      'diet': 'Diet',
      'continent': 'Continent',
      'habitat': 'Habitat',
      'weight': 'Weight',
      'lifespan': 'Lifespan',
      'activity': 'Activity',
      'domesticated': 'Domesticated'
    };
    const propertyName = propertyNames[property] || property;
    
    // Handle array properties
    if ((property === 'continent' || property === 'habitat') && Array.isArray(value)) {
      return propertyName + ': ' + value.join(', ');
    }
    
    const formattedValue = formatPropertyValue(property, value);
    return propertyName + ': ' + formattedValue;
  }

  function displayAnswer() {
    // Display the answer with all properties in black (no emojis)
    const answerCard = document.createElement('div');
    answerCard.className = 'guess-card answer-reveal';
    const emoji = getAnimalEmoji(gameState.secretAnimal.name);
    const secret = gameState.secretAnimal;
    
    answerCard.innerHTML = `
      <div class="guess-line">
        <span class="guess-animal-header guess-animal-name answer-reveal-header">
          <span class="animal-emoji-inline">${emoji}</span>
          <span class="animal-name-inline">${secret.name}</span>
          <span>😞</span>
        </span>
        <span class="property-feedback answer-reveal-feedback">${getAnswerFeedbackText('class', secret.class)}</span>
        <span class="property-feedback answer-reveal-feedback">${getAnswerFeedbackText('diet', secret.diet)}</span>
        <span class="property-feedback answer-reveal-feedback">${getAnswerFeedbackText('continent', secret.continent)}</span>
        <span class="property-feedback answer-reveal-feedback">${getAnswerFeedbackText('habitat', secret.habitat)}</span>
        <span class="property-feedback answer-reveal-feedback">${getAnswerFeedbackText('weight', secret.weight)}</span>
        <span class="property-feedback answer-reveal-feedback">${getAnswerFeedbackText('lifespan', secret.lifespan)}</span>
        <span class="property-feedback answer-reveal-feedback">${getAnswerFeedbackText('activity', secret.activity)}</span>
        <span class="property-feedback answer-reveal-feedback">${getAnswerFeedbackText('domesticated', secret.domesticated)}</span>
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
      gtag('event', 'animal_gave_up', {
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
      
      // Track completion
      if (typeof gtag === 'function') {
        gtag('event', 'animal_solved', {
          guesses: gameState.guesses.length,
          date: gameState.currentDate
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
        gtag('event', 'animal_game_over', {
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
      shareText = `🎉 Animal of the Day 🐾\n${status}\n\nPlay at: ${gameUrl}`;
    } else if (gameState.gaveUp) {
      const status = `Gave up after ${gameState.guesses.length} guess${gameState.guesses.length !== 1 ? 'es' : ''}`;
      shareText = `😞 Animal of the Day 🐾\n${status}\n\nPlay at: ${gameUrl}`;
    } else {
      const status = `Game Over after ${MAX_GUESSES} guesses`;
      shareText = `❌ Animal of the Day 🐾\n${status}\n\nPlay at: ${gameUrl}`;
    }
    
    // Try to use Web Share API if available
    if (navigator.share) {
      navigator.share({
        title: 'Animal of the Day',
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
    guessCountEl.textContent = gameState.guesses.length;
    renderCluesPanel();
    if (!gameState.isSolved && !gameState.isGameOver) {
      gameStatusEl.textContent = '';
      gameStatusEl.className = '';
    }
    if (gameState.isGameOver && cluesPanel) cluesPanel.style.display = 'none';
  }

  function initializeGame() {
    gameState.currentDate = getDateString();
    gameState.secretAnimal = getDailyAnimal();
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
    animalInput.value = '';
    autocompleteDropdown.style.display = 'none';
    
    // Track game start
    if (typeof gtag === 'function') {
      gtag('event', 'animal_game_started', {
        date: gameState.currentDate
      });
    }
  }

  // Event Listeners
  submitBtn.addEventListener('click', submitGuess);
  giveUpBtn.addEventListener('click', giveUp);
  shareResultsBtn.addEventListener('click', shareResults);
  
  animalInput.addEventListener('input', (e) => {
    const query = e.target.value;
    const results = filterAnimals(query);
    displayAutocomplete(results);
  });
  
  animalInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (autocompleteState.isOpen && autocompleteState.selectedIndex >= 0) {
        const selectedAnimal = autocompleteState.filteredAnimals[autocompleteState.selectedIndex];
        selectAnimal(selectedAnimal.name);
        submitGuess();
      } else {
        submitGuess();
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (autocompleteState.isOpen && autocompleteState.filteredAnimals.length > 0) {
        autocompleteState.selectedIndex = Math.min(
          autocompleteState.selectedIndex + 1,
          autocompleteState.filteredAnimals.length - 1
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
    if (!animalInput.contains(e.target) && !autocompleteDropdown.contains(e.target)) {
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
  loadAnimalsData();
});
