document.addEventListener("DOMContentLoaded", async () => {
  // ========== SHARED UTILITIES INTEGRATION ==========
  
  // Initialize i18n (internationalization)
  const i18n = new I18n();
  await i18n.init();
  
  // Initialize game storage for persistence
  const gameStorage = new GameStorage('movies');
  gameStorage.cleanupOldStates();
  
  // Initialize stats modal
  const statsModal = new StatsModal(gameStorage, i18n);
  window.statsModal = statsModal;
  
  // Stats button handler
  const statsBtn = document.getElementById('stats-btn');
  if (statsBtn) {
    statsBtn.addEventListener('click', () => statsModal.show());
  }
  
  // Check if daily game was already completed
  const dailyState = gameStorage.getDailyState();
  let dailyCompleted = dailyState && dailyState.completed;
  
  // ========== DOM ELEMENTS ==========
  
  let movieInput = document.getElementById("movie-input");
  const autocompleteDropdown = document.getElementById("autocomplete-dropdown");
  const submitBtn = document.getElementById("submit-guess");
  const giveUpBtn = document.getElementById("give-up-btn");
  const shareResultsBtn = document.getElementById("share-results-btn");
  const playRandomBtn = document.getElementById("play-random-btn");
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

  // API endpoint
  const API_URL = 'https://snackable-api.vercel.app/api/movies';
  const CACHE_KEY = 'snackable_movies_cache';
  const CACHE_EXPIRY_HOURS = 24;

  // Transform raw API movie data to internal format
  function transformMovieData(movies) {
    return movies.map(movie => ({
      title: movie.title,
      director: movie.director,
      directorNationality: movie.directorNationality,
      genres: movie.genres,
      releaseYear: movie.releaseYear,
      runtimeMinutes: movie.runtime || movie.runtimeMinutes,
      imdbRating: movie.imdbRating,
      country: movie.country,
      cast: movie.cast,
      castWithImages: movie.castWithImages || [],
      posterUrl: movie.posterUrl || null,
      difficulty: movie.difficulty
    }));
  }

  // Check if cached data is still valid
  function isCacheValid() {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return false;
      
      const { timestamp } = JSON.parse(cached);
      const ageHours = (Date.now() - timestamp) / (1000 * 60 * 60);
      return ageHours < CACHE_EXPIRY_HOURS;
    } catch {
      return false;
    }
  }

  // Load movies from cache
  function loadFromCache() {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;
      
      const { movies, timestamp } = JSON.parse(cached);
      const ageHours = ((Date.now() - timestamp) / (1000 * 60 * 60)).toFixed(1);
      console.log(`Movies loaded from cache (${movies.length} movies, ${ageHours}h old)`);
      return movies;
    } catch (e) {
      console.error('Cache read error:', e);
      return null;
    }
  }

  // Save movies to cache
  function saveToCache(movies) {
    try {
      const cacheData = {
        movies: movies,
        timestamp: Date.now()
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      console.log('Movies saved to cache');
    } catch (e) {
      console.error('Cache write error (quota exceeded?):', e);
    }
  }

  // Load movies from API with localStorage caching
  async function loadMoviesData() {
    try {
      // Try to load from cache first for faster startup
      if (isCacheValid()) {
        const cachedMovies = loadFromCache();
        if (cachedMovies && cachedMovies.length > 0) {
          ALL_MOVIES = cachedMovies;
          initializeAfterLoad();
          
          // Refresh cache in background (don't block UI)
          refreshCacheInBackground();
          return;
        }
      }
      
      // No valid cache - fetch from API
      console.log('Fetching movies from API...');
      const response = await fetch(API_URL);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success || !data.movies || data.movies.length === 0) {
        throw new Error('No movies returned from API');
      }
      
      // Transform and store
      ALL_MOVIES = transformMovieData(data.movies);
      console.log('Movies loaded from API:', ALL_MOVIES.length);
      
      // Save to cache for next time
      saveToCache(ALL_MOVIES);
      
    } catch (apiError) {
      console.error('API fetch failed:', apiError.message);
      
      // Try cache as fallback even if expired
      const fallbackCache = loadFromCache();
      if (fallbackCache && fallbackCache.length > 0) {
        ALL_MOVIES = fallbackCache;
      } else {
        GameUtils.showError('common.loadError', true);
        return;
      }
    }
    
    initializeAfterLoad();
  }

  // Background cache refresh (doesn't block UI)
  async function refreshCacheInBackground() {
    try {
      const response = await fetch(API_URL);
      if (!response.ok) return;
      
      const data = await response.json();
      if (!data.success || !data.movies) return;
      
      const freshMovies = transformMovieData(data.movies);
      saveToCache(freshMovies);
      
      // Update in-memory data if significantly different
      if (Math.abs(freshMovies.length - ALL_MOVIES.length) > 10) {
        console.log('Cache refreshed with new data');
        ALL_MOVIES = freshMovies;
      }
    } catch (e) {
      // Silent fail for background refresh
      console.log('Background cache refresh failed (not critical)');
    }
  }

  // Initialize game after movies are loaded
  function initializeAfterLoad() {
    
    // Secret pool: only easy + medium movies
    SECRET_POOL = ALL_MOVIES.filter(movie => 
      movie.difficulty === 'easy' || movie.difficulty === 'medium'
    );
    console.log('Secret pool (easy+medium):', SECRET_POOL.length);
    
    // Hide loading state, show game
    const loadingState = document.getElementById('loading-state');
    if (loadingState) loadingState.style.display = 'none';
    guessSection.style.display = 'flex';
    
    if (SECRET_POOL.length > 0) {
      // If daily was already completed, show the result and allow random play
      if (dailyCompleted && dailyState) {
        restoreDailyResult();
      } else {
        initializeGame();
      }
    } else {
      GameUtils.showError('common.noDataAvailable', true);
    }
  }
  
  // Restore and display the completed daily game result
  function restoreDailyResult() {
    const todaysMovie = getDailyMovie();
    
    gameState.secretMovie = todaysMovie;
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
    
    // Hide clues panel when just showing the result
    if (cluesPanel) cluesPanel.style.display = 'none';
    
    // Update UI to show result (but don't show clues panel)
    updateUI();
    
    // Ensure clues panel stays hidden after updateUI
    if (cluesPanel) cluesPanel.style.display = 'none';
  }
  
  function playRandom() {
    console.log('playRandom: Called');
    
    // Ensure we have movies loaded
    if (SECRET_POOL.length === 0) {
      console.error('playRandom: SECRET_POOL is empty!');
      return;
    }
    
    // Select a random movie from the pool (different from current if exists)
    const currentTitle = gameState.secretMovie ? gameState.secretMovie.title : null;
    const availableMovies = SECRET_POOL.filter(m => m.title !== currentTitle);
    const randomIndex = Math.floor(Math.random() * availableMovies.length);
    const randomMovie = availableMovies[randomIndex] || SECRET_POOL[0];
    
    // Reset game state
    gameState.secretMovie = randomMovie;
    gameState.currentDate = getDateString();
    gameState.guesses = [];
    gameState.isSolved = false;
    gameState.isGameOver = false;
    gameState.gaveUp = false;
    gameState.isRandomMode = true;
    
    // Reset clues
    resetCluesState();
    
    // Reset autocomplete state
    autocompleteState.selectedIndex = -1;
    autocompleteState.filteredMovies = [];
    autocompleteState.isOpen = false;
    
    // Reset UI elements
    guessesContainer.innerHTML = '';
    guessCountEl.textContent = '0';
    gameStatusEl.textContent = '';
    gameStatusEl.className = '';
    gameStatusEl.style.color = '';
    
    // Force show guess section, hide share section
    guessSection.style.display = 'flex';
    guessSection.style.visibility = 'visible';
    guessSection.style.pointerEvents = 'auto';
    shareSection.style.display = 'none';
    
    // Re-get input element in case DOM was modified
    const inputEl = document.getElementById('movie-input');
    if (inputEl) {
      inputEl.value = '';
      inputEl.disabled = false;
      inputEl.readOnly = false;
      inputEl.style.pointerEvents = 'auto';
      inputEl.style.opacity = '1';
    }
    movieInput.value = '';
    movieInput.disabled = false;
    movieInput.readOnly = false;
    submitBtn.disabled = false;
    giveUpBtn.disabled = false;
    
    // Reset autocomplete dropdown
    autocompleteDropdown.innerHTML = '';
    autocompleteDropdown.style.display = 'none';
    autocompleteDropdown.classList.remove('active');
    
    // Hide clues panel for fresh start
    if (cluesPanel) cluesPanel.style.display = 'none';
    
    // Focus input after brief delay
    setTimeout(() => {
      movieInput.focus();
      console.log('playRandom: Input focused');
      console.log('playRandom: guessSection display:', guessSection.style.display);
      console.log('playRandom: movieInput disabled:', movieInput.disabled);
      console.log('playRandom: movieInput value:', movieInput.value);
    }, 100);
    
    console.log('playRandom: Starting random game with movie:', randomMovie.title);
    console.log('playRandom: ALL_MOVIES count:', ALL_MOVIES.length);
    
    // Track random play
    if (typeof gtag === 'function') {
      gtag('event', 'movies_play_random', { movie: randomMovie.title });
    }
  }

  // Game State
  let gameState = {
    secretMovie: null,
    guesses: [],
    isSolved: false,
    isGameOver: false,
    gaveUp: false,
    currentDate: null,
    isRandomMode: dailyCompleted // Start in random mode if daily already done
  };

  // Clues State - aggregated info from all guesses
  let cluesState = {
    // Ranges (null = unknown, value = confirmed or bounded)
    yearMin: null,
    yearMax: null,
    yearConfirmed: null,
    runtimeMin: null,
    runtimeMax: null,
    runtimeConfirmed: null,
    ratingMin: null,
    ratingMax: null,
    ratingConfirmed: null,
    // Confirmed values
    directorConfirmed: null,
    countryConfirmed: null,
    // Matched genres and cast (with total counts for displaying unknown slots)
    matchedGenres: new Set(),
    totalGenreCount: 0,
    matchedCast: new Map(), // Map of name -> {name, image, position}
    totalCastCount: 0,
    secretCastOrder: [], // Array of actor names in original order (for position lookup)
    // Excluded values (for display)
    excludedCountries: new Set(),
    excludedDirectors: new Set(),
    excludedGenres: new Set(),
    excludedActors: new Set()
  };

  // Clues Panel Elements
  const cluesPanel = document.getElementById('clues-panel');
  const cluesContent = document.getElementById('clues-content');
  const cluesToggle = document.getElementById('clues-toggle');
  const cluesHeader = document.querySelector('.clues-header');

  // Use centralized utility functions from GameUtils
  const getDateString = GameUtils.getDateString.bind(GameUtils);

  function getDailyMovie() {
    const dateString = getDateString();
    const date = new Date(dateString);
    const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
    const index = dayOfYear % SECRET_POOL.length;
    return SECRET_POOL[index];
  }

  // Convert 2-letter country code to flag emoji
  function countryCodeToFlag(code) {
    if (!code || code.length !== 2) return code || '';
    const upper = code.toUpperCase();
    // Convert each letter to regional indicator symbol
    const flag = String.fromCodePoint(
      ...upper.split('').map(c => 0x1F1E6 + c.charCodeAt(0) - 65)
    );
    return `${upper} ${flag}`;
  }

  function compareProperties(secret, guess) {
    const comparisons = {};
    
    // Director
    comparisons.director = secret.director === guess.director ? 'match' : 'different';
    
    // Genres (array comparison with individual matches)
    const secretGenres = new Set(secret.genres.map(g => g.toLowerCase()));
    const guessGenres = guess.genres || [];
    
    // For each genre in guess, check if it's in secret
    comparisons.genreDetails = guessGenres.map(genre => ({
      name: genre,
      match: secretGenres.has(genre.toLowerCase())
    }));
    
    // Overall genre comparison
    const genreMatchCount = comparisons.genreDetails.filter(g => g.match).length;
    if (genreMatchCount === guessGenres.length && genreMatchCount === secretGenres.size) {
      comparisons.genres = 'match';
    } else if (genreMatchCount > 0) {
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
    const guessCastWithImages = guess.castWithImages || [];
    
    // For each actor in guess, check if they're in secret
    comparisons.castDetails = guessCast.map((actor, idx) => {
      const imageData = guessCastWithImages[idx];
      return {
        name: actor.split(' ').pop(), // Last name only for display
        fullName: actor,
        match: secretCast.has(actor.toLowerCase()),
        image: imageData?.image || null, // All actors can have images
        showImage: !!(imageData?.image) // Show image card if image available
      };
    });
    
    // Overall cast comparison
    const castMatchCount = comparisons.castDetails.filter(a => a.match).length;
    if (castMatchCount === guessCast.length && castMatchCount === secretCast.size) {
      comparisons.cast = 'match';
    } else if (castMatchCount > 0) {
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

  // Use centralized normalizeText from GameUtils
  const normalizeText = GameUtils.normalizeText;

  function formatRuntime(minutes) {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  }

  function formatRuntimeShort(minutes) {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs > 0 && mins > 0) {
      return `${hrs}h${mins}`;
    } else if (hrs > 0) {
      return `${hrs}h`;
    }
    return `${mins}m`;
  }

  // Format actor name as "Ryan GOSLING"
  function formatActorName(fullName) {
    const parts = fullName.trim().split(' ');
    if (parts.length === 1) {
      return parts[0].toUpperCase();
    }
    const lastName = parts.pop().toUpperCase();
    const firstName = parts.join(' ');
    return `${firstName} ${lastName}`;
  }

  // Update clues state after a guess
  function updateCluesState(guess, comparisons) {
    // Year
    if (comparisons.releaseYear === 'match') {
      cluesState.yearConfirmed = guess.releaseYear;
    } else if (comparisons.releaseYear === 'higher') {
      // Secret is higher than guess, so min bound
      if (cluesState.yearMin === null || guess.releaseYear > cluesState.yearMin) {
        cluesState.yearMin = guess.releaseYear;
      }
    } else if (comparisons.releaseYear === 'lower') {
      // Secret is lower than guess, so max bound
      if (cluesState.yearMax === null || guess.releaseYear < cluesState.yearMax) {
        cluesState.yearMax = guess.releaseYear;
      }
    }

    // Runtime
    if (comparisons.runtime === 'match') {
      cluesState.runtimeConfirmed = guess.runtimeMinutes;
    } else if (comparisons.runtime === 'higher') {
      // Secret is longer than guess
      if (cluesState.runtimeMin === null || guess.runtimeMinutes > cluesState.runtimeMin) {
        cluesState.runtimeMin = guess.runtimeMinutes;
      }
    } else if (comparisons.runtime === 'lower') {
      // Secret is shorter than guess
      if (cluesState.runtimeMax === null || guess.runtimeMinutes < cluesState.runtimeMax) {
        cluesState.runtimeMax = guess.runtimeMinutes;
      }
    }

    // Rating
    if (comparisons.imdbRating === 'match') {
      cluesState.ratingConfirmed = guess.imdbRating;
    } else if (comparisons.imdbRating === 'higher') {
      // Secret is higher rated than guess
      if (cluesState.ratingMin === null || guess.imdbRating > cluesState.ratingMin) {
        cluesState.ratingMin = guess.imdbRating;
      }
    } else if (comparisons.imdbRating === 'lower') {
      // Secret is lower rated than guess
      if (cluesState.ratingMax === null || guess.imdbRating < cluesState.ratingMax) {
        cluesState.ratingMax = guess.imdbRating;
      }
    }

    // Director
    if (comparisons.director === 'match') {
      cluesState.directorConfirmed = guess.director;
    } else {
      cluesState.excludedDirectors.add(guess.director);
    }

    // Country
    if (comparisons.country === 'match') {
      cluesState.countryConfirmed = guess.country;
    } else {
      cluesState.excludedCountries.add(guess.country);
    }

    // Genres - track matches and exclusions
    // Set total genre count from secret movie on first guess
    if (cluesState.totalGenreCount === 0 && gameState.secretMovie && gameState.secretMovie.genres) {
      cluesState.totalGenreCount = gameState.secretMovie.genres.length;
    }
    comparisons.genreDetails.forEach(g => {
      if (g.match) {
        cluesState.matchedGenres.add(g.name);
      } else {
        cluesState.excludedGenres.add(g.name);
      }
    });

    // Cast - track matches and exclusions (with images for matched)
    // Set total cast count and store secret cast order on first guess
    if (cluesState.totalCastCount === 0 && gameState.secretMovie && gameState.secretMovie.cast) {
      cluesState.totalCastCount = gameState.secretMovie.cast.length;
      cluesState.secretCastOrder = gameState.secretMovie.cast.map(name => name.toLowerCase());
    }
    comparisons.castDetails.forEach(a => {
      if (a.match) {
        // Find position in secret movie's cast list
        const position = cluesState.secretCastOrder.indexOf(a.fullName.toLowerCase());
        // Store with image URL and position for display in clues panel
        cluesState.matchedCast.set(a.fullName.toLowerCase(), { 
          name: a.fullName, 
          image: a.image,
          position: position >= 0 ? position : cluesState.matchedCast.size
        });
      } else {
        cluesState.excludedActors.add(a.fullName);
      }
    });
  }

  // Render the clues panel
  function renderCluesPanel() {
    // Show panel if we have any guesses
    if (gameState.guesses.length === 0) {
      cluesPanel.style.display = 'none';
      return;
    }
    cluesPanel.style.display = 'block';

    // Year
    const yearItem = document.getElementById('clue-year');
    const yearValue = document.getElementById('clue-year-value');
    if (cluesState.yearConfirmed) {
      yearItem.className = 'clue-item confirmed';
      yearValue.textContent = cluesState.yearConfirmed;
    } else if (cluesState.yearMin !== null || cluesState.yearMax !== null) {
      yearItem.className = 'clue-item narrowed';
      const min = cluesState.yearMin ? `>${cluesState.yearMin}` : '';
      const max = cluesState.yearMax ? `<${cluesState.yearMax}` : '';
      yearValue.textContent = min && max ? `${cluesState.yearMin + 1}-${cluesState.yearMax - 1}` : (min || max);
    } else {
      yearItem.className = 'clue-item';
      yearValue.textContent = '?';
    }

    // Runtime (same format as year - show range)
    const runtimeItem = document.getElementById('clue-runtime');
    const runtimeValue = document.getElementById('clue-runtime-value');
    if (cluesState.runtimeConfirmed) {
      runtimeItem.className = 'clue-item confirmed';
      runtimeValue.textContent = formatRuntimeShort(cluesState.runtimeConfirmed);
    } else if (cluesState.runtimeMin !== null || cluesState.runtimeMax !== null) {
      runtimeItem.className = 'clue-item narrowed';
      if (cluesState.runtimeMin !== null && cluesState.runtimeMax !== null) {
        // Show range like year: "1h50-2h10"
        runtimeValue.textContent = `${formatRuntimeShort(cluesState.runtimeMin + 1)}-${formatRuntimeShort(cluesState.runtimeMax - 1)}`;
      } else if (cluesState.runtimeMin !== null) {
        runtimeValue.textContent = `>${formatRuntimeShort(cluesState.runtimeMin)}`;
      } else {
        runtimeValue.textContent = `<${formatRuntimeShort(cluesState.runtimeMax)}`;
      }
    } else {
      runtimeItem.className = 'clue-item';
      runtimeValue.textContent = '?';
    }

    // Rating (same format as year - show range)
    const ratingItem = document.getElementById('clue-rating');
    const ratingValue = document.getElementById('clue-rating-value');
    if (cluesState.ratingConfirmed) {
      ratingItem.className = 'clue-item confirmed';
      ratingValue.textContent = cluesState.ratingConfirmed;
    } else if (cluesState.ratingMin !== null || cluesState.ratingMax !== null) {
      ratingItem.className = 'clue-item narrowed';
      if (cluesState.ratingMin !== null && cluesState.ratingMax !== null) {
        // Show range like year
        const minVal = (cluesState.ratingMin + 0.1).toFixed(1);
        const maxVal = (cluesState.ratingMax - 0.1).toFixed(1);
        ratingValue.textContent = `${minVal}-${maxVal}`;
      } else if (cluesState.ratingMin !== null) {
        ratingValue.textContent = `>${cluesState.ratingMin}`;
      } else {
        ratingValue.textContent = `<${cluesState.ratingMax}`;
      }
    } else {
      ratingItem.className = 'clue-item';
      ratingValue.textContent = '?';
    }

    // Director (format: "Damien CHAZELLE")
    const directorItem = document.getElementById('clue-director');
    const directorValue = document.getElementById('clue-director-value');
    if (cluesState.directorConfirmed) {
      directorItem.className = 'clue-item confirmed';
      directorValue.textContent = formatActorName(cluesState.directorConfirmed);
    } else {
      directorItem.className = 'clue-item';
      directorValue.textContent = '?';
    }

    // Country
    const countryItem = document.getElementById('clue-country');
    const countryValue = document.getElementById('clue-country-value');
    if (cluesState.countryConfirmed) {
      countryItem.className = 'clue-item confirmed';
      countryValue.textContent = countryCodeToFlag(cluesState.countryConfirmed);
    } else {
      countryItem.className = 'clue-item';
      countryValue.textContent = '?';
    }

    // Genres - show total count with "????" for undiscovered
    const genresGroup = document.getElementById('clue-genres-group');
    const genresContainer = document.getElementById('clue-genres');
    if (cluesState.totalGenreCount > 0) {
      genresGroup.style.display = 'flex';
      const matchedArray = [...cluesState.matchedGenres];
      const unknownCount = cluesState.totalGenreCount - matchedArray.length;
      const genreSlots = [
        ...matchedArray.map(g => `<span class="clue-tag match">${g}</span>`),
        ...Array(unknownCount).fill('<span class="clue-tag unknown">????</span>')
      ];
      genresContainer.innerHTML = genreSlots.join('');
    } else {
      genresGroup.style.display = 'none';
    }

    // Cast - show with pictures in correct order (with placeholders)
    const castGroup = document.getElementById('clue-cast-group');
    const castContainer = document.getElementById('clue-cast');
    if (cluesState.totalCastCount > 0) {
      castGroup.style.display = 'flex';
      
      // Create array of slots for all cast positions
      const castSlots = new Array(cluesState.totalCastCount).fill(null);
      
      // Place matched actors at their correct positions
      cluesState.matchedCast.forEach(actor => {
        if (actor.position >= 0 && actor.position < cluesState.totalCastCount) {
          castSlots[actor.position] = actor;
        }
      });
      
      // Render slots (actor or placeholder)
      castContainer.innerHTML = castSlots.map((actor, idx) => {
        if (actor) {
          const hasImage = !!actor.image;
          const clickableClass = hasImage ? 'clickable' : '';
          const onclickAttr = hasImage 
            ? `onclick="openActorLightbox('${actor.image.replace(/'/g, "\\'")}', '${actor.name.replace(/'/g, "\\'")}')"` 
            : '';
          const imgHtml = hasImage 
            ? `<img src="${actor.image}" alt="${actor.name}" class="clue-actor-img ${clickableClass}" ${onclickAttr} onerror="this.style.display='none';this.classList.remove('clickable');this.removeAttribute('onclick')">`
            : '';
          return `<div class="clue-actor">${imgHtml}<span class="clue-actor-name">${formatActorName(actor.name)}</span></div>`;
        } else {
          return `<div class="clue-actor unknown"><span class="clue-actor-name">????</span></div>`;
        }
      }).join('');
    } else {
      castGroup.style.display = 'none';
    }

    // Excluded sections (NOT clues) using centralized utility
    const excludedRow = document.getElementById('clue-excluded-row');
    
    // Excluded countries
    const hasCountry = GameUtils.renderExcludedSection({
      containerEl: document.getElementById('clue-excluded-country-section'),
      excludedSet: cluesState.excludedCountries,
      confirmedValue: cluesState.countryConfirmed,
      maxItems: 6,
      formatFn: c => countryCodeToFlag(c),
      separator: ' '
    });
    
    // Excluded directors
    const hasDirector = GameUtils.renderExcludedSection({
      containerEl: document.getElementById('clue-excluded-directors-section'),
      excludedSet: cluesState.excludedDirectors,
      confirmedValue: cluesState.directorConfirmed,
      maxItems: 5,
      formatFn: d => formatActorName(d)
    });
    
    // Excluded genres (hide if all genres found)
    const allGenresFound = cluesState.totalGenreCount > 0 && cluesState.matchedGenres.size >= cluesState.totalGenreCount;
    const hasGenre = GameUtils.renderExcludedSection({
      containerEl: document.getElementById('clue-excluded-genres-section'),
      excludedSet: cluesState.excludedGenres,
      allMatched: allGenresFound,
      maxItems: 8
    });
    
    // Excluded actors (hide if all actors found)
    const allActorsFound = cluesState.totalCastCount > 0 && cluesState.matchedCast.size >= cluesState.totalCastCount;
    const hasActor = GameUtils.renderExcludedSection({
      containerEl: document.getElementById('clue-excluded-actors-section'),
      excludedSet: cluesState.excludedActors,
      allMatched: allActorsFound,
      maxItems: 6,
      formatFn: a => formatActorName(a)
    });

    excludedRow.style.display = (hasCountry || hasDirector || hasGenre || hasActor) ? 'flex' : 'none';
  }

  // Reset clues state
  function resetCluesState() {
    cluesState = {
      yearMin: null,
      yearMax: null,
      yearConfirmed: null,
      runtimeMin: null,
      runtimeMax: null,
      runtimeConfirmed: null,
      ratingMin: null,
      ratingMax: null,
      ratingConfirmed: null,
      directorConfirmed: null,
      countryConfirmed: null,
      matchedGenres: new Set(),
      totalGenreCount: 0,
      matchedCast: new Map(),
      totalCastCount: 0,
      secretCastOrder: [],
      excludedCountries: new Set(),
      excludedDirectors: new Set(),
      excludedGenres: new Set(),
      excludedActors: new Set()
    };
  }

  // Game Functions
  function initializeGame() {
    gameState.currentDate = getDateString();
    gameState.secretMovie = getDailyMovie();
    gameState.guesses = [];
    gameState.isSolved = false;
    gameState.isGameOver = false;
    gameState.gaveUp = false;
    
    // Reset clues state
    resetCluesState();
    
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
    
    const normalizedQuery = normalizeText(query);
    return ALL_MOVIES
      .filter(movie => {
        const alreadyGuessed = gameState.guesses.some(g => g.title === movie.title);
        if (alreadyGuessed) return false;
        return normalizeText(movie.title).includes(normalizedQuery);
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
    
    autocompleteDropdown.innerHTML = movies.map((movie, index) => {
      const posterHtml = movie.posterUrl 
        ? `<img src="${movie.posterUrl}" alt="" class="autocomplete-poster" onerror="this.style.display='none'">`
        : '<div class="autocomplete-poster-placeholder">🎬</div>';
      return `
        <div class="autocomplete-item" data-index="${index}">
          ${posterHtml}
          <div class="autocomplete-info">
            <span class="autocomplete-title">${movie.title}</span>
            <span class="autocomplete-year">(${movie.releaseYear})</span>
          </div>
        </div>
      `;
    }).join('');
    
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
    
    // Update clues state with this guess
    updateCluesState(movie, comparisons);

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
      
      // Save game result to storage
      if (!dailyCompleted && !gameState.isRandomMode) {
        gameStorage.completeDailyGame({
          won: true,
          guesses: gameState.guesses.length,
          movie: gameState.secretMovie.title,
          gameData: {
            won: true,
            guesses: gameState.guesses.map(g => ({
              title: g.title,
              director: g.director,
              releaseYear: g.releaseYear,
              runtimeMinutes: g.runtimeMinutes,
              imdbRating: g.imdbRating,
              country: g.country,
              genres: g.genres,
              cast: g.cast,
              castWithImages: g.castWithImages,
              posterUrl: g.posterUrl,
              comparisons: g.comparisons,
              isCorrect: g.isCorrect
            }))
          }
        });
        dailyCompleted = true;
      } else {
        gameStorage.updateStats({
          won: true,
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
    
    // Save game result to storage (gave up = loss)
    if (!dailyCompleted && !gameState.isRandomMode) {
      gameStorage.completeDailyGame({
        won: false,
        guesses: gameState.guesses.length,
        movie: gameState.secretMovie.title,
        gameData: {
          won: false,
          guesses: gameState.guesses.map(g => ({
            title: g.title,
            director: g.director,
            releaseYear: g.releaseYear,
            runtimeMinutes: g.runtimeMinutes,
            imdbRating: g.imdbRating,
            country: g.country,
            genres: g.genres,
            cast: g.cast,
            castWithImages: g.castWithImages,
            posterUrl: g.posterUrl,
            comparisons: g.comparisons,
            isCorrect: g.isCorrect
          }))
        }
      });
      dailyCompleted = true;
    } else {
      gameStorage.updateStats({
        won: false,
        guesses: gameState.guesses.length
      });
    }
    
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
    
    // Build cast HTML - all actors get cards (with image or placeholder avatar)
    const castHtml = guess.comparisons.castDetails
      .map(actor => {
        const hasImage = !!actor.image;
        const clickableClass = hasImage ? 'clickable' : '';
        const onclickAttr = hasImage 
          ? `onclick="openActorLightbox('${actor.image.replace(/'/g, "\\'")}', '${actor.fullName.replace(/'/g, "\\'")}')"` 
          : '';
        const imageHtml = hasImage 
          ? `<img src="${actor.image}" alt="${actor.fullName}" class="actor-img" onerror="this.parentElement.innerHTML='<span class=\\'actor-placeholder\\'>👤</span>'">`
          : '<span class="actor-placeholder">👤</span>';
        return `<div class="actor ${actor.match ? 'actor-match' : 'actor-different'}"><div class="actor-avatar ${clickableClass}" ${onclickAttr}>${imageHtml}</div><span class="actor-name">${formatActorName(actor.fullName)}</span></div>`;
      })
      .join('');
    
    // Build genres HTML
    const genresHtml = guess.comparisons.genreDetails
      .map(g => `<span class="genre ${g.match ? 'genre-match' : 'genre-different'}">${g.name}</span>`)
      .join('');
    
    // Movie poster for the guessed movie (clickable to view large)
    const guessPosterHtml = guess.posterUrl 
      ? `<img src="${guess.posterUrl}" alt="${guess.title}" class="guess-poster clickable" onclick="openActorLightbox('${guess.posterUrl.replace(/'/g, "\\'")}', '${guess.title.replace(/'/g, "\\'")}')" onerror="this.style.display='none'">`
      : '';
    
    card.innerHTML = `
      <div class="guess-row-main">
        ${guessPosterHtml}
        <div class="guess-content">
          <div class="guess-title">🎬 ${guess.title}</div>
          <div class="guess-properties">
            <div class="property ${guess.comparisons.director}">
              <div class="property-label">${i18n.t('games.movies.director')}</div>
              <div class="property-value">
                ${getFeedbackText(guess.comparisons.director)} ${formatActorName(guess.director)}
              </div>
            </div>
            <div class="property ${guess.comparisons.releaseYear}">
              <div class="property-label">${i18n.t('games.movies.year')}</div>
              <div class="property-value">
                ${getFeedbackText(guess.comparisons.releaseYear)} ${guess.releaseYear}
              </div>
            </div>
            <div class="property ${guess.comparisons.runtime}">
              <div class="property-label">${i18n.t('games.movies.runtime')}</div>
              <div class="property-value">
                ${getFeedbackText(guess.comparisons.runtime)} ${formatRuntime(guess.runtimeMinutes)}
              </div>
            </div>
            <div class="property ${guess.comparisons.imdbRating}">
              <div class="property-label">${i18n.t('games.movies.rating')}</div>
              <div class="property-value">
                ${getFeedbackText(guess.comparisons.imdbRating)} ${guess.imdbRating}
              </div>
            </div>
            <div class="property ${guess.comparisons.country}">
              <div class="property-label">${i18n.t('games.movies.country')}</div>
              <div class="property-value">
                ${getFeedbackText(guess.comparisons.country)} ${countryCodeToFlag(guess.country)}
              </div>
            </div>
          </div>
          <div class="guess-genres">
            <span class="details-label">${i18n.t('games.movies.genres')}:</span> ${genresHtml}
          </div>
        </div>
      </div>
      <div class="guess-row-cast">
        ${castHtml}
      </div>
    `;
    
    return card;
  }

  function displayAnswer() {
    // Only called when gave up - show the full movie details with clickable actor images
    const answerDiv = document.createElement('div');
    answerDiv.className = 'answer-reveal';
    
    const movie = gameState.secretMovie;
    const castWithImages = movie.castWithImages || [];
    
    // Build cast HTML with clickable images (or placeholder avatar)
    const castHtml = castWithImages.map(actor => {
      const hasImage = !!actor.image;
      const clickableClass = hasImage ? 'clickable' : '';
      const onclickAttr = hasImage 
        ? `onclick="openActorLightbox('${actor.image.replace(/'/g, "\\'")}', '${actor.name.replace(/'/g, "\\'")}')"` 
        : '';
      const imageHtml = hasImage 
        ? `<img src="${actor.image}" alt="${actor.name}" class="actor-img" onerror="this.parentElement.innerHTML='<span class=\\'actor-placeholder\\'>👤</span>'">`
        : '<span class="actor-placeholder">👤</span>';
      return `<div class="actor answer-actor"><div class="actor-avatar ${clickableClass}" ${onclickAttr}>${imageHtml}</div><span class="actor-name">${formatActorName(actor.name)}</span></div>`;
    }).join('');
    
    const posterHtml = movie.posterUrl 
      ? `<img src="${movie.posterUrl}" alt="${movie.title}" class="movie-poster clickable" onclick="openActorLightbox('${movie.posterUrl.replace(/'/g, "\\'")}', '${movie.title.replace(/'/g, "\\'")}')" onerror="this.style.display='none'">`
      : '';
    
    answerDiv.innerHTML = `
      <h3>📽️ The answer was:</h3>
      <div class="answer-content">
        ${posterHtml}
        <div class="answer-info">
          <div class="movie-title">${movie.title}</div>
          <div class="movie-details">
            <span>${movie.releaseYear}</span> • 
            <span>${movie.director}</span> • 
            <span>${countryCodeToFlag(movie.country)}</span>
          </div>
        </div>
      </div>
      <div class="answer-cast">
        <div class="answer-cast-label">🎭 Cast:</div>
        <div class="answer-cast-grid">${castHtml}</div>
      </div>
    `;
    return answerDiv;
  }

  function updateUI() {
    // Update guess count
    guessCountEl.textContent = gameState.guesses.length;
    
    // Render clues panel
    renderCluesPanel();
    
    // Update game status
    if (gameState.isSolved) {
      const solvedKey = gameState.guesses.length === 1 ? 'common.solvedIn' : 'common.solvedInPlural';
      gameStatusEl.textContent = `🎉 ${i18n.t(solvedKey).replace('{count}', gameState.guesses.length)}`;
      gameStatusEl.style.color = '#2ecc71';
    } else if (gameState.gaveUp) {
      const gaveUpKey = gameState.guesses.length === 1 ? 'common.gaveUpAfter' : 'common.gaveUpAfterPlural';
      gameStatusEl.textContent = `😔 ${i18n.t(gaveUpKey).replace('{count}', gameState.guesses.length)}`;
      gameStatusEl.style.color = '#e74c3c';
    } else {
      gameStatusEl.textContent = '';
    }
    
    // Clear and rebuild guesses
    guessesContainer.innerHTML = '';
    
    // Show answer only if gave up (when solved, the correct guess card already shows the movie)
    if (gameState.isGameOver && gameState.gaveUp) {
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
      // Hide share button for random games (only daily results can be shared)
      shareResultsBtn.style.display = gameState.isRandomMode ? 'none' : '';
      // Hide clues panel when game is over
      if (cluesPanel) cluesPanel.style.display = 'none';
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
    
    const gameType = gameState.isRandomMode ? '🎲' : getDateString();
    const result = gameState.isSolved 
      ? `🎬 Movie Quiz ${gameType} ${gameState.guesses.length}/∞`
      : `🎬 Movie Quiz ${gameType} X/∞`;
    
    return `${result}\n\n${emojis}\n\nhttps://snackable-games.com/movies-quiz/`;
  }

  function shareResults() {
    const text = generateShareText();
    
    GameUtils.shareGameResult({
      text: text,
      title: 'Movie Quiz Result',
      button: shareResultsBtn,
      successMessage: `✅ ${i18n.t('share.copiedToClipboard')}`,
      originalHTML: `📋 <span data-i18n="common.shareResults">${i18n.t('common.shareResults')}</span>`,
      analytics: {
        gtag: typeof gtag === 'function' ? gtag : null,
        event: 'share_clicked',
        params: {
          game: 'movies-quiz',
          solved: gameState.isSolved,
          guesses: gameState.guesses.length
        }
      }
    });
  }

  // Event Listeners
  movieInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    console.log('Input event fired, query:', query, 'ALL_MOVIES:', ALL_MOVIES.length);
    const movies = filterMovies(query);
    console.log('Filtered movies:', movies.length);
    displayAutocomplete(movies);
  });
  
  // Debug: Ensure input is receiving events
  movieInput.addEventListener('focus', () => {
    console.log('Input focused');
  });
  
  movieInput.addEventListener('click', () => {
    console.log('Input clicked');
  });

  movieInput.addEventListener('keydown', (e) => {
    if (!autocompleteState.isOpen) {
      if (e.key === 'Enter') {
        const normalizedQuery = normalizeText(movieInput.value.trim());
        const movie = ALL_MOVIES.find(m => normalizeText(m.title) === normalizedQuery);
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
    const normalizedQuery = normalizeText(movieInput.value.trim());
    const movie = ALL_MOVIES.find(m => normalizeText(m.title) === normalizedQuery);
    if (movie) {
      submitGuess(movie);
    }
  });

  giveUpBtn.addEventListener('click', giveUp);
  shareResultsBtn.addEventListener('click', shareResults);
  
  // Play Random - start a new game with a random movie
  if (playRandomBtn) {
    playRandomBtn.addEventListener('click', playRandom);
  }

  // Clues panel toggle
  if (cluesHeader) {
    cluesHeader.addEventListener('click', () => {
      cluesContent.classList.toggle('collapsed');
      cluesToggle.classList.toggle('collapsed');
    });
  }

  // Initialize
  loadMoviesData();
});
