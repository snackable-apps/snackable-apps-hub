document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const movieInput = document.getElementById("movie-input");
  const autocompleteDropdown = document.getElementById("autocomplete-dropdown");
  const submitBtn = document.getElementById("submit-guess");
  const giveUpBtn = document.getElementById("give-up-btn");
  const shareResultsBtn = document.getElementById("share-results-btn");
  const shareSection = document.getElementById("share-section");
  const guessesContainer = document.getElementById("guesses-container");
  const guessCountEl = document.getElementById("guess-count");
  const gameStatusEl = document.getElementById("game-status");
  const guessSection = document.getElementById("guess-section");

  // Autocomplete state
  let autocompleteState = {
    selectedIndex: -1,
    filteredMovies: [],
    isOpen: false
  };

  // Data storage
  let ALL_MOVIES = [];
  let SECRET_POOL = [];

  // Load embedded data
  function loadMoviesData() {
    try {
      if (typeof MOVIES_DATA === 'undefined' || !MOVIES_DATA || MOVIES_DATA.length === 0) {
        throw new Error('Movie data not loaded.');
      }
      
      ALL_MOVIES = MOVIES_DATA;
      console.log('Total movies loaded:', ALL_MOVIES.length);
      
      // Secret pool: only easy + medium movies
      SECRET_POOL = ALL_MOVIES.filter(movie => 
        movie.difficulty === 'easy' || movie.difficulty === 'medium'
      );
      console.log('Secret pool (easy+medium):', SECRET_POOL.length);
      
      if (SECRET_POOL.length > 0) {
        initializeGame();
      } else {
        alert('No movies available.');
      }
    } catch (error) {
      console.error('Error loading movie data:', error);
      alert('Failed to load movie data: ' + error.message);
    }
  }

  // Game State
  let gameState = {
    secretMovie: null,
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

  function getDailyMovie() {
    const dateString = getDateString();
    const date = new Date(dateString);
    const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
    const index = dayOfYear % SECRET_POOL.length;
    return SECRET_POOL[index];
  }

  function compareProperties(secret, guess) {
    const comparisons = {};
    
    // Director
    comparisons.director = secret.director === guess.director ? 'match' : 'different';
    
    // Genres (array comparison)
    const secretGenres = new Set(secret.genres.map(g => g.toLowerCase()));
    const guessGenres = new Set(guess.genres.map(g => g.toLowerCase()));
    const genreIntersection = [...secretGenres].filter(g => guessGenres.has(g));
    
    if (genreIntersection.length === secretGenres.size && genreIntersection.length === guessGenres.size) {
      comparisons.genres = 'match';
    } else if (genreIntersection.length > 0) {
      comparisons.genres = 'partial';
    } else {
      comparisons.genres = 'different';
    }
    
    // Release Year
    if (secret.releaseYear === guess.releaseYear) {
      comparisons.releaseYear = 'match';
    } else if (guess.releaseYear > secret.releaseYear) {
      comparisons.releaseYear = 'lower';
    } else {
      comparisons.releaseYear = 'higher';
    }
    
    // Runtime
    if (secret.runtimeMinutes === guess.runtimeMinutes) {
      comparisons.runtime = 'match';
    } else if (guess.runtimeMinutes > secret.runtimeMinutes) {
      comparisons.runtime = 'lower';
    } else {
      comparisons.runtime = 'higher';
    }
    
    // IMDB Rating
    if (secret.imdbRating === guess.imdbRating) {
      comparisons.imdbRating = 'match';
    } else if (guess.imdbRating > secret.imdbRating) {
      comparisons.imdbRating = 'lower';
    } else {
      comparisons.imdbRating = 'higher';
    }
    
    // Country
    comparisons.country = secret.country === guess.country ? 'match' : 'different';
    
    // Cast (array comparison with individual matches)
    const secretCast = new Set((secret.cast || []).map(a => a.toLowerCase()));
    const guessCast = guess.cast || [];
    
    // For each actor in guess, check if they're in secret
    comparisons.castDetails = guessCast.slice(0, 6).map(actor => ({
      name: actor.split(' ').pop(), // Last name only for display
      fullName: actor,
      match: secretCast.has(actor.toLowerCase())
    }));
    
    // Overall cast comparison
    const matchCount = comparisons.castDetails.filter(a => a.match).length;
    if (matchCount === guessCast.length && matchCount === secretCast.size) {
      comparisons.cast = 'match';
    } else if (matchCount > 0) {
      comparisons.cast = 'partial';
    } else {
      comparisons.cast = 'different';
    }
    
    return comparisons;
  }

  function getFeedbackText(comparison, guessValue, type = 'text') {
    if (comparison === 'match') return '✅';
    if (comparison === 'partial') return '🔶';
    if (comparison === 'different') return '❌';
    if (comparison === 'higher') return '⬆️';
    if (comparison === 'lower') return '⬇️';
    return '';
  }

  function formatRuntime(minutes) {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  }

  // Game Functions
  function initializeGame() {
    gameState.currentDate = getDateString();
    gameState.secretMovie = getDailyMovie();
    gameState.guesses = [];
    gameState.isSolved = false;
    gameState.isGameOver = false;
    gameState.gaveUp = false;
    
    console.log('Secret movie:', gameState.secretMovie.title);
    
    // Track game start
    if (typeof gtag === 'function') {
      gtag('event', 'game_started', {
        game: 'movies-quiz',
        date: gameState.currentDate
      });
    }
    
    updateUI();
  }

  function filterMovies(query) {
    if (!query || query.length < 2) return [];
    
    const lowerQuery = query.toLowerCase();
    return ALL_MOVIES
      .filter(movie => {
        const alreadyGuessed = gameState.guesses.some(g => g.title === movie.title);
        if (alreadyGuessed) return false;
        return movie.title.toLowerCase().includes(lowerQuery);
      })
      .slice(0, 8);
  }

  function displayAutocomplete(movies) {
    autocompleteState.filteredMovies = movies;
    autocompleteState.selectedIndex = -1;
    
    if (movies.length === 0) {
      autocompleteDropdown.classList.remove('active');
      autocompleteState.isOpen = false;
      return;
    }
    
    autocompleteDropdown.innerHTML = movies.map((movie, index) => `
      <div class="autocomplete-item" data-index="${index}">
        <span class="autocomplete-title">${movie.title}</span>
        <span class="autocomplete-year">(${movie.releaseYear})</span>
      </div>
    `).join('');
    
    autocompleteDropdown.classList.add('active');
    autocompleteState.isOpen = true;
    
    // Add click handlers
    autocompleteDropdown.querySelectorAll('.autocomplete-item').forEach(item => {
      item.addEventListener('click', () => {
        const index = parseInt(item.dataset.index);
        selectAutocompleteItem(index);
      });
    });
  }

  function selectAutocompleteItem(index) {
    if (index >= 0 && index < autocompleteState.filteredMovies.length) {
      const movie = autocompleteState.filteredMovies[index];
      movieInput.value = movie.title;
      autocompleteDropdown.classList.remove('active');
      autocompleteState.isOpen = false;
      submitGuess(movie);
    }
  }

  function updateAutocompleteSelection() {
    const items = autocompleteDropdown.querySelectorAll('.autocomplete-item');
    items.forEach((item, index) => {
      item.classList.toggle('selected', index === autocompleteState.selectedIndex);
    });
    
    // Scroll selected item into view
    if (autocompleteState.selectedIndex >= 0) {
      items[autocompleteState.selectedIndex].scrollIntoView({ block: 'nearest' });
    }
  }

  function submitGuess(movie) {
    if (gameState.isGameOver) return;
    
    // Check if already guessed
    if (gameState.guesses.some(g => g.title === movie.title)) {
      return;
    }
    
    const isCorrect = movie.title === gameState.secretMovie.title;
    const comparisons = compareProperties(gameState.secretMovie, movie);
    
    gameState.guesses.push({
      ...movie,
      comparisons,
      isCorrect
    });
    
    // Track guess
    if (typeof gtag === 'function') {
      gtag('event', 'movie_guess', {
        game: 'movies-quiz',
        guess_number: gameState.guesses.length,
        is_correct: isCorrect
      });
    }
    
    if (isCorrect) {
      gameState.isSolved = true;
      gameState.isGameOver = true;
      
      if (typeof gtag === 'function') {
        gtag('event', 'movie_solved', {
          game: 'movies-quiz',
          guesses: gameState.guesses.length
        });
      }
    }
    
    movieInput.value = '';
    updateUI();
  }

  function giveUp() {
    if (gameState.isGameOver) return;
    
    gameState.gaveUp = true;
    gameState.isGameOver = true;
    
    if (typeof gtag === 'function') {
      gtag('event', 'movie_gave_up', {
        game: 'movies-quiz',
        guesses: gameState.guesses.length
      });
    }
    
    updateUI();
  }

  function displayGuess(guess) {
    const card = document.createElement('div');
    card.className = `guess-card ${guess.isCorrect ? 'correct' : ''}`;
    
    // Build cast HTML with individual actor matches
    const castHtml = guess.comparisons.castDetails
      .map(actor => `<span class="actor ${actor.match ? 'actor-match' : 'actor-different'}">${actor.name}</span>`)
      .join(' ');
    
    card.innerHTML = `
      <div class="guess-title">🎬 ${guess.title}</div>
      <div class="guess-properties">
        <div class="property ${guess.comparisons.director}">
          <div class="property-label">Director</div>
          <div class="property-value">
            ${getFeedbackText(guess.comparisons.director)} ${guess.director.split(' ').pop()}
          </div>
        </div>
        <div class="property ${guess.comparisons.genres}">
          <div class="property-label">Genre</div>
          <div class="property-value">
            ${getFeedbackText(guess.comparisons.genres)} ${guess.genres[0]}
          </div>
        </div>
        <div class="property ${guess.comparisons.releaseYear}">
          <div class="property-label">Year</div>
          <div class="property-value">
            ${getFeedbackText(guess.comparisons.releaseYear)} ${guess.releaseYear}
          </div>
        </div>
        <div class="property ${guess.comparisons.runtime}">
          <div class="property-label">Runtime</div>
          <div class="property-value">
            ${getFeedbackText(guess.comparisons.runtime)} ${formatRuntime(guess.runtimeMinutes)}
          </div>
        </div>
        <div class="property ${guess.comparisons.imdbRating}">
          <div class="property-label">IMDB</div>
          <div class="property-value">
            ${getFeedbackText(guess.comparisons.imdbRating)} ${guess.imdbRating}
          </div>
        </div>
        <div class="property ${guess.comparisons.country}">
          <div class="property-label">Country</div>
          <div class="property-value">
            ${getFeedbackText(guess.comparisons.country)} ${guess.country}
          </div>
        </div>
      </div>
      <div class="cast-section">
        <div class="cast-label">Cast:</div>
        <div class="cast-actors">${castHtml}</div>
      </div>
    `;
    
    return card;
  }

  function displayAnswer() {
    const movie = gameState.secretMovie;
    const castList = (movie.cast || []).slice(0, 6).map(a => a.split(' ').pop()).join(', ');
    
    const answerDiv = document.createElement('div');
    answerDiv.className = 'answer-reveal';
    answerDiv.innerHTML = `
      <h3>${gameState.isSolved ? '🎉 Correct!' : '📽️ The answer was:'}</h3>
      <div class="movie-title">${movie.title}</div>
      <div class="movie-details">
        <span>${movie.releaseYear}</span> • 
        <span>${movie.director}</span> • 
        <span>${movie.country}</span>
      </div>
      <div class="movie-cast">🎭 ${castList}</div>
    `;
    return answerDiv;
  }

  function updateUI() {
    // Update guess count
    guessCountEl.textContent = gameState.guesses.length;
    
    // Update game status
    if (gameState.isSolved) {
      gameStatusEl.textContent = `🎉 Solved in ${gameState.guesses.length} ${gameState.guesses.length === 1 ? 'guess' : 'guesses'}!`;
      gameStatusEl.style.color = '#2ecc71';
    } else if (gameState.gaveUp) {
      gameStatusEl.textContent = '😔 Better luck tomorrow!';
      gameStatusEl.style.color = '#e74c3c';
    } else {
      gameStatusEl.textContent = '';
    }
    
    // Clear and rebuild guesses
    guessesContainer.innerHTML = '';
    
    // Show answer if game over
    if (gameState.isGameOver) {
      guessesContainer.appendChild(displayAnswer());
    }
    
    // Display all guesses (newest first)
    [...gameState.guesses].reverse().forEach(guess => {
      guessesContainer.appendChild(displayGuess(guess));
    });
    
    // Show/hide sections
    if (gameState.isGameOver) {
      guessSection.style.display = 'none';
      shareSection.style.display = 'block';
    }
  }

  function generateShareText() {
    const emojis = gameState.guesses.map(guess => {
      const c = guess.comparisons;
      const getEmoji = (comp) => {
        if (comp === 'match') return '🟩';
        if (comp === 'partial') return '🟨';
        return '🟥';
      };
      return [
        getEmoji(c.director),
        getEmoji(c.genres),
        getEmoji(c.releaseYear),
        getEmoji(c.runtime),
        getEmoji(c.imdbRating),
        getEmoji(c.country)
      ].join('');
    }).join('\n');
    
    const result = gameState.isSolved 
      ? `🎬 Movie Quiz ${gameState.guesses.length}/∞`
      : `🎬 Movie Quiz X/∞`;
    
    return `${result}\n\n${emojis}\n\nhttps://snackable-games.com/movies-quiz/`;
  }

  function shareResults() {
    const text = generateShareText();
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        shareResultsBtn.textContent = '✅ Copied!';
        setTimeout(() => {
          shareResultsBtn.textContent = '📋 Share Results';
        }, 2000);
      });
    }
    
    if (typeof gtag === 'function') {
      gtag('event', 'share_clicked', {
        game: 'movies-quiz',
        solved: gameState.isSolved,
        guesses: gameState.guesses.length
      });
    }
  }

  // Event Listeners
  movieInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    const movies = filterMovies(query);
    displayAutocomplete(movies);
  });

  movieInput.addEventListener('keydown', (e) => {
    if (!autocompleteState.isOpen) {
      if (e.key === 'Enter') {
        const query = movieInput.value.trim().toLowerCase();
        const movie = ALL_MOVIES.find(m => m.title.toLowerCase() === query);
        if (movie) {
          submitGuess(movie);
        }
      }
      return;
    }
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        autocompleteState.selectedIndex = Math.min(
          autocompleteState.selectedIndex + 1,
          autocompleteState.filteredMovies.length - 1
        );
        updateAutocompleteSelection();
        break;
      case 'ArrowUp':
        e.preventDefault();
        autocompleteState.selectedIndex = Math.max(autocompleteState.selectedIndex - 1, -1);
        updateAutocompleteSelection();
        break;
      case 'Enter':
        e.preventDefault();
        if (autocompleteState.selectedIndex >= 0) {
          selectAutocompleteItem(autocompleteState.selectedIndex);
        }
        break;
      case 'Escape':
        autocompleteDropdown.classList.remove('active');
        autocompleteState.isOpen = false;
        break;
    }
  });

  movieInput.addEventListener('blur', () => {
    setTimeout(() => {
      autocompleteDropdown.classList.remove('active');
      autocompleteState.isOpen = false;
    }, 200);
  });

  submitBtn.addEventListener('click', () => {
    const query = movieInput.value.trim().toLowerCase();
    const movie = ALL_MOVIES.find(m => m.title.toLowerCase() === query);
    if (movie) {
      submitGuess(movie);
    }
  });

  giveUpBtn.addEventListener('click', giveUp);
  shareResultsBtn.addEventListener('click', shareResults);

  // Initialize
  loadMoviesData();
});
