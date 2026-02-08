/**
 * Shared Configuration for Snackable Games
 * 
 * Centralized configuration for API endpoints, feature flags, and constants.
 */

const GameConfig = {
  // API Base URL
  API_BASE_URL: 'https://snackable-api.vercel.app/api',
  
  // Individual game API endpoints
  API_ENDPOINTS: {
    movies: 'https://snackable-api.vercel.app/api/movies',
    songs: 'https://snackable-api.vercel.app/api/songs',
    books: 'https://snackable-api.vercel.app/api/books',
    // These games use embedded data, not API
    f1: null,
    football: null,
    tennis: null,
    animals: null
  },
  
  // Google Analytics Measurement IDs
  GA_MEASUREMENT_IDS: {
    hub: 'G-Z9BWP9G3HS',
    blindtest: 'G-KW4DNXXF1X',
    movies: 'G-Z9BWP9G3HS', // Uses hub ID
    f1: 'G-Z9BWP9G3HS',
    football: 'G-Z9BWP9G3HS',
    tennis: 'G-Z9BWP9G3HS',
    animals: 'G-Z9BWP9G3HS',
    music: 'G-Z9BWP9G3HS',
    books: 'G-Z9BWP9G3HS'
  },
  
  // Feature flags
  FEATURES: {
    streakDisplay: false,  // Streak display is disabled
    statsModal: false,     // Stats modal is disabled
    easyMode: true         // Easy mode toggle is available
  },
  
  // Game constants
  CONSTANTS: {
    maxGuesses: 8,         // Maximum guesses before game over (for games that use it)
    autocompleteLimit: 8,  // Max items to show in autocomplete dropdown
    minSearchLength: 2     // Minimum characters before showing autocomplete
  },
  
  // Difficulty levels for filtering secret pool
  DIFFICULTY_LEVELS: {
    daily: ['easy', 'medium'],  // Difficulties included in daily challenge pool
    random: ['easy', 'medium', 'hard']  // Difficulties for random games
  },
  
  /**
   * Get API endpoint for a specific game
   * @param {string} game - Game identifier
   * @returns {string|null} API URL or null if game uses embedded data
   */
  getApiEndpoint(game) {
    return this.API_ENDPOINTS[game] || null;
  },
  
  /**
   * Get GA Measurement ID for a specific game
   * @param {string} game - Game identifier
   * @returns {string} Measurement ID
   */
  getGAMeasurementId(game) {
    return this.GA_MEASUREMENT_IDS[game] || this.GA_MEASUREMENT_IDS.hub;
  },
  
  /**
   * Check if a feature is enabled
   * @param {string} feature - Feature name
   * @returns {boolean} True if feature is enabled
   */
  isFeatureEnabled(feature) {
    return this.FEATURES[feature] === true;
  }
};

// Make available globally
window.GameConfig = GameConfig;
