/**
 * StatsModal - Statistics display modal for games
 * 
 * Usage:
 *   const statsModal = new StatsModal(gameStorage, i18n);
 *   statsModal.show();
 */

class StatsModal {
  constructor(gameStorage, i18n) {
    this.storage = gameStorage;
    this.i18n = i18n;
    this.modal = null;
    this.createModal();
  }

  createModal() {
    // Create modal HTML
    const modalHtml = `
      <div id="stats-modal" class="stats-modal" style="display: none;">
        <div class="stats-modal-overlay" onclick="window.statsModal && window.statsModal.hide()"></div>
        <div class="stats-modal-content">
          <button class="stats-modal-close" onclick="window.statsModal && window.statsModal.hide()">&times;</button>
          <h2 class="stats-modal-title" data-i18n="common.stats">Statistics</h2>
          
          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-value" id="stat-games-played">0</span>
              <span class="stat-label" data-i18n="stats.gamesPlayed">Games Played</span>
            </div>
            <div class="stat-item">
              <span class="stat-value" id="stat-win-percentage">0%</span>
              <span class="stat-label" data-i18n="stats.winPercentage">Win %</span>
            </div>
            <div class="stat-item">
              <span class="stat-value" id="stat-current-streak">0</span>
              <span class="stat-label" data-i18n="stats.currentStreak">Current Streak</span>
            </div>
            <div class="stat-item">
              <span class="stat-value" id="stat-max-streak">0</span>
              <span class="stat-label" data-i18n="stats.maxStreak">Max Streak</span>
            </div>
          </div>
          
          <div class="stats-distribution" id="stats-distribution">
            <h3>Guess Distribution</h3>
            <div id="distribution-bars"></div>
          </div>
        </div>
      </div>
    `;

    // Append to body if not exists
    if (!document.getElementById('stats-modal')) {
      document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
    this.modal = document.getElementById('stats-modal');

    // Close on escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal.style.display !== 'none') {
        this.hide();
      }
    });
  }

  show() {
    const stats = this.storage.getStats();
    const streak = this.storage.getStreak();

    // Update values
    document.getElementById('stat-games-played').textContent = stats.gamesPlayed;
    document.getElementById('stat-win-percentage').textContent = 
      stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) + '%' : '0%';
    document.getElementById('stat-current-streak').textContent = streak.currentStreak;
    document.getElementById('stat-max-streak').textContent = streak.bestStreak;

    // Update distribution bars
    this.renderDistribution(stats.guessDistribution);

    // Translate if i18n available
    if (this.i18n) {
      this.i18n.translatePage();
    }

    this.modal.style.display = 'flex';
  }

  hide() {
    this.modal.style.display = 'none';
  }

  renderDistribution(distribution) {
    const container = document.getElementById('distribution-bars');
    if (!container) return;

    if (!distribution || Object.keys(distribution).length === 0) {
      container.innerHTML = '<p class="no-data">No data yet</p>';
      return;
    }

    const maxValue = Math.max(...Object.values(distribution));
    let html = '';

    // Show distributions for guesses 1-10+
    for (let i = 1; i <= 10; i++) {
      const count = distribution[String(i)] || 0;
      const width = maxValue > 0 ? (count / maxValue) * 100 : 0;
      html += `
        <div class="distribution-row">
          <span class="distribution-label">${i === 10 ? '10+' : i}</span>
          <div class="distribution-bar-bg">
            <div class="distribution-bar" style="width: ${width}%"></div>
          </div>
          <span class="distribution-count">${count}</span>
        </div>
      `;
    }

    container.innerHTML = html;
  }
}

// Export
window.StatsModal = StatsModal;
