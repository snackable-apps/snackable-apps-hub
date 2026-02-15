document.addEventListener("DOMContentLoaded", async () => {
  // ========== SHARED UTILITIES INTEGRATION ==========
  const i18n = new I18n();
  await i18n.init();
  
  const gameStorage = new GameStorage('books');
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
  const bookInput = document.getElementById("book-input");
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
  const easyModeToggle = document.getElementById("easy-mode-toggle");
  const toggleDescription = document.getElementById("toggle-description");
  const modeToggle = document.getElementById("mode-toggle");
  
  // Easy mode state
  let easyModeEnabled = false;
  
  // Autocomplete state
  let autocompleteState = {
    selectedIndex: -1,
    filteredBooks: [],
    isOpen: false
  };

  // Data storage
  let ALL_BOOKS = [];
  let SECRET_POOL = [];

  // API endpoint
  const API_URL = 'https://snackable-api.vercel.app/api/books';

  // Text normalization for accent-insensitive search
  function normalizeText(text) {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritical marks
      .toLowerCase();
  }

  // Load books from API
  async function loadBooksData() {
    try {
      // Fetch from API
      const response = await fetch(API_URL);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success || !data.books || data.books.length === 0) {
        throw new Error('No books returned from API');
      }
      
      // Transform API data to match expected format
      // Note: Open Library doesn't provide authorNationality or reliable pageCount
      ALL_BOOKS = data.books.map(book => ({
        title: book.title,
        author: book.author,
        genre: book.genres && book.genres.length > 0 ? book.genres[0] : 'Fiction',
        publicationYear: book.publicationYear || 0,
        originalLanguage: book.language || 'en',
        coverImage: book.coverImage,
        description: book.description,
        difficulty: book.difficulty || 'medium',
        editionCount: book.editionCount || 0 // Used for difficulty calculation
      }));
      
      console.log('Books loaded from API:', ALL_BOOKS.length);
      
    } catch (apiError) {
      console.error('API fetch failed:', apiError.message);
      alert('Failed to load book data. Please check your connection and refresh the page.');
      return;
    }
    
    // Secret pool: only easy + medium books
    SECRET_POOL = ALL_BOOKS.filter(book => 
      book.difficulty === 'easy' || book.difficulty === 'medium'
    );
    console.log('Secret pool (easy+medium):', SECRET_POOL.length);
    
    if (SECRET_POOL.length > 0) {
      // Check if daily is completed - show result instead of restarting
      if (dailyCompleted && dailyState) {
        restoreDailyResult();
      } else {
        initializeGame();
      }
      console.log('Game initialized');
    } else {
      console.error('No books available in secret pool');
      alert('No books available.');
    }
  }

  // Game State
  let gameState = {
    secretBook: null,
    guesses: [],
    isSolved: false,
    isGameOver: false,
    gaveUp: false,
    currentDate: null,
    isRandomMode: dailyCompleted
  };
  
  // Restore and display the completed daily game result
  function restoreDailyResult() {
    const todaysBook = getDailyBook();
    
    gameState.secretBook = todaysBook;
    gameState.currentDate = getDateString();
    gameState.isGameOver = true;
    gameState.isRandomMode = false;
    
    if (dailyState.gameData) {
      gameState.guesses = dailyState.gameData.guesses || [];
      gameState.isSolved = dailyState.gameData.won;
      gameState.gaveUp = !dailyState.gameData.won;
    } else {
      gameState.guesses = [];
      gameState.isSolved = dailyState.won || false;
      gameState.gaveUp = !gameState.isSolved;
    }
    
    resetCluesState();
    gameState.guesses.forEach(guess => {
      if (guess.comparisons) {
        updateCluesState(guess, guess.comparisons);
      }
    });
    
    guessSection.style.display = 'none';
    shareSection.style.display = 'flex';
    
    // Hide clues panel when showing completed result
    if (cluesPanel) cluesPanel.style.display = 'none';
    
    updateUI();
    
    // Ensure clues panel stays hidden after updateUI
    if (cluesPanel) cluesPanel.style.display = 'none';
  }
  
  // Play Random
  function playRandom() {
    const currentTitle = gameState.secretBook ? gameState.secretBook.title : null;
    const availableBooks = SECRET_POOL.filter(b => b.title !== currentTitle);
    const randomIndex = Math.floor(Math.random() * availableBooks.length);
    const randomBook = availableBooks[randomIndex] || SECRET_POOL[0];
    
    gameState.secretBook = randomBook;
    gameState.currentDate = getDateString();
    gameState.guesses = [];
    gameState.isSolved = false;
    gameState.isGameOver = false;
    gameState.gaveUp = false;
    gameState.isRandomMode = true;
    
    resetCluesState();
    
    guessesContainer.innerHTML = '';
    guessCountEl.textContent = '0';
    gameStatusEl.textContent = '';
    gameStatusEl.className = '';
    guessSection.style.display = 'flex';
    shareSection.style.display = 'none';
    bookInput.value = '';
    bookInput.disabled = false;
    autocompleteDropdown.style.display = 'none';
    if (cluesPanel) cluesPanel.style.display = 'none';
    
    setTimeout(() => bookInput.focus(), 100);
    
    if (typeof gtag === 'function') {
      gtag('event', 'books_play_random', { book: randomBook.title });
    }
  }

  // Clues State
  let cluesState = {
    yearMin: null, yearMax: null, yearConfirmed: null,
    authorConfirmed: null, genreConfirmed: null, languageConfirmed: null,
    excludedAuthors: new Set(), excludedGenres: new Set()
  };

  const cluesPanel = document.getElementById('clues-panel');
  const cluesContent = document.getElementById('clues-content');
  const cluesHeader = document.getElementById('clues-header');
  const cluesToggle = document.getElementById('clues-toggle');

  // Utility Functions
  function getDateString() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function getDailyBook() {
    const dateString = getDateString();
    const date = new Date(dateString);
    const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
    
    const index = dayOfYear % SECRET_POOL.length;
    return SECRET_POOL[index];
  }

  function compareProperties(secret, guess) {
    const comparisons = {};
    
    // Author
    comparisons.author = secret.author === guess.author ? 'match' : 'different';
    
    // Genre
    comparisons.genre = secret.genre === guess.genre ? 'match' : 'different';
    
    // Publication Year
    if (secret.publicationYear === guess.publicationYear) {
      comparisons.publicationYear = 'match';
    } else if (guess.publicationYear > secret.publicationYear) {
      comparisons.publicationYear = 'lower';
    } else {
      comparisons.publicationYear = 'higher';
    }
    
    // Original Language
    comparisons.originalLanguage = secret.originalLanguage === guess.originalLanguage ? 'match' : 'different';
    
    return comparisons;
  }

  function getFeedbackText(property, comparison, value) {
    const propertyNames = {
      'author': 'Author',
      'genre': 'Genre',
      'publicationYear': 'Published',
      'originalLanguage': 'Language'
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

  function updateCluesState(guess, comparisons) {
    if (comparisons.publicationYear === 'match') cluesState.yearConfirmed = guess.publicationYear;
    else if (comparisons.publicationYear === 'higher') { if (cluesState.yearMin === null || guess.publicationYear > cluesState.yearMin) cluesState.yearMin = guess.publicationYear; }
    else if (comparisons.publicationYear === 'lower') { if (cluesState.yearMax === null || guess.publicationYear < cluesState.yearMax) cluesState.yearMax = guess.publicationYear; }

    if (comparisons.author === 'match') cluesState.authorConfirmed = guess.author;
    else cluesState.excludedAuthors.add(guess.author);

    if (comparisons.genre === 'match') cluesState.genreConfirmed = guess.genre;
    else cluesState.excludedGenres.add(guess.genre);
    if (comparisons.originalLanguage === 'match') cluesState.languageConfirmed = guess.originalLanguage;
  }

  function renderCluesPanel() {
    if (gameState.guesses.length === 0) { cluesPanel.style.display = 'none'; return; }
    cluesPanel.style.display = 'block';

    function renderRange(itemId, valueId, min, max, confirmed) {
      const item = document.getElementById(itemId);
      const value = document.getElementById(valueId);
      if (!item || !value) return; // Skip if element doesn't exist
      if (confirmed !== null) { item.className = 'clue-item confirmed'; value.textContent = confirmed; }
      else if (min !== null || max !== null) {
        item.className = 'clue-item narrowed';
        if (min !== null && max !== null) value.textContent = `${min + 1}-${max - 1}`;
        else if (min !== null) value.textContent = `>${min}`;
        else value.textContent = `<${max}`;
      } else { item.className = 'clue-item'; value.textContent = '?'; }
    }

    renderRange('clue-year', 'clue-year-value', cluesState.yearMin, cluesState.yearMax, cluesState.yearConfirmed);

    function renderCategorical(itemId, valueId, confirmed) {
      const item = document.getElementById(itemId);
      const value = document.getElementById(valueId);
      if (!item || !value) return; // Skip if element doesn't exist
      if (confirmed) { item.className = 'clue-item confirmed'; value.textContent = confirmed; }
      else { item.className = 'clue-item'; value.textContent = '?'; }
    }

    renderCategorical('clue-author', 'clue-author-value', cluesState.authorConfirmed);
    renderCategorical('clue-genre', 'clue-genre-value', cluesState.genreConfirmed);
    renderCategorical('clue-language', 'clue-language-value', cluesState.languageConfirmed);

    const excludedRow = document.getElementById('clue-excluded-row');
    const excludedContainer = document.getElementById('clue-excluded');
    if (excludedRow && excludedContainer) {
      const allExcluded = [];
      if (!cluesState.genreConfirmed) allExcluded.push(...[...cluesState.excludedGenres].slice(0, 3));
      if (allExcluded.length > 0) { excludedRow.style.display = 'flex'; excludedContainer.textContent = allExcluded.join(', '); }
      else { excludedRow.style.display = 'none'; }
    }
  }

  function resetCluesState() {
    cluesState = { yearMin: null, yearMax: null, yearConfirmed: null, authorConfirmed: null, genreConfirmed: null, languageConfirmed: null, excludedAuthors: new Set(), excludedGenres: new Set() };
  }

  function displayGuess(guess, comparisons) {
    const guessCard = document.createElement('div');
    guessCard.className = 'guess-card';
    
    const isCorrect = guess.title === gameState.secretBook.title;
    const bookNameClass = isCorrect ? 'guess-book-header correct' : 'guess-book-header';
    const coverImg = guess.coverImage 
      ? `<img src="${guess.coverImage}" alt="${guess.title}" class="book-cover-small clickable" onclick="openLightbox('${guess.coverImage.replace(/'/g, "\\'")}', '${guess.title.replace(/'/g, "\\'")}')" onerror="this.style.display='none'">`
      : '<span class="book-emoji-inline">📖</span>';
    
    guessCard.innerHTML = `
      <div class="guess-line">
        <span class="${bookNameClass}">
          ${coverImg}
          <span class="book-name-inline">${guess.title}</span>
          ${isCorrect ? '<span class="correct-badge">🎉</span>' : '<span class="wrong-badge">❌</span>'}
        </span>
        <span class="property-feedback ${getFeedbackClass(comparisons.author)}">${getFeedbackText('author', comparisons.author, guess.author)}</span>
        <span class="property-feedback ${getFeedbackClass(comparisons.genre)}">${getFeedbackText('genre', comparisons.genre, guess.genre)}</span>
        <span class="property-feedback ${getFeedbackClass(comparisons.publicationYear)}">${getFeedbackText('publicationYear', comparisons.publicationYear, guess.publicationYear)}</span>
        <span class="property-feedback ${getFeedbackClass(comparisons.originalLanguage)}">${getFeedbackText('originalLanguage', comparisons.originalLanguage, guess.originalLanguage)}</span>
      </div>
    `;
    
    guessesContainer.insertBefore(guessCard, guessesContainer.firstChild);
  }

  function filterBooks(query) {
    if (!query || query.trim() === '' || !ALL_BOOKS || ALL_BOOKS.length === 0) {
      return [];
    }
    const normalizedQuery = normalizeText(query.trim());
    
    return ALL_BOOKS.filter(book => {
      // Skip already guessed books
      if (gameState.guesses.some(g => g.title === book.title)) {
        return false;
      }
      
      // Match by title (always)
      if (normalizeText(book.title).includes(normalizedQuery)) {
        return true;
      }
      
      // In easy mode, also match by author name
      if (easyModeEnabled && normalizeText(book.author).includes(normalizedQuery)) {
        return true;
      }
      
      return false;
    }).slice(0, 10);
  }

  function displayAutocomplete(results) {
    if (!autocompleteDropdown) return;
    
    autocompleteDropdown.innerHTML = '';
    autocompleteState.filteredBooks = results || [];
    autocompleteState.selectedIndex = -1;
    
    if (!results || results.length === 0) {
      autocompleteDropdown.style.display = 'none';
      autocompleteState.isOpen = false;
      return;
    }
    
    autocompleteDropdown.style.display = 'block';
    autocompleteState.isOpen = true;
    
    results.forEach((book, index) => {
      const item = document.createElement('div');
      item.className = 'autocomplete-item';
      
      // In easy mode, show author info alongside book title
      if (easyModeEnabled) {
        item.innerHTML = `<span class="book-title">${book.title}</span><span class="author-name">${book.author}</span>`;
      } else {
        item.textContent = book.title;
      }
      
      item.addEventListener('click', () => {
        selectBook(book.title);
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

  function selectBook(bookTitle) {
    bookInput.value = bookTitle;
    autocompleteDropdown.style.display = 'none';
    autocompleteState.isOpen = false;
    bookInput.focus();
  }

  function submitGuess() {
    if (gameState.isSolved || gameState.isGameOver) return;
    
    const inputValue = bookInput.value.trim();
    if (!inputValue) return;
    
    const guess = ALL_BOOKS.find(b => b.title.toLowerCase() === inputValue.toLowerCase());
    if (!guess) {
      alert('Book not found. Please select from the suggestions.');
      return;
    }
    
    if (gameState.guesses.some(g => g.title === guess.title)) {
      alert('You already guessed this book!');
      return;
    }
    
    const comparisons = compareProperties(gameState.secretBook, guess);
    updateCluesState(guess, comparisons);
    gameState.guesses.push(guess);
    
    displayGuess(guess, comparisons);
    updateGameState();
    
    if (guess.title === gameState.secretBook.title) {
      endGame(true);
      return;
    }
    
    // Track guess
    if (typeof gtag === 'function') {
      gtag('event', 'books_guess', {
        book: guess.title,
        guess_number: gameState.guesses.length
      });
    }
    
    bookInput.value = '';
    autocompleteDropdown.style.display = 'none';
    autocompleteState.isOpen = false;
  }

  function getAnswerFeedbackText(property, value) {
    const propertyNames = {
      'author': 'Author',
      'genre': 'Genre',
      'publicationYear': 'Published',
      'originalLanguage': 'Language'
    };
    const propertyName = propertyNames[property] || property;
    return `${propertyName}: ${value}`;
  }

  function displayAnswer() {
    const answerCard = document.createElement('div');
    answerCard.className = 'guess-card answer-reveal';
    const secret = gameState.secretBook;
    const coverImg = secret.coverImage 
      ? `<img src="${secret.coverImage}" alt="${secret.title}" class="book-cover-small clickable" onclick="openLightbox('${secret.coverImage.replace(/'/g, "\\'")}', '${secret.title.replace(/'/g, "\\'")}')" onerror="this.style.display='none'">`
      : '<span class="book-emoji-inline">📖</span>';
    
    answerCard.innerHTML = `
      <div class="guess-line">
        <span class="guess-book-header answer-reveal-header">
          ${coverImg}
          <span class="book-name-inline">${secret.title}</span>
          <span>😔</span>
        </span>
        <span class="property-feedback answer-reveal-feedback">${getAnswerFeedbackText('author', secret.author)}</span>
        <span class="property-feedback answer-reveal-feedback">${getAnswerFeedbackText('genre', secret.genre)}</span>
        <span class="property-feedback answer-reveal-feedback">${getAnswerFeedbackText('publicationYear', secret.publicationYear)}</span>
        <span class="property-feedback answer-reveal-feedback">${getAnswerFeedbackText('originalLanguage', secret.originalLanguage)}</span>
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
      gtag('event', 'books_gave_up', {
        guesses: gameState.guesses.length,
        date: gameState.currentDate
      });
    }
  }

  function endGame(solved) {
    gameState.isSolved = solved;
    gameState.isGameOver = true;
    
    // Keep clues panel visible after game over so user can see the summary
    
    if (solved) {
      gameStatusEl.textContent = `🎉 Solved in ${gameState.guesses.length} guess${gameState.guesses.length !== 1 ? 'es' : ''}!`;
      gameStatusEl.className = 'solved';
      
      if (typeof gtag === 'function') {
        gtag('event', 'books_solved', {
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
        gtag('event', 'books_game_over', {
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
        book: gameState.secretBook.title,
        gameData: {
          won: solved,
          guesses: gameState.guesses.map(g => ({
            title: g.title,
            author: g.author,
            genre: g.genre,
            year: g.year,
            language: g.language,
            comparisons: g.comparisons,
            isCorrect: g.isCorrect
          }))
        }
      });
      dailyCompleted = true;
    }
    
    guessSection.style.display = 'none';
    shareSection.style.display = 'flex';
    if (modeToggle) {
      modeToggle.style.display = 'none';
    }
    
    // Hide clues panel when game ends
    if (cluesPanel) cluesPanel.style.display = 'none';
  }

  function shareResults() {
    const gameUrl = window.location.origin + window.location.pathname;
    const gameType = gameState.isRandomMode ? '🎲 Random' : getDateString();
    let shareText;
    
    if (gameState.isSolved) {
      const status = `Solved in ${gameState.guesses.length} guess${gameState.guesses.length !== 1 ? 'es' : ''}!`;
      shareText = `🎉 Books Quiz ${gameType} 📚\n${status}\n\nPlay at: ${gameUrl}`;
    } else if (gameState.gaveUp) {
      const status = `Gave up after ${gameState.guesses.length} guess${gameState.guesses.length !== 1 ? 'es' : ''}`;
      shareText = `😞 Books Quiz ${gameType} 📚\n${status}\n\nPlay at: ${gameUrl}`;
    } else {
      const status = `Game Over after ${gameState.guesses.length} guess${gameState.guesses.length !== 1 ? 'es' : ''}`;
      shareText = `❌ Books Quiz ${gameType} 📚\n${status}\n\nPlay at: ${gameUrl}`;
    }
    
    GameUtils.shareGameResult({
      text: shareText,
      title: 'Books Quiz Result',
      button: shareResultsBtn,
      successMessage: '✅ Copied!',
      originalHTML: shareResultsBtn.innerHTML
    });
  }

  // Legacy function kept for compatibility
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
    
    // Render clues panel (keep visible even after game over)
    renderCluesPanel();
    if (!gameState.isGameOver) {
      gameStatusEl.textContent = '';
      gameStatusEl.className = '';
    }
  }

  function initializeGame() {
    gameState.currentDate = getDateString();
    gameState.secretBook = getDailyBook();
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
    bookInput.value = '';
    autocompleteDropdown.style.display = 'none';
    
    // Show mode toggle
    if (modeToggle) {
      modeToggle.style.display = 'block';
    }
    
    if (typeof gtag === 'function') {
      gtag('event', 'books_game_started', {
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
  
  // Play Random button
  const playRandomBtn = document.getElementById('play-random-btn');
  if (playRandomBtn) {
    playRandomBtn.addEventListener('click', playRandom);
  }

  // Easy mode toggle
  if (easyModeToggle) {
    easyModeToggle.addEventListener('change', (e) => {
      easyModeEnabled = e.target.checked;
      
      // Update UI description and placeholder
      if (toggleDescription) {
        if (easyModeEnabled) {
          toggleDescription.innerHTML = `
            <span class="current-mode">✍️ <strong>Book + Author</strong> search</span>
            <span class="mode-action">Disable to search by title only</span>
          `;
          toggleDescription.classList.add('easy-active');
          bookInput.placeholder = 'Type a book title or author...';
        } else {
          toggleDescription.innerHTML = `
            <span class="current-mode">📖 <strong>Book title</strong> search only</span>
            <span class="mode-action">Enable to also search by author</span>
          `;
          toggleDescription.classList.remove('easy-active');
          bookInput.placeholder = 'Type a book title...';
        }
      }
      
      // Clear and refresh autocomplete if there's text
      if (bookInput.value.trim()) {
        const results = filterBooks(bookInput.value);
        displayAutocomplete(results);
      }
      
      // Track mode change
      if (typeof gtag === 'function') {
        gtag('event', 'books_mode_toggle', {
          easy_mode: easyModeEnabled
        });
      }
    });
  }
  
  if (bookInput) {
    bookInput.addEventListener('input', (e) => {
      const query = e.target.value;
      if (!ALL_BOOKS || ALL_BOOKS.length === 0) {
        console.warn('Books not loaded yet');
        return;
      }
      const results = filterBooks(query);
      displayAutocomplete(results);
    });
    
    bookInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (autocompleteState.isOpen && autocompleteState.selectedIndex >= 0) {
          const selectedBook = autocompleteState.filteredBooks[autocompleteState.selectedIndex];
          selectBook(selectedBook.title);
          submitGuess();
        } else {
          submitGuess();
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (autocompleteState.isOpen && autocompleteState.filteredBooks.length > 0) {
          autocompleteState.selectedIndex = Math.min(
            autocompleteState.selectedIndex + 1,
            autocompleteState.filteredBooks.length - 1
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
      if (bookInput && autocompleteDropdown && 
          !bookInput.contains(e.target) && !autocompleteDropdown.contains(e.target)) {
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
  loadBooksData();
});
