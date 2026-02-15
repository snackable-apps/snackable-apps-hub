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
  }
};

// Make available globally
window.GameUtils = GameUtils;
