# Snackable Games - Game Template

This document defines the core features and structure that ALL games (except Sudoku) must follow. When updating the template, ensure all games are updated to match.

## Core Features Checklist

### 1. Daily vs Random Mode
- [ ] Each game has a **daily challenge** that's the same for all players
- [ ] Daily challenge uses seeded random based on date
- [ ] After completing daily, players can only play **random mode**
- [ ] **Returning players behavior**: When a player returns after completing the daily:
  - Show the completed daily result (all guesses, final state)
  - Display share section and "Play Random" button
  - Do NOT show input/guess section until they click "Play Random"
  - Store full game data (guesses with comparisons) for restoration
- [ ] Clear indication of which mode player is in

#### Returning Player Implementation
```javascript
// On page load, check if daily is completed
const dailyState = gameStorage.getDailyState();
const dailyCompleted = dailyState && dailyState.completed;

// In loadData function:
if (dailyCompleted && dailyState) {
  restoreDailyResult();
} else {
  initializeGame();
}

// Restore function:
function restoreDailyResult() {
  // Set the secret item to today's daily item
  gameState.secretItem = getDailyItem();
  gameState.isGameOver = true;
  gameState.isRandomMode = false;
  
  // Restore guesses from storage
  if (dailyState.gameData) {
    gameState.guesses = dailyState.gameData.guesses || [];
    gameState.isSolved = dailyState.gameData.won;
    gameState.gaveUp = !dailyState.gameData.won;
  }
  
  // Rebuild clues from guesses
  resetCluesState();
  gameState.guesses.forEach(guess => {
    if (guess.comparisons) {
      updateCluesState(guess, guess.comparisons);
    }
  });
  
  // Hide input, show share section
  guessSection.style.display = 'none';
  shareSection.style.display = 'block';
  
  updateUI();
}

// Save game data when completing:
gameStorage.completeDailyGame({
  won: true/false,
  guesses: gameState.guesses.length,
  gameData: {
    won: true/false,
    guesses: gameState.guesses.map(g => ({
      // Include all relevant data for restoration
      ...guessData,
      comparisons: g.comparisons,
      isCorrect: g.isCorrect
    }))
  }
});
```

### 2. User Persistence (localStorage)
- [ ] Track if daily was completed today
- [ ] Store game results (win/loss, guesses, score)
- [ ] Track streaks (current, max)
- [ ] Clean up old data (older than 30 days)
- [ ] Key prefix: `snackable_{gameName}_`

### 3. Loading States
- [ ] Show loading spinner while fetching data
- [ ] Block/disable input during load
- [ ] Clear loading message (translated)
- [ ] Handle errors gracefully with user-friendly messages

### 4. Internationalization (i18n)
All UI text must be translatable. Supported languages: EN, FR, PT-BR, IT, ES

**What to translate:**
- [ ] Page title and subtitle
- [ ] All buttons (Submit, Give Up, Share, Play Random, etc.)
- [ ] Property labels (Director, Year, Artist, etc.)
- [ ] Status messages (Solved!, Game Over, etc.)
- [ ] Clues summary labels
- [ ] Loading messages
- [ ] Error messages

**What NOT to translate:**
- Content from API (movie titles, song names, player names, etc.)
- These stay in their original language

### 5. Analytics

#### GA4 Property IDs
| Game | Measurement ID |
|------|---------------|
| Hub | G-Z9BWP9G3HS |
| Blind Test | G-KW4DNXXF1X |
| Movies Quiz | G-C4MDJKZPMC |
| F1 Quiz | G-DC68HTMMT2 |
| FutQuiz | G-Z5XCYGGR6Y |
| Tennis Quiz | G-GTKZK6BGS2 |
| Animal Quiz | G-EDNGW8M68P |
| Music Quiz | G-DCKR2HQ4K8 |
| Books Quiz | G-FQHMLZW50Z |

#### Event Naming Convention
- Hub events are game-specific: `game_selected_{game}`, `game_opened_{game}`
- This allows comparing Hub traffic to game-specific property traffic
- Examples: `game_selected_blindtest`, `game_opened_movies`

#### Required Tracking
- [ ] Game-specific GA4 property
- [ ] Hub GA4 property for cross-game tracking
- [ ] Track `game_opened_{game}` event to Hub
- [ ] Track key events: game_started, game_solved, game_gave_up
- [ ] Track guess counts and time spent

### 6. UI Structure

#### Header
```html
<header>
  <div class="header-row">
    <a href="/" class="back-link">← Back</a>
    <div class="header-controls">
      <div class="language-selector">
        <select id="language-selector">...</select>
      </div>
      <!-- Stats button removed - not yet implemented -->
    </div>
  </div>
  <h1 data-i18n="games.{game}.title">Game Title</h1>
  <p data-i18n="games.{game}.subtitle">Game subtitle</p>
</header>
```

#### Game Info Bar
```html
<div class="game-info">
  <span><span data-i18n="common.guesses">Guesses</span>: <strong id="guess-count">0</strong></span>
  <span id="game-status"></span>
</div>
```

#### Loading State
```html
<div id="loading-state" class="loading-state">
  <div class="loading-spinner"></div>
  <span data-i18n="common.loading">Loading...</span>
</div>
```

### 7. Clues Panel Behavior
- [ ] Hidden when no guesses made
- [ ] Visible during gameplay
- [ ] **STAYS VISIBLE after game over** (give up or solved)
- [ ] Collapsible with toggle button
- [ ] Shows confirmed values and ranges

### 8. Share Results
- [ ] Share button visible for BOTH daily and random games
- [ ] Emoji-based shareable text
- [ ] Includes game name, date/random indicator, guess count
- [ ] Copy to clipboard functionality
- [ ] Show confirmation toast

**Share text format:**
- Daily games: `🎉 Game Name YYYY-MM-DD 🎮\n[Status]\n\nPlay at: [URL]`
- Random games: `🎉 Game Name 🎲 Random 🎮\n[Status]\n\nPlay at: [URL]`

**Implementation:**
```javascript
function shareResults() {
  const gameType = gameState.isRandomMode ? '🎲 Random' : getDateString();
  // Include gameType in share text
}
```

### 9. Required Scripts (in order)
```html
<script src="../shared/js/game-storage.js"></script>
<script src="../shared/js/i18n.js"></script>
<!-- <script src="../shared/js/stats-modal.js"></script> - Removed -->
<script src="../shared/js/hub-analytics.js"></script>
<script src="js/{game}.js"></script>
```

### 10. CSS Requirements
- [ ] Import shared.css: `<link rel="stylesheet" href="../shared/css/shared.css">`
- [ ] Use CSS variables from shared.css
- [ ] Responsive design (mobile-first)
- [ ] Loading spinner animation
- [ ] Consistent button styles

## Game-Specific Additions

Games may add features beyond the template, but core features must remain consistent. Document any exceptions in the game's own JS file with comments.

## Future Features (Not Yet Implemented)

### Statistics Modal
- Show player's own stats
- Show how other players performed (fake data initially)
- Percentile ranking

### Streak Display
- Visual streak badge in header
- Fire emoji with count
- Currently disabled until fully implemented

---

## Updating Template

When updating this template:
1. Update this document
2. Update shared JS/CSS files
3. Apply changes to ALL games (except Sudoku)
4. Test each game after update
5. Commit with message: "template: {description of change}"
