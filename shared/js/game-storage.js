/**
 * GameStorage - Handles persistence, streaks, and statistics for all games
 * 
 * Features:
 * - Save/restore daily game state (prevents replay after refresh)
 * - Track daily streaks
 * - Store game statistics
 * - Handle game results for sharing
 */

class GameStorage {
  constructor(gameId) {
    this.gameId = gameId;
    this.prefix = `snackable_${gameId}`;
  }

  // ========== DATE HELPERS ==========
  
  getDateString(date = new Date()) {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD in UTC
  }

  getYesterday() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return this.getDateString(d);
  }

  // ========== DAILY GAME STATE ==========

  /**
   * Get today's game state (if exists)
   * @returns {object|null} Saved game state or null
   */
  getDailyState() {
    const key = `${this.prefix}_daily_${this.getDateString()}`;
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('GameStorage.getDailyState error:', e);
      return null;
    }
  }

  /**
   * Save today's game state
   * @param {object} state - Game state to save
   */
  saveDailyState(state) {
    const key = `${this.prefix}_daily_${this.getDateString()}`;
    try {
      localStorage.setItem(key, JSON.stringify({
        ...state,
        savedAt: new Date().toISOString()
      }));
    } catch (e) {
      console.error('GameStorage.saveDailyState error:', e);
    }
  }

  /**
   * Check if today's daily game has been completed
   * @returns {boolean}
   */
  isDailyCompleted() {
    const state = this.getDailyState();
    return state && state.completed === true;
  }

  /**
   * Mark today's daily game as completed
   * @param {object} result - Game result (score, guesses, etc.)
   */
  completeDailyGame(result) {
    this.saveDailyState({
      completed: true,
      ...result
    });
    this.updateStreak(true);
    this.updateStats(result);
  }

  // ========== STREAK TRACKING ==========

  /**
   * Get streak data
   * @returns {object} { currentStreak, bestStreak, lastPlayedDate }
   */
  getStreak() {
    const key = `${this.prefix}_streak`;
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : { currentStreak: 0, bestStreak: 0, lastPlayedDate: null };
    } catch (e) {
      return { currentStreak: 0, bestStreak: 0, lastPlayedDate: null };
    }
  }

  /**
   * Update streak after completing a game
   * @param {boolean} won - Whether the player won
   */
  updateStreak(won) {
    const streak = this.getStreak();
    const today = this.getDateString();
    const yesterday = this.getYesterday();

    if (streak.lastPlayedDate === today) {
      // Already played today, don't update
      return streak;
    }

    if (won) {
      if (streak.lastPlayedDate === yesterday) {
        // Continued streak
        streak.currentStreak += 1;
      } else {
        // Start new streak
        streak.currentStreak = 1;
      }
      streak.bestStreak = Math.max(streak.bestStreak, streak.currentStreak);
    } else {
      // Lost - reset streak
      streak.currentStreak = 0;
    }

    streak.lastPlayedDate = today;

    const key = `${this.prefix}_streak`;
    try {
      localStorage.setItem(key, JSON.stringify(streak));
    } catch (e) {
      console.error('GameStorage.updateStreak error:', e);
    }

    return streak;
  }

  // ========== STATISTICS ==========

  /**
   * Get all-time statistics
   * @returns {object} Stats object
   */
  getStats() {
    const key = `${this.prefix}_stats`;
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : {
        gamesPlayed: 0,
        gamesWon: 0,
        totalScore: 0,
        bestScore: 0,
        averageGuesses: 0,
        guessDistribution: {},
        winStreak: 0,
        maxWinStreak: 0
      };
    } catch (e) {
      return { gamesPlayed: 0, gamesWon: 0, totalScore: 0, bestScore: 0 };
    }
  }

  /**
   * Update statistics after a game
   * @param {object} result - { won, score, guesses, ... }
   */
  updateStats(result) {
    const stats = this.getStats();
    
    stats.gamesPlayed += 1;
    
    if (result.won || result.solved) {
      stats.gamesWon += 1;
      stats.winStreak += 1;
      stats.maxWinStreak = Math.max(stats.maxWinStreak, stats.winStreak);
    } else {
      stats.winStreak = 0;
    }

    if (result.score !== undefined) {
      stats.totalScore += result.score;
      stats.bestScore = Math.max(stats.bestScore, result.score);
    }

    if (result.guesses !== undefined) {
      const totalGuesses = (stats.averageGuesses * (stats.gamesPlayed - 1)) + result.guesses;
      stats.averageGuesses = Math.round(totalGuesses / stats.gamesPlayed * 10) / 10;
      
      // Guess distribution
      const guessKey = String(result.guesses);
      stats.guessDistribution[guessKey] = (stats.guessDistribution[guessKey] || 0) + 1;
    }

    const key = `${this.prefix}_stats`;
    try {
      localStorage.setItem(key, JSON.stringify(stats));
    } catch (e) {
      console.error('GameStorage.updateStats error:', e);
    }

    return stats;
  }

  /**
   * Get win percentage
   * @returns {number} Win percentage (0-100)
   */
  getWinPercentage() {
    const stats = this.getStats();
    if (stats.gamesPlayed === 0) return 0;
    return Math.round((stats.gamesWon / stats.gamesPlayed) * 100);
  }

  // ========== UTILITIES ==========

  /**
   * Clear all data for this game (for testing)
   */
  clearAll() {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.prefix)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }

  /**
   * Clean up old daily states (keep only last 30 days)
   */
  cleanupOldStates() {
    const today = new Date();
    const cutoff = new Date(today);
    cutoff.setDate(cutoff.getDate() - 30);
    const cutoffStr = this.getDateString(cutoff);

    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`${this.prefix}_daily_`)) {
        const dateStr = key.replace(`${this.prefix}_daily_`, '');
        if (dateStr < cutoffStr) {
          keysToRemove.push(key);
        }
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }
}

// Export for use in games
window.GameStorage = GameStorage;
