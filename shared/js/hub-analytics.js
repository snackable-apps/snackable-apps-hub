/**
 * Hub Analytics - Send game open events to Snackable Games Hub GA4
 * 
 * This script sends a beacon to the Hub's analytics property when a game opens,
 * allowing centralized tracking of game usage across all games.
 * 
 * Events are game-specific (e.g., game_opened_blindtest, game_opened_movies)
 * to allow comparison with Hub's game_selected_{game} events.
 * 
 * Usage: Include this script in every game's HTML before the closing </body> tag
 */

(function() {
  // Hub GA4 Measurement ID
  const HUB_GA4_ID = 'G-Z9BWP9G3HS';
  
  // Map pathname to clean game name (for event naming)
  const GAME_NAME_MAP = {
    'blind-test': 'blindtest',
    'movies-quiz': 'movies',
    'f1-quiz': 'f1',
    'fut-quiz': 'futquiz',
    'tennis-quiz': 'tennis',
    'animal': 'animal',
    'music': 'music',
    'books-quiz': 'books',
    'sudoku': 'sudoku'
  };
  
  // Get game name from pathname
  function getGameName() {
    const path = window.location.pathname;
    // Extract game folder from path like /blind-test/ or /movies-quiz/
    const match = path.match(/\/([^\/]+)\/?$/);
    if (match) {
      const folder = match[1];
      return GAME_NAME_MAP[folder] || folder;
    }
    return 'unknown';
  }
  
  // Get raw folder name for reference
  function getGameFolder() {
    const path = window.location.pathname;
    const match = path.match(/\/([^\/]+)\/?$/);
    return match ? match[1] : 'unknown';
  }
  
  // Send event to Hub GA4
  function sendToHubAnalytics(eventName, params) {
    if (typeof gtag === 'function') {
      gtag('event', eventName, {
        ...params,
        send_to: HUB_GA4_ID
      });
    }
  }
  
  // Track game open with game-specific event name
  function trackGameOpen() {
    const gameName = getGameName();
    const referrer = document.referrer;
    const isFromHub = referrer.includes('snackable') && !referrer.includes(getGameFolder());
    
    // Send game-specific event: game_opened_blindtest, game_opened_movies, etc.
    sendToHubAnalytics(`game_opened_${gameName}`, {
      referrer: referrer || 'direct',
      from_hub: isFromHub,
      timestamp: new Date().toISOString()
    });
    
    // Also store in sessionStorage for cross-game tracking
    try {
      const session = JSON.parse(sessionStorage.getItem('snackable_session') || '{}');
      session.gamesVisited = session.gamesVisited || [];
      if (!session.gamesVisited.includes(gameName)) {
        session.gamesVisited.push(gameName);
      }
      session.lastGame = gameName;
      session.lastVisit = Date.now();
      sessionStorage.setItem('snackable_session', JSON.stringify(session));
    } catch (e) {
      // Ignore storage errors
    }
  }
  
  // Run on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', trackGameOpen);
  } else {
    trackGameOpen();
  }
  
  // Export for manual use
  window.HubAnalytics = {
    trackGameOpen,
    sendToHubAnalytics,
    getGameName,
    getGameFolder
  };
})();
