document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
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

  // Load embedded data
  function loadBooksData() {
    try {
      if (typeof BOOKS_DATA === 'undefined' || !BOOKS_DATA || BOOKS_DATA.length === 0) {
        throw new Error('Book data not loaded. Please check if data/books_data.js is included.');
      }
      
      ALL_BOOKS = BOOKS_DATA;
      console.log('Total books loaded:', ALL_BOOKS.length);
      
      // Secret pool: only easy + medium books
      SECRET_POOL = ALL_BOOKS.filter(book => 
        book.difficulty === 'easy' || book.difficulty === 'medium'
      );
      console.log('Secret pool (easy+medium):', SECRET_POOL.length);
      
      if (SECRET_POOL.length > 0) {
        initializeGame();
        console.log('Game initialized');
      } else {
        console.error('No books available in secret pool');
        alert('No books available.');
      }
    } catch (error) {
      console.error('Error loading book data:', error);
      alert('Failed to load book data: ' + error.message);
    }
  }

  // Game State
  let gameState = {
    secretBook: null,
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
    
    // Author Nationality
    comparisons.authorNationality = secret.authorNationality === guess.authorNationality ? 'match' : 'different';
    
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
    
    // Page Count
    if (secret.pageCount === guess.pageCount) {
      comparisons.pageCount = 'match';
    } else if (guess.pageCount > secret.pageCount) {
      comparisons.pageCount = 'lower';
    } else {
      comparisons.pageCount = 'higher';
    }
    
    // Original Language
    comparisons.originalLanguage = secret.originalLanguage === guess.originalLanguage ? 'match' : 'different';
    
    return comparisons;
  }

  function getFeedbackText(property, comparison, value) {
    const propertyNames = {
      'author': 'Author',
      'authorNationality': 'Author From',
      'genre': 'Genre',
      'publicationYear': 'Published',
      'pageCount': 'Pages',
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

  function displayGuess(guess, comparisons) {
    const guessCard = document.createElement('div');
    guessCard.className = 'guess-card';
    
    const isCorrect = guess.title === gameState.secretBook.title;
    const bookNameClass = isCorrect ? 'guess-book-header correct' : 'guess-book-header';
    
    guessCard.innerHTML = `
      <div class="guess-line">
        <span class="${bookNameClass}">
          <span class="book-emoji-inline">📖</span>
          <span class="book-name-inline">${guess.title}</span>
          ${isCorrect ? '<span class="correct-badge">🎉</span>' : '<span class="wrong-badge">❌</span>'}
        </span>
        <span class="property-feedback ${getFeedbackClass(comparisons.author)}">${getFeedbackText('author', comparisons.author, guess.author)}</span>
        <span class="property-feedback ${getFeedbackClass(comparisons.authorNationality)}">${getFeedbackText('authorNationality', comparisons.authorNationality, guess.authorNationality)}</span>
        <span class="property-feedback ${getFeedbackClass(comparisons.genre)}">${getFeedbackText('genre', comparisons.genre, guess.genre)}</span>
        <span class="property-feedback ${getFeedbackClass(comparisons.publicationYear)}">${getFeedbackText('publicationYear', comparisons.publicationYear, guess.publicationYear)}</span>
        <span class="property-feedback ${getFeedbackClass(comparisons.pageCount)}">${getFeedbackText('pageCount', comparisons.pageCount, guess.pageCount)}</span>
        <span class="property-feedback ${getFeedbackClass(comparisons.originalLanguage)}">${getFeedbackText('originalLanguage', comparisons.originalLanguage, guess.originalLanguage)}</span>
      </div>
    `;
    
    guessesContainer.insertBefore(guessCard, guessesContainer.firstChild);
  }

  function filterBooks(query) {
    if (!query || query.trim() === '' || !ALL_BOOKS || ALL_BOOKS.length === 0) {
      return [];
    }
    const lowerQuery = query.toLowerCase().trim();
    
    return ALL_BOOKS.filter(book => {
      // Skip already guessed books
      if (gameState.guesses.some(g => g.title === book.title)) {
        return false;
      }
      
      // Match by title (always)
      if (book.title.toLowerCase().includes(lowerQuery)) {
        return true;
      }
      
      // In easy mode, also match by author name
      if (easyModeEnabled && book.author.toLowerCase().includes(lowerQuery)) {
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
      'authorNationality': 'Author From',
      'genre': 'Genre',
      'publicationYear': 'Published',
      'pageCount': 'Pages',
      'originalLanguage': 'Language'
    };
    const propertyName = propertyNames[property] || property;
    return `${propertyName}: ${value}`;
  }

  function displayAnswer() {
    const answerCard = document.createElement('div');
    answerCard.className = 'guess-card answer-reveal';
    const secret = gameState.secretBook;
    
    answerCard.innerHTML = `
      <div class="guess-line">
        <span class="guess-book-header answer-reveal-header">
          <span class="book-emoji-inline">📖</span>
          <span class="book-name-inline">${secret.title}</span>
          <span>😔</span>
        </span>
        <span class="property-feedback answer-reveal-feedback">${getAnswerFeedbackText('author', secret.author)}</span>
        <span class="property-feedback answer-reveal-feedback">${getAnswerFeedbackText('authorNationality', secret.authorNationality)}</span>
        <span class="property-feedback answer-reveal-feedback">${getAnswerFeedbackText('genre', secret.genre)}</span>
        <span class="property-feedback answer-reveal-feedback">${getAnswerFeedbackText('publicationYear', secret.publicationYear)}</span>
        <span class="property-feedback answer-reveal-feedback">${getAnswerFeedbackText('pageCount', secret.pageCount)}</span>
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
    
    guessSection.style.display = 'none';
    shareSection.style.display = 'block';
    if (modeToggle) {
      modeToggle.style.display = 'none';
    }
  }

  function shareResults() {
    const gameUrl = window.location.origin + window.location.pathname;
    let shareText;
    
    if (gameState.isSolved) {
      const status = `Solved in ${gameState.guesses.length} guess${gameState.guesses.length !== 1 ? 'es' : ''}!`;
      shareText = `🎉 Books Quiz 📚\n${status}\n\nPlay at: ${gameUrl}`;
    } else if (gameState.gaveUp) {
      const status = `Gave up after ${gameState.guesses.length} guess${gameState.guesses.length !== 1 ? 'es' : ''}`;
      shareText = `😞 Books Quiz 📚\n${status}\n\nPlay at: ${gameUrl}`;
    } else {
      const status = `Game Over after ${gameState.guesses.length} guess${gameState.guesses.length !== 1 ? 'es' : ''}`;
      shareText = `❌ Books Quiz 📚\n${status}\n\nPlay at: ${gameUrl}`;
    }
    
    if (navigator.share) {
      navigator.share({
        title: 'Books Quiz',
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
    gameState.secretBook = getDailyBook();
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

  // Load data and initialize
  loadBooksData();
});
