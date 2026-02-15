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
    { value: 'bug', labelKey: 'feedback.topicBug' },
    { value: 'suggestion', labelKey: 'feedback.topicSuggestion' },
    { value: 'data', labelKey: 'feedback.topicData' },
    { value: 'other', labelKey: 'feedback.topicOther' }
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
          website: data.website || null // Honeypot field
        })
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'Failed to submit feedback' };
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
  }
};

// Make available globally
window.GameUtils = GameUtils;
