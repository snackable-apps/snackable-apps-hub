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
  }
};

// Make available globally
window.GameUtils = GameUtils;
