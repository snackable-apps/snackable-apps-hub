/**
 * Game Utilities - Shared utility functions for all snackable games
 * 
 * This module provides common functionality used across all games to reduce
 * code duplication and ensure consistent behavior.
 */

const GameUtils = {
  /**
   * Normalize text for accent-insensitive, case-insensitive comparison
   * @param {string} text - The text to normalize
   * @returns {string} Normalized text
   */
  normalizeText(text) {
    if (!text) return '';
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritical marks
      .toLowerCase()
      .trim();
  },

  /**
   * Get current date as a string in YYYY-MM-DD format
   * Used for daily game selection consistency
   * @returns {string} Date string
   */
  getDateString() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  },

  /**
   * Calculate age from birthdate
   * @param {string} birthdate - Birth date string (parseable by Date)
   * @param {string|null} deathDate - Death date string (optional, defaults to today)
   * @returns {number} Age in years
   */
  calculateAge(birthdate, deathDate = null) {
    const endDate = deathDate ? new Date(deathDate) : new Date();
    const birth = new Date(birthdate);
    let age = endDate.getFullYear() - birth.getFullYear();
    const monthDiff = endDate.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && endDate.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  },

  /**
   * Copy text to clipboard with fallback for older browsers
   * @param {string} text - Text to copy
   * @param {HTMLElement} feedbackBtn - Button to show feedback on (optional)
   * @param {string} successText - Text to show on success (default: 'Copied!')
   * @returns {Promise<boolean>} True if successful
   */
  async copyToClipboard(text, feedbackBtn = null, successText = 'Copied!') {
    try {
      await navigator.clipboard.writeText(text);
      
      if (feedbackBtn) {
        const originalText = feedbackBtn.textContent;
        const originalBg = feedbackBtn.style.backgroundColor;
        feedbackBtn.textContent = successText;
        feedbackBtn.style.backgroundColor = 'var(--success-color)';
        setTimeout(() => {
          feedbackBtn.textContent = originalText;
          feedbackBtn.style.backgroundColor = originalBg;
        }, 2000);
      }
      return true;
    } catch (err) {
      // Fallback: create temporary textarea
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        if (feedbackBtn) {
          const originalText = feedbackBtn.textContent;
          feedbackBtn.textContent = successText;
          setTimeout(() => {
            feedbackBtn.textContent = originalText;
          }, 2000);
        }
        return true;
      } catch (e) {
        console.error('Failed to copy:', e);
        return false;
      } finally {
        document.body.removeChild(textarea);
      }
    }
  },

  /**
   * Generate a seeded random number (deterministic based on seed)
   * Used for daily challenge consistency
   * @param {string} seed - Seed string (e.g., date string)
   * @returns {function} A seeded random function that returns 0-1
   */
  seededRandom(seed) {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return function() {
      hash = Math.sin(hash) * 10000;
      return hash - Math.floor(hash);
    };
  },

  /**
   * Get deterministic daily item from pool based on date
   * @param {Array} pool - Array of items to choose from
   * @param {string} gamePrefix - Game identifier for unique selection
   * @returns {*} The selected item for today
   */
  getDailyItem(pool, gamePrefix = 'game') {
    if (!pool || pool.length === 0) return null;
    const dateStr = this.getDateString();
    const random = this.seededRandom(gamePrefix + dateStr);
    const index = Math.floor(random() * pool.length);
    return pool[index];
  },

  /**
   * Debounce a function (useful for search inputs)
   * @param {function} func - Function to debounce
   * @param {number} wait - Wait time in milliseconds
   * @returns {function} Debounced function
   */
  debounce(func, wait = 150) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  /**
   * Format number with locale-appropriate separators
   * @param {number} num - Number to format
   * @returns {string} Formatted number string
   */
  formatNumber(num) {
    if (num === null || num === undefined) return '?';
    return num.toLocaleString();
  },

  /**
   * Get comparison symbol for two values
   * @param {number} guess - Guessed value
   * @param {number} target - Target value
   * @returns {string} '⬆️' if guess < target, '⬇️' if guess > target, '✅' if equal
   */
  getComparisonSymbol(guess, target) {
    if (guess === target) return '✅';
    return guess < target ? '⬆️' : '⬇️';
  },

  /**
   * Get comparison class for styling
   * @param {*} guessValue - Guessed value
   * @param {*} targetValue - Target value
   * @returns {string} CSS class name
   */
  getComparisonClass(guessValue, targetValue) {
    if (guessValue === targetValue) return 'correct';
    return 'incorrect';
  },

  /**
   * Check if running on a mobile device
   * @returns {boolean} True if mobile
   */
  isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (window.matchMedia && window.matchMedia('(max-width: 768px)').matches);
  },

  /**
   * Share game results - uses native share on mobile, clipboard on desktop
   * 
   * @param {Object} options - Share options
   * @param {string} options.text - Text to share
   * @param {string} options.title - Share title (for native share)
   * @param {HTMLElement} options.button - Button element for feedback
   * @param {string} options.successMessage - Success message (default: 'Copied!')
   * @param {string} options.originalHTML - Original button HTML to restore
   * @param {Object} options.analytics - Analytics options { gtag, event, params }
   * @returns {Promise<boolean>} True if successful
   */
  async shareGameResult(options) {
    const {
      text,
      title = 'Game Result',
      button,
      successMessage = '✅ Copied!',
      originalHTML = null,
      analytics = null
    } = options;

    // Track share attempt
    if (analytics && analytics.gtag && typeof analytics.gtag === 'function') {
      analytics.gtag('event', analytics.event || 'share_clicked', analytics.params || {});
    }

    // Mobile: Try native share first
    if (this.isMobile() && navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: text
        });
        return true;
      } catch (err) {
        // User cancelled or share failed - fall through to clipboard
        if (err.name === 'AbortError') {
          return false; // User cancelled, don't show feedback
        }
        // Fall through to clipboard for other errors
      }
    }

    // Desktop (or mobile fallback): Copy to clipboard
    try {
      await navigator.clipboard.writeText(text);
      
      if (button) {
        const restoreHTML = originalHTML || button.innerHTML;
        button.innerHTML = successMessage;
        button.classList.add('copied');
        setTimeout(() => {
          button.innerHTML = restoreHTML;
          button.classList.remove('copied');
        }, 2000);
      }
      return true;
    } catch (err) {
      // Fallback: create temporary textarea
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        if (button) {
          const restoreHTML = originalHTML || button.innerHTML;
          button.innerHTML = successMessage;
          button.classList.add('copied');
          setTimeout(() => {
            button.innerHTML = restoreHTML;
            button.classList.remove('copied');
          }, 2000);
        }
        return true;
      } catch (e) {
        console.error('Failed to copy:', e);
        return false;
      } finally {
        document.body.removeChild(textarea);
      }
    }
  },

  // ========== LOADING STATE ==========

  /**
   * Create and inject a loading state element into a container
   * @param {string} containerId - ID of container element
   * @param {string} gameKey - i18n key for the game (e.g., 'f1', 'tennis')
   * @param {string} defaultMessage - Default loading message if i18n not available
   * @returns {HTMLElement} The created loading element
   */
  createLoadingState(containerId, gameKey, defaultMessage) {
    const container = document.getElementById(containerId);
    if (!container) return null;
    
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loading-state';
    loadingDiv.className = 'loading-state';
    loadingDiv.innerHTML = `
      <div class="loading-spinner"></div>
      <span data-i18n="games.${gameKey}.loadingMessage">${defaultMessage}</span>
    `;
    
    container.insertBefore(loadingDiv, container.firstChild);
    return loadingDiv;
  },

  /**
   * Show loading state and hide game content
   * @param {string} loadingId - ID of loading element (default: 'loading-state')
   * @param {string[]} hideIds - Array of element IDs to hide
   */
  showLoading(loadingId = 'loading-state', hideIds = []) {
    const loading = document.getElementById(loadingId);
    if (loading) loading.style.display = 'flex';
    
    hideIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
  },

  /**
   * Hide loading state and show game content
   * @param {string} loadingId - ID of loading element (default: 'loading-state')
   * @param {Object[]} showElements - Array of {id, display} objects
   */
  hideLoading(loadingId = 'loading-state', showElements = []) {
    const loading = document.getElementById(loadingId);
    if (loading) loading.style.display = 'none';
    
    showElements.forEach(({id, display = 'block'}) => {
      const el = document.getElementById(id);
      if (el) el.style.display = display;
    });
  },

  // ========== CLUES SUMMARY UTILITIES ==========

  /**
   * Create a clues state object for tracking game progress
   * @param {Object} config - Configuration with field names to track
   * @returns {Object} Clues state object
   */
  createCluesState(config = {}) {
    const state = {
      // Common numeric range fields
      ...(config.numericFields || []).reduce((acc, field) => {
        acc[`${field}Min`] = null;
        acc[`${field}Max`] = null;
        acc[`${field}Confirmed`] = null;
        return acc;
      }, {}),
      
      // Common confirmed value fields
      ...(config.confirmedFields || []).reduce((acc, field) => {
        acc[`${field}Confirmed`] = null;
        acc[`excluded${field.charAt(0).toUpperCase() + field.slice(1)}s`] = new Set();
        return acc;
      }, {}),
      
      // Array fields (matched + total count)
      ...(config.arrayFields || []).reduce((acc, field) => {
        acc[`matched${field.charAt(0).toUpperCase() + field.slice(1)}`] = new Set();
        acc[`total${field.charAt(0).toUpperCase() + field.slice(1)}Count`] = 0;
        acc[`excluded${field.charAt(0).toUpperCase() + field.slice(1)}`] = new Set();
        return acc;
      }, {})
    };
    
    return state;
  },

  /**
   * Render an excluded section (NOT section) in the clues panel
   * @param {Object} options - Rendering options
   * @returns {boolean} Whether the section has content
   */
  renderExcludedSection({
    containerEl,
    excludedSet,
    confirmedValue = null,
    allMatched = false,
    maxItems = 6,
    formatFn = (x) => x,
    separator = ', '
  }) {
    if (!containerEl) return false;
    
    // Hide if confirmed or all matched
    if (confirmedValue !== null || allMatched || excludedSet.size === 0) {
      containerEl.style.display = 'none';
      return false;
    }
    
    containerEl.style.display = 'flex';
    const valueContainer = containerEl.querySelector('.clue-excluded-values');
    if (valueContainer) {
      const items = [...excludedSet].slice(0, maxItems);
      const formatted = items.map(formatFn);
      valueContainer.innerHTML = formatted.join(separator) + 
        (excludedSet.size > maxItems ? '...' : '');
    }
    
    return true;
  },

  /**
   * Fisher-Yates shuffle for uniform randomness
   * @param {Array} array - Array to shuffle
   * @returns {Array} New shuffled array
   */
  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  },

  // ========== NOTIFICATIONS ==========

  /**
   * Show a notification to the user (toast-style, not native alert)
   * @param {Object} options - Notification options
   * @param {string} options.message - Message to display (or i18n key)
   * @param {string} options.type - Type: 'info', 'success', 'warning', 'error'
   * @param {number} options.duration - Duration in ms (default: 3000)
   * @param {boolean} options.isI18nKey - If true, message is treated as i18n key
   * @param {Object} options.i18nParams - Parameters for i18n interpolation
   */
  showNotification({ message, type = 'info', duration = 3000, isI18nKey = false, i18nParams = {} }) {
    // Get translated message if i18n key
    let displayMessage = message;
    if (isI18nKey && window.i18n && typeof window.i18n.t === 'function') {
      displayMessage = window.i18n.t(message, i18nParams);
    }

    // Create or get notification container
    let container = document.getElementById('game-notifications');
    if (!container) {
      container = document.createElement('div');
      container.id = 'game-notifications';
      container.className = 'game-notifications';
      document.body.appendChild(container);
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `game-notification game-notification-${type}`;
    notification.textContent = displayMessage;

    // Add to container
    container.appendChild(notification);

    // Trigger animation
    requestAnimationFrame(() => {
      notification.classList.add('show');
    });

    // Auto-remove after duration
    setTimeout(() => {
      notification.classList.remove('show');
      notification.classList.add('hide');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, duration);
  },

  /**
   * Show error notification
   * @param {string} message - Error message or i18n key
   * @param {boolean} isI18nKey - If true, message is treated as i18n key
   */
  showError(message, isI18nKey = false) {
    this.showNotification({ message, type: 'error', isI18nKey, duration: 4000 });
  },

  /**
   * Show warning notification
   * @param {string} message - Warning message or i18n key
   * @param {boolean} isI18nKey - If true, message is treated as i18n key
   */
  showWarning(message, isI18nKey = false) {
    this.showNotification({ message, type: 'warning', isI18nKey });
  },

  /**
   * Show success notification
   * @param {string} message - Success message or i18n key
   * @param {boolean} isI18nKey - If true, message is treated as i18n key
   */
  showSuccess(message, isI18nKey = false) {
    this.showNotification({ message, type: 'success', isI18nKey });
  },

  /**
   * Show info notification
   * @param {string} message - Info message or i18n key
   * @param {boolean} isI18nKey - If true, message is treated as i18n key
   */
  showInfo(message, isI18nKey = false) {
    this.showNotification({ message, type: 'info', isI18nKey });
  },

  // ========== DURATION FORMATTING ==========

  /**
   * Format duration in seconds to MM:SS format
   * @param {number} duration - Duration in seconds
   * @returns {string} Formatted duration
   */
  formatDuration(duration) {
    if (!duration) return '?';
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  },

  // ========== PLAY RANDOM UTILITIES ==========

  /**
   * Reset UI for starting a random game
   * This centralizes the common reset logic used across all quiz games
   * 
   * @param {Object} options - Reset options
   * @param {Object} options.elements - DOM elements to reset
   * @param {HTMLElement} options.elements.guessSection - The guess input section
   * @param {HTMLElement} options.elements.shareSection - The share/actions section
   * @param {HTMLElement} options.elements.shareResultsBtn - The share results button
   * @param {HTMLElement} options.elements.inputEl - The main input element
   * @param {HTMLElement} options.elements.submitBtn - Submit button
   * @param {HTMLElement} options.elements.giveUpBtn - Give up button
   * @param {HTMLElement} options.elements.autocompleteDropdown - Autocomplete dropdown
   * @param {HTMLElement} options.elements.guessesContainer - Container for guess cards
   * @param {HTMLElement} options.elements.guessCountEl - Guess count display element
   * @param {HTMLElement} options.elements.gameStatusEl - Game status display element
   * @param {HTMLElement} options.elements.cluesPanel - Clues panel (optional)
   * @param {HTMLElement} options.elements.modeToggle - Mode toggle section (optional)
   * @param {Object} options.autocompleteState - Autocomplete state object to reset
   * @param {boolean} options.focusInput - Whether to focus the input after reset (default: true)
   * @param {number} options.focusDelay - Delay before focusing input in ms (default: 100)
   */
  resetForRandomPlay({
    elements = {},
    autocompleteState = null,
    focusInput = true,
    focusDelay = 100
  }) {
    const {
      guessSection,
      shareSection,
      shareResultsBtn,
      inputEl,
      submitBtn,
      giveUpBtn,
      autocompleteDropdown,
      guessesContainer,
      guessCountEl,
      gameStatusEl,
      cluesPanel,
      modeToggle
    } = elements;

    // Reset guess container
    if (guessesContainer) {
      guessesContainer.innerHTML = '';
    }

    // Reset guess count and status
    if (guessCountEl) {
      guessCountEl.textContent = '0';
    }
    if (gameStatusEl) {
      gameStatusEl.textContent = '';
      gameStatusEl.className = '';
      gameStatusEl.style.color = '';
    }

    // Show guess section, hide share section
    if (guessSection) {
      guessSection.style.display = 'flex';
      guessSection.style.visibility = 'visible';
      guessSection.style.pointerEvents = 'auto';
    }
    if (shareSection) {
      shareSection.style.display = 'none';
    }

    // Hide share button (random games can't share)
    if (shareResultsBtn) {
      shareResultsBtn.style.display = 'none';
    }

    // Reset input field
    if (inputEl) {
      inputEl.value = '';
      inputEl.disabled = false;
      inputEl.readOnly = false;
      inputEl.style.pointerEvents = 'auto';
      inputEl.style.opacity = '1';
    }

    // Reset buttons
    if (submitBtn) {
      submitBtn.disabled = false;
    }
    if (giveUpBtn) {
      giveUpBtn.disabled = false;
    }

    // Reset autocomplete dropdown
    if (autocompleteDropdown) {
      autocompleteDropdown.innerHTML = '';
      autocompleteDropdown.style.display = 'none';
      autocompleteDropdown.classList.remove('active');
    }

    // Reset autocomplete state
    if (autocompleteState) {
      autocompleteState.selectedIndex = -1;
      if (Array.isArray(autocompleteState.filteredMovies)) {
        autocompleteState.filteredMovies = [];
      }
      if (Array.isArray(autocompleteState.filteredSongs)) {
        autocompleteState.filteredSongs = [];
      }
      if (Array.isArray(autocompleteState.filteredItems)) {
        autocompleteState.filteredItems = [];
      }
      autocompleteState.isOpen = false;
    }

    // Hide clues panel for fresh start
    if (cluesPanel) {
      cluesPanel.style.display = 'none';
    }

    // Show mode toggle if exists
    if (modeToggle) {
      modeToggle.style.display = 'block';
    }

    // Focus input after brief delay
    if (focusInput && inputEl) {
      setTimeout(() => {
        inputEl.focus();
      }, focusDelay);
    }
  },

  /**
   * Select a random item from a pool, excluding current item
   * @param {Array} pool - Array of items to choose from
   * @param {*} currentItem - Current item to exclude (optional)
   * @param {string} idField - Field name to use for comparison (default: 'title')
   * @returns {*} Randomly selected item
   */
  selectRandomFromPool(pool, currentItem = null, idField = 'title') {
    if (!pool || pool.length === 0) {
      console.error('selectRandomFromPool: Pool is empty!');
      return null;
    }

    // Filter out current item if provided
    let availableItems = pool;
    if (currentItem && currentItem[idField]) {
      availableItems = pool.filter(item => item[idField] !== currentItem[idField]);
    }

    // If all items filtered out, use full pool
    if (availableItems.length === 0) {
      availableItems = pool;
    }

    const randomIndex = Math.floor(Math.random() * availableItems.length);
    return availableItems[randomIndex];
  },

  // ========== SHARE TEXT GENERATION ==========

  /**
   * Generate standard share text for quiz games
   * 
   * Format:
   * - Solved: "🎉 [Game] [Date] [Emoji]\n🏆 Solved in X guesses!\n\nPlay: [url]"
   * - Gave up: "😔 [Game] [Date] [Emoji]\nGave up after X guesses\n\nPlay: [url]"
   * - Game over: "❌ [Game] [Date] [Emoji]\nGame Over after X guesses\n\nPlay: [url]"
   * 
   * @param {Object} options - Share text options
   * @param {string} options.gameName - Name of the game (e.g., "Movie Quiz", "F1 Quiz")
   * @param {string} options.gameEmoji - Emoji for the game (e.g., "🎬", "🏎️")
   * @param {boolean} options.isSolved - Whether the player solved the puzzle
   * @param {boolean} options.gaveUp - Whether the player gave up
   * @param {boolean} options.isRandomMode - Whether this was a random game
   * @param {number} options.guessCount - Number of guesses made
   * @param {string} options.dateString - Date string (from getDateString())
   * @param {string} options.gameUrl - URL to the game (defaults to current path)
   * @param {Object} options.i18n - i18n instance for translations (optional)
   * @returns {string} Formatted share text
   */
  generateQuizShareText({
    gameName,
    gameEmoji,
    isSolved,
    gaveUp = false,
    isRandomMode = false,
    guessCount,
    dateString,
    gameUrl = null,
    i18n = null
  }) {
    const url = gameUrl || window.location.origin + window.location.pathname;
    const gameType = isRandomMode ? '🎲 Random' : dateString;
    const guessText = guessCount === 1 ? 'guess' : 'guesses';
    
    let statusEmoji, statusText;
    
    if (isSolved) {
      statusEmoji = '🎉';
      statusText = `🏆 Solved in ${guessCount} ${guessText}!`;
    } else if (gaveUp) {
      statusEmoji = '😔';
      statusText = `Gave up after ${guessCount} ${guessText}`;
    } else {
      statusEmoji = '❌';
      statusText = `Game Over after ${guessCount} ${guessText}`;
    }
    
    return `${statusEmoji} ${gameName} ${gameType} ${gameEmoji}\n${statusText}\n\nPlay: ${url}`;
  },

  // ========== FEEDBACK SYSTEM ==========

  /**
   * API endpoint for feedback
   */
  FEEDBACK_API_URL: 'https://snackable-api.vercel.app/api/feedback',

  /**
   * List of all games for feedback dropdown
   */
  FEEDBACK_GAMES: [
    { value: 'F1 Quiz', labelKey: 'games.f1.title' },
    { value: 'Tennis Quiz', labelKey: 'games.tennis.title' },
    { value: 'FutQuiz', labelKey: 'games.futquiz.title' },
    { value: 'Music Quiz', labelKey: 'games.music.title' },
    { value: 'Blind Test', labelKey: 'games.blindtest.title' },
    { value: 'Movies Quiz', labelKey: 'games.movies.title' },
    { value: 'Animal Quiz', labelKey: 'games.animal.title' },
    { value: 'Books Quiz', labelKey: 'games.books.title' },
    { value: 'Sudoku', labelKey: 'games.sudoku.title' },
    { value: 'General / Website', labelKey: 'feedback.general' }
  ],

  /**
   * Topic options for feedback
   */
  FEEDBACK_TOPICS: [
    { value: 'Bug Report', labelKey: 'feedback.topicBug' },
    { value: 'Suggestion', labelKey: 'feedback.topicSuggestion' },
    { value: 'Data Issue', labelKey: 'feedback.topicData' },
    { value: 'Other', labelKey: 'feedback.topicOther' }
  ],

  /**
   * Submit feedback to API
   * @param {Object} data - Feedback data
   * @param {string} data.game - Game name
   * @param {string} data.topic - Feedback topic
   * @param {string} data.message - Feedback message
   * @param {string} data.email - Optional email
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async submitFeedback(data) {
    try {
      // Get fingerprint for spam prevention
      const fingerprint = await this.getFingerprint();
      
      const response = await fetch(this.FEEDBACK_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          game: data.game,
          topic: data.topic || null,
          message: data.message,
          email: data.email || null,
          pageUrl: window.location.href,
          website: data.website || null, // Honeypot field
          fingerprint: fingerprint
        })
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'Failed to submit feedback' };
      }

      // Track feedback submission in Google Analytics
      if (typeof gtag === 'function') {
        gtag('event', 'feedback_submit', {
          event_category: 'engagement',
          event_label: data.game || 'unknown',
          feedback_topic: data.topic || 'none',
          has_email: !!data.email
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Feedback submission error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  },

  /**
   * Generate feedback modal HTML
   * @param {string} currentGame - The current game name to pre-select
   * @returns {string} HTML string for feedback modal
   */
  generateFeedbackHTML(currentGame = null) {
    const t = (key, fallback) => window.i18n ? (window.i18n.t(key) || fallback) : fallback;
    
    const gameOptions = this.FEEDBACK_GAMES.map(game => {
      const label = t(game.labelKey, game.value);
      const selected = currentGame === game.value ? 'selected' : '';
      return `<option value="${game.value}" ${selected}>${label}</option>`;
    }).join('');

    const topicOptions = this.FEEDBACK_TOPICS.map(topic => {
      const label = t(topic.labelKey, topic.value);
      return `<option value="${topic.value}">${label}</option>`;
    }).join('');

    return `
      <button class="feedback-btn" onclick="GameUtils.openFeedback()" aria-label="${t('feedback.title', 'Send Feedback')}">💬 Feedback</button>
      <div class="feedback-overlay" id="feedback-overlay" onclick="GameUtils.closeFeedback()"></div>
      <div class="feedback-modal" id="feedback-modal">
        <button class="feedback-close" onclick="GameUtils.closeFeedback()">✕</button>
        <h3>📬 <span data-i18n="feedback.title">${t('feedback.title', 'Send Feedback')}</span></h3>
        <form id="feedback-form">
          <label data-i18n="feedback.about">${t('feedback.about', 'About:')}</label>
          <select name="game" id="feedback-game" required>
            ${gameOptions}
          </select>
          <label data-i18n="feedback.topic">${t('feedback.topic', 'Topic:')}</label>
          <select name="topic" id="feedback-topic">
            ${topicOptions}
          </select>
          <label data-i18n="feedback.message">${t('feedback.message', 'Your feedback:')}</label>
          <textarea name="message" rows="4" required placeholder="${t('feedback.messagePlaceholder', 'Tell us what you think...')}" data-i18n-placeholder="feedback.messagePlaceholder"></textarea>
          <label data-i18n="feedback.email">${t('feedback.email', 'Email (optional):')}</label>
          <input type="email" name="email" placeholder="${t('feedback.emailPlaceholder', 'your@email.com')}" data-i18n-placeholder="feedback.emailPlaceholder">
          <!-- Honeypot field - hidden from humans, bots fill it -->
          <input type="text" name="website" style="position:absolute;left:-9999px;opacity:0;height:0;width:0;" tabindex="-1" autocomplete="off">
          <button type="submit" data-i18n="feedback.send">${t('feedback.send', 'Send Feedback')}</button>
        </form>
      </div>
    `;
  },

  /**
   * Inject feedback modal into page
   * @param {string} currentGame - The current game name to pre-select
   */
  injectFeedbackModal(currentGame = null) {
    // Check if already injected
    if (document.getElementById('feedback-modal')) return;

    // Create container
    const container = document.createElement('div');
    container.id = 'feedback-container';
    container.innerHTML = this.generateFeedbackHTML(currentGame);
    document.body.appendChild(container);

    // Initialize form handling
    this.initFeedbackForm(currentGame);
  },

  /**
   * Open feedback modal
   */
  openFeedback() {
    const overlay = document.getElementById('feedback-overlay');
    const modal = document.getElementById('feedback-modal');
    if (overlay) overlay.classList.add('open');
    if (modal) modal.classList.add('open');
  },

  /**
   * Close feedback modal
   */
  closeFeedback() {
    const overlay = document.getElementById('feedback-overlay');
    const modal = document.getElementById('feedback-modal');
    if (overlay) overlay.classList.remove('open');
    if (modal) modal.classList.remove('open');
  },

  /**
   * Initialize feedback form on a page
   * @param {string} currentGame - The current game name to pre-select
   */
  initFeedbackForm(currentGame = null) {
    const form = document.getElementById('feedback-form');
    const gameSelect = document.getElementById('feedback-game');
    
    if (!form) return;

    // Handle form submission
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = window.i18n ? window.i18n.t('feedback.sending') : 'Sending...';

      const formData = new FormData(form);
      const result = await this.submitFeedback({
        game: formData.get('game'),
        topic: formData.get('topic'),
        message: formData.get('message'),
        email: formData.get('email'),
        website: formData.get('website') // Honeypot field
      });

      submitBtn.disabled = false;
      submitBtn.textContent = originalText;

      if (result.success) {
        this.showSuccess(window.i18n ? window.i18n.t('feedback.success') : 'Thank you for your feedback!');
        form.reset();
        // Re-select current game after reset
        if (gameSelect && currentGame) {
          gameSelect.value = currentGame;
        }
        this.closeFeedback();
      } else {
        this.showError(result.error);
      }
    });
  },

  // ========== GAME STATISTICS ==========

  GAME_STATS_API_URL: 'https://snackable-api.vercel.app/api/game-stats',

  /**
   * Generate a browser fingerprint for anonymous user identification.
   * This is privacy-friendly (no personal data) and used only for deduplication.
   * @returns {string} A hashed fingerprint string
   */
  async generateFingerprint() {
    const components = [];
    
    // Screen properties
    components.push(screen.width + 'x' + screen.height);
    components.push(screen.colorDepth);
    components.push(window.devicePixelRatio || 1);
    
    // Timezone
    components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);
    
    // Language
    components.push(navigator.language);
    
    // Platform
    components.push(navigator.platform);
    
    // User agent (partial - just browser name)
    const ua = navigator.userAgent;
    if (ua.includes('Chrome')) components.push('chrome');
    else if (ua.includes('Firefox')) components.push('firefox');
    else if (ua.includes('Safari')) components.push('safari');
    else if (ua.includes('Edge')) components.push('edge');
    else components.push('other');
    
    // Canvas fingerprint (renders text and extracts hash)
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('snackable', 2, 2);
      components.push(canvas.toDataURL().slice(-50));
    } catch (e) {
      components.push('no-canvas');
    }
    
    // WebGL renderer (GPU info)
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          components.push(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL));
        }
      }
    } catch (e) {
      components.push('no-webgl');
    }
    
    // Create hash from components
    const fingerprint = components.join('|');
    
    // Simple hash function (FNV-1a)
    let hash = 2166136261;
    for (let i = 0; i < fingerprint.length; i++) {
      hash ^= fingerprint.charCodeAt(i);
      hash = (hash * 16777619) >>> 0;
    }
    
    return hash.toString(16);
  },

  /**
   * Get or create cached fingerprint (stored in sessionStorage)
   * @returns {Promise<string>} The fingerprint
   */
  async getFingerprint() {
    const cached = sessionStorage.getItem('snackable_fingerprint');
    if (cached) return cached;
    
    const fingerprint = await this.generateFingerprint();
    sessionStorage.setItem('snackable_fingerprint', fingerprint);
    return fingerprint;
  },

  /**
   * Submit quiz game statistics
   * @param {Object} data - Quiz result data
   * @param {string} data.game - Game name (f1, tennis, movies, books, animal, music, fut)
   * @param {string} data.dateString - The daily challenge date (YYYY-MM-DD)
   * @param {string} data.result - 'solved' or 'gave_up'
   * @param {number} data.tries - Number of guesses
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async submitQuizStats(data) {
    // Only submit for daily games, not random
    if (data.isRandomMode) {
      return { success: true, skipped: true };
    }
    
    // Check if already submitted today for this game
    const storageKey = `stats_sent_quiz_${data.game}_${data.dateString}`;
    if (localStorage.getItem(storageKey)) {
      return { success: true, duplicate: true };
    }
    
    try {
      const fingerprint = await this.getFingerprint();
      const locale = localStorage.getItem('snackable_locale') || navigator.language?.split('-')[0] || 'en';
      
      const response = await fetch(this.GAME_STATS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'quiz',
          game: data.game,
          date_string: data.dateString,
          result: data.result,
          tries: data.tries,
          locale: locale,
          fingerprint: fingerprint
        })
      });
      
      if (response.ok) {
        localStorage.setItem(storageKey, 'true');
        return { success: true };
      }
      
      const result = await response.json();
      return { success: false, error: result.error };
    } catch (error) {
      console.error('Failed to submit quiz stats:', error);
      return { success: false, error: 'Network error' };
    }
  },

  /**
   * Submit blind test game statistics
   * @param {Object} data - Blind test result data
   * @param {string} data.dateString - The daily challenge date (YYYY-MM-DD)
   * @param {number} data.totalScore - Total points earned
   * @param {number} data.correctCount - Songs guessed correctly (0-5)
   * @param {number} data.wrongCount - Songs missed
   * @param {number} data.avgTimeMs - Average response time in ms
   * @param {boolean} data.settingsArtist - Was "Show Artist" enabled?
   * @param {boolean} data.settingsMultiple - Was "Multiple Choice" enabled?
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async submitBlindtestStats(data) {
    // Only submit for daily games, not random
    if (data.isRandomMode) {
      return { success: true, skipped: true };
    }
    
    // Check if already submitted today
    const storageKey = `stats_sent_blindtest_${data.dateString}`;
    if (localStorage.getItem(storageKey)) {
      return { success: true, duplicate: true };
    }
    
    try {
      const fingerprint = await this.getFingerprint();
      const locale = localStorage.getItem('snackable_locale') || navigator.language?.split('-')[0] || 'en';
      
      const response = await fetch(this.GAME_STATS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'blindtest',
          date_string: data.dateString,
          total_score: data.totalScore,
          correct_count: data.correctCount,
          wrong_count: data.wrongCount,
          avg_time_ms: data.avgTimeMs || null,
          settings_artist: data.settingsArtist || false,
          settings_multiple: data.settingsMultiple !== false,
          locale: locale,
          fingerprint: fingerprint
        })
      });
      
      if (response.ok) {
        localStorage.setItem(storageKey, 'true');
        return { success: true };
      }
      
      const result = await response.json();
      return { success: false, error: result.error };
    } catch (error) {
      console.error('Failed to submit blindtest stats:', error);
      return { success: false, error: 'Network error' };
    }
  },

  /**
   * Submit puzzle game statistics (Sudoku, etc.)
   * @param {Object} data - Puzzle result data
   * @param {string} data.game - Game name (sudoku)
   * @param {string} data.dateString - The daily puzzle date (YYYY-MM-DD)
   * @param {string} data.result - 'solved' or 'gave_up'
   * @param {number} data.timeSeconds - Time to complete in seconds
   * @param {number} data.hintsUsed - Number of hints used
   * @param {string} data.difficulty - 'easy', 'medium', 'hard'
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async submitPuzzleStats(data) {
    // Only submit for daily games, not random
    if (data.isRandomMode) {
      return { success: true, skipped: true };
    }
    
    // Check if already submitted today for this game
    const storageKey = `stats_sent_puzzle_${data.game}_${data.dateString}`;
    if (localStorage.getItem(storageKey)) {
      return { success: true, duplicate: true };
    }
    
    try {
      const fingerprint = await this.getFingerprint();
      const locale = localStorage.getItem('snackable_locale') || navigator.language?.split('-')[0] || 'en';
      
      const response = await fetch(this.GAME_STATS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'puzzle',
          game: data.game,
          date_string: data.dateString,
          result: data.result,
          time_seconds: data.timeSeconds || null,
          hints_used: data.hintsUsed || 0,
          difficulty: data.difficulty || null,
          locale: locale,
          fingerprint: fingerprint
        })
      });
      
      if (response.ok) {
        localStorage.setItem(storageKey, 'true');
        return { success: true };
      }
      
      const result = await response.json();
      return { success: false, error: result.error };
    } catch (error) {
      console.error('Failed to submit puzzle stats:', error);
      return { success: false, error: 'Network error' };
    }
  },

  /**
   * Restore and render daily game result for quiz-type games
   * Centralized function to handle rendering guesses and showing game status
   * 
   * @param {Object} options - Configuration options
   * @param {Array} options.guesses - Array of guess objects to render
   * @param {Function} options.displayGuess - Function to render a single guess (guess, comparisons) => void
   * @param {Function} options.updateCluesState - Function to update clues state for a guess
   * @param {HTMLElement} options.guessesContainer - Container element for guesses
   * @param {HTMLElement} options.guessSection - Section to hide
   * @param {HTMLElement} options.shareSection - Section to show
   * @param {HTMLElement} options.gameInfo - Game info element to show (optional)
   * @param {HTMLElement} options.gameStatusEl - Element to show game status
   * @param {HTMLElement} options.cluesPanel - Clues panel to hide (optional)
   * @param {boolean} options.isSolved - Whether the game was solved
   * @param {number} options.guessCount - Total number of guesses
   * @param {Function} options.displayAnswer - Function to show the correct answer when gave up (optional)
   * @param {Function} options.resetCluesState - Function to reset clues state before rebuilding
   */
  restoreDailyGameUI(options) {
    const {
      guesses = [],
      displayGuess,
      updateCluesState,
      guessesContainer,
      guessSection,
      shareSection,
      gameInfo,
      gameStatusEl,
      cluesPanel,
      isSolved,
      guessCount,
      displayAnswer,
      resetCluesState
    } = options;

    // Reset and rebuild clues state
    if (resetCluesState) {
      resetCluesState();
    }

    // Clear and render guesses
    if (guessesContainer) {
      guessesContainer.innerHTML = '';
    }

    // Render guesses in reverse order (oldest first, so newest ends up on top)
    const guessesToRender = [...guesses].reverse();
    guessesToRender.forEach(guess => {
      if (guess.comparisons) {
        if (updateCluesState) {
          updateCluesState(guess, guess.comparisons);
        }
        if (displayGuess) {
          displayGuess(guess, guess.comparisons);
        }
      }
    });

    // Show game status
    if (gameStatusEl) {
      const guessText = guessCount === 1 ? 'guess' : 'guesses';
      if (isSolved) {
        gameStatusEl.textContent = `🏆 Solved in ${guessCount} ${guessText}!`;
        gameStatusEl.className = 'game-over';
      } else {
        gameStatusEl.textContent = `❌ Game Over after ${guessCount} ${guessText}`;
        gameStatusEl.className = 'game-over';
        // Show the correct answer if gave up
        if (displayAnswer) {
          displayAnswer();
        }
      }
    }

    // Update UI visibility
    if (guessSection) guessSection.style.display = 'none';
    if (shareSection) shareSection.style.display = 'flex';
    if (gameInfo) gameInfo.style.display = 'block';
    if (cluesPanel) cluesPanel.style.display = 'none';
  }
};

// Make available globally
window.GameUtils = GameUtils;
