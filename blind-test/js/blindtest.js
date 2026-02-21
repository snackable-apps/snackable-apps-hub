document.addEventListener("DOMContentLoaded", async () => {
  // ========== SHARED UTILITIES ==========
  
  // Initialize i18n (internationalization)
  const i18n = new I18n();
  await i18n.init();
  
  // Initialize game storage for persistence
  const gameStorage = new GameStorage('blindtest');
  gameStorage.cleanupOldStates();
  
  // Initialize stats modal
  const statsModal = new StatsModal(gameStorage, i18n);
  window.statsModal = statsModal; // For onclick handlers
  
  // Stats button handler
  const statsBtn = document.getElementById('stats-btn');
  if (statsBtn) {
    statsBtn.addEventListener('click', () => statsModal.show());
  }
  
  // Check if daily game was already completed
  const dailyState = gameStorage.getDailyState();
  const dailyCompleted = dailyState && dailyState.completed;
  
  // ========== DOM ELEMENTS ==========
  
  const songInput = document.getElementById("song-input");
  const autocompleteDropdown = document.getElementById("autocomplete-dropdown");
  const submitBtn = document.getElementById("submit-guess");
  const skipBtn = document.getElementById("skip-btn");
  const audioPlayer = document.getElementById("audio-player");
  const progressFill = document.getElementById("progress-fill");
  const timeDisplay = document.getElementById("time-display");
  const albumArt = document.getElementById("album-art");
  const albumRevealed = document.getElementById("album-revealed");
  const albumImage = document.getElementById("album-image");
  const guessSection = document.getElementById("guess-section");
  const choicesSection = document.getElementById("choices-section");
  const choicesGrid = document.getElementById("choices-grid");
  const resultSection = document.getElementById("result-section");
  const resultIcon = document.getElementById("result-icon");
  const resultTitle = document.getElementById("result-title");
  const resultArtist = document.getElementById("result-artist");
  const resultPoints = document.getElementById("result-points");
  const nextBtn = document.getElementById("next-btn");
  const scoreEl = document.getElementById("score");
  const roundDisplay = document.getElementById("round-display");
  const gameStatusEl = document.getElementById("game-status");
  
  // Match summary elements
  const matchSummary = document.getElementById("match-summary");
  const summaryScore = document.getElementById("summary-score");
  const summaryCorrect = document.getElementById("summary-correct");
  const summaryWrong = document.getElementById("summary-wrong");
  const summaryAvgTime = document.getElementById("summary-avg-time");
  const summaryMode = document.getElementById("summary-mode");
  const summaryResults = document.getElementById("summary-results");
  const summaryActions = document.querySelector(".summary-actions");
  const shareResultsBtn = document.getElementById("share-results-btn");
  const playRandomMatchBtn = document.getElementById("play-random-match-btn");
  
  // Toggle elements
  const easyModeToggle = document.getElementById("easy-mode-toggle");
  const multipleChoiceToggle = document.getElementById("multiple-choice-toggle");
  const modeToggles = document.getElementById("mode-toggles");
  const playerSection = document.getElementById("player-section");
  
  // Summary toggles (for settings before random match)
  const summaryEasyMode = document.getElementById("summary-easy-mode");
  const summaryMultipleChoice = document.getElementById("summary-multiple-choice");

  // Constants
  const SONGS_PER_MATCH = 5;
  const MAX_POINTS_PER_SONG = 100;
  const SONG_DURATION = 30; // 30 seconds max
  const API_URL = 'https://snackable-api.vercel.app/api/songs';

  // State
  let allSongs = [];
  let songsWithPreview = [];
  let currentSong = null;
  let hasAnswered = false;
  
  // Match state
  let isFirstMatch = !dailyCompleted; // If daily completed, start with random
  let lastMatchWasDaily = false; // Track if last completed match was daily (for share text)
  let currentRound = 0;
  let matchScore = 0;
  let matchResults = []; // Array of { song, correct, points, timeUsed }
  let dailySongs = []; // 5 daily songs for the first match
  
  // Default modes: Display Artist OFF, Multiple Choice ON
  let easyModeEnabled = false;
  let multipleChoiceEnabled = true;

  // Autocomplete state
  let autocompleteState = {
    selectedIndex: -1,
    filteredSongs: [],
    isOpen: false
  };

  // Use centralized utility functions from GameUtils
  const normalizeText = GameUtils.normalizeText;
  const getDateString = GameUtils.getDateString.bind(GameUtils);

  // Seeded random for consistent daily songs
  function seededRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  // Get daily songs (5 consistent songs for today)
  function getDailySongs() {
    const dateString = getDateString();
    const dateSeed = parseInt(dateString.replace(/-/g, ''), 10);
    
    const dailyIndexes = [];
    const available = [...songsWithPreview];
    
    for (let i = 0; i < SONGS_PER_MATCH && available.length > 0; i++) {
      const randomIndex = Math.floor(seededRandom(dateSeed + i * 1000) * available.length);
      dailyIndexes.push(available.splice(randomIndex, 1)[0]);
    }
    
    return dailyIndexes;
  }

  // Calculate points based on time used
  // Max 100 points if guessed instantly, decreasing to ~20 points at 30 seconds
  function calculatePoints(timeUsed, isCorrect) {
    if (!isCorrect) return 0;
    
    const minPoints = 20;
    const timeRatio = Math.min(timeUsed, SONG_DURATION) / SONG_DURATION;
    const points = Math.round(MAX_POINTS_PER_SONG - (MAX_POINTS_PER_SONG - minPoints) * timeRatio);
    
    return Math.max(minPoints, points);
  }

  // Load songs from API
  async function loadSongsData() {
    try {
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      
      const data = await response.json();
      if (!data.success || !data.songs || data.songs.length === 0) {
        throw new Error('No songs returned from API');
      }
      
      allSongs = data.songs.map(song => ({
        id: song.songId,
        title: song.title,
        artist: song.artist,
        album: song.album,
        albumImage: song.albumImage,
        previewUrl: song.previewUrl,
        difficulty: song.difficulty || 'medium'
      }));
      
      // Filter songs that have preview URLs
      songsWithPreview = allSongs.filter(song => song.previewUrl && song.previewUrl.length > 0);
      
      if (songsWithPreview.length < SONGS_PER_MATCH) {
        GameUtils.showError('common.noDataAvailable', true);
        return;
      }
      
      // Get daily songs for first match
      dailySongs = getDailySongs();
      
      // Set default toggles: Display Artist OFF, Multiple Choice ON
      easyModeToggle.checked = false;
      multipleChoiceToggle.checked = true;
      songInput.placeholder = 'Type a song title...';
      
      // Hide loading state
      const loadingState = document.getElementById('loading-state');
      if (loadingState) loadingState.style.display = 'none';
      
      // Check if daily is completed - show results, otherwise show start screen
      console.log('[BlindTest] dailyCompleted:', dailyCompleted, 'dailyState:', dailyState);
      if (dailyCompleted && dailyState) {
        console.log('[BlindTest] Restoring daily result...');
        restoreDailyResult();
      } else {
        console.log('[BlindTest] Showing start screen (daily not completed)');
        showStartScreen();
      }
      
    } catch (error) {
      console.error('Failed to load songs:', error);
      // Hide loading on error too
      const loadingState = document.getElementById('loading-state');
      if (loadingState) loadingState.style.display = 'none';
      GameUtils.showError('common.loadError', true);
    }
  }

  // Start screen elements
  const startScreen = document.getElementById('start-screen');
  const startGameBtn = document.getElementById('start-game-btn');
  const startEasyMode = document.getElementById('start-easy-mode');
  const startMultipleChoice = document.getElementById('start-multiple-choice');

  // Show start screen
  function showStartScreen() {
    startScreen.style.display = 'flex';
    document.getElementById('game-info').style.display = 'none';
    modeToggles.style.display = 'none';  // Hide - start screen has its own toggles inside the box
    playerSection.style.display = 'none';
    guessSection.style.display = 'none';
    choicesSection.style.display = 'none';
    matchSummary.style.display = 'none';
  }

  // Restore and display the completed daily result
  function restoreDailyResult() {
    console.log('[BlindTest] restoreDailyResult called, dailyState:', JSON.stringify(dailyState));
    if (!dailyState || !dailyState.gameData) {
      console.log('[BlindTest] No gameData found, falling back to start screen');
      // No detailed data to restore, show start screen for random play
      showStartScreen();
      return;
    }
    console.log('[BlindTest] Restoring from gameData:', dailyState.gameData);
    
    const data = dailyState.gameData;
    const storedResults = data.matchResults || [];
    
    // Restore match state
    matchScore = dailyState.score || 0;
    matchResults = storedResults;
    easyModeEnabled = data.easyModeEnabled || false;
    multipleChoiceEnabled = data.multipleChoiceEnabled || false;
    lastMatchWasDaily = true; // Restored games are always daily
    
    // Calculate stats
    const correctCount = dailyState.correctCount || storedResults.filter(r => r.correct).length;
    const wrongCount = dailyState.wrongCount || storedResults.filter(r => !r.correct).length;
    const avgTime = dailyState.avgTime || (storedResults.reduce((sum, r) => sum + (r.timeUsed || 0), 0) / storedResults.length);
    
    // Hide all sections, show match summary
    startScreen.style.display = 'none';
    document.getElementById('game-info').style.display = 'none';
    modeToggles.style.display = 'none';  // Summary has its own toggles
    playerSection.style.display = 'none';
    guessSection.style.display = 'none';
    choicesSection.style.display = 'none';
    resultSection.style.display = 'none';
    matchSummary.style.display = 'block';
    
    // Sync summary toggles with current state
    if (summaryEasyMode) summaryEasyMode.checked = easyModeEnabled;
    if (summaryMultipleChoice) summaryMultipleChoice.checked = multipleChoiceEnabled;
    
    // Update summary display
    summaryScore.textContent = matchScore;
    summaryCorrect.textContent = correctCount;
    summaryWrong.textContent = wrongCount;
    summaryAvgTime.textContent = `${avgTime.toFixed(1)}s`;
    
    // Mode description
    const modes = [];
    if (multipleChoiceEnabled) modes.push(i18n.t('games.blindtest.multipleChoice'));
    if (easyModeEnabled) modes.push(i18n.t('games.blindtest.displayArtist'));
    summaryMode.textContent = modes.length > 0 ? modes.join(' + ') : 'Hard Mode (Type Only)';
    
    // Build results list
    summaryResults.innerHTML = '';
    storedResults.forEach(result => {
      const div = document.createElement('div');
      div.className = 'song-result';
      div.innerHTML = `
        <span class="result-emoji">${result.correct ? '✅' : (result.skipped ? '⏭️' : '❌')}</span>
        <div class="song-info">
          <div class="song-name">${result.song.title}</div>
          <div class="song-artist">${result.song.artist}</div>
        </div>
        <span class="song-points ${result.points === 0 ? 'zero' : ''}">${result.points > 0 ? '+' : ''}${result.points}</span>
      `;
      summaryResults.appendChild(div);
    });
    
    // Show both share and play random buttons
    summaryActions.classList.remove('no-share');
    shareResultsBtn.style.display = '';
  }
  
  // Note: Daily result restoration is handled inside loadSongsData() after data is loaded
  
  // Start game button handler
  if (startGameBtn) {
    startGameBtn.addEventListener('click', () => {
      // Apply settings from start screen
      easyModeEnabled = startEasyMode.checked;
      multipleChoiceEnabled = startMultipleChoice.checked;
      easyModeToggle.checked = easyModeEnabled;
      multipleChoiceToggle.checked = multipleChoiceEnabled;
      
      // Hide start screen, show game
      startScreen.style.display = 'none';
      document.getElementById('game-info').style.display = 'block';
      
      // Start daily if not completed, otherwise random
      startMatch(!dailyCompleted);
    });
  }

  // Start a new match
  function startMatch(isDaily) {
    isFirstMatch = isDaily;
    currentRound = 0;
    matchScore = 0;
    matchResults = [];
    
    // Hide summary and toggles, show game
    matchSummary.style.display = 'none';
    startScreen.style.display = 'none';
    document.getElementById('game-info').style.display = 'block';
    modeToggles.style.display = 'none';  // Hide toggles during gameplay
    playerSection.style.display = 'flex';
    
    startRound();
  }

  // Get truly random songs with artist diversity (no same artist twice in a match)
  function getRandomSongsWithDiversity(count, excludeIds = []) {
    const selected = [];
    const usedArtists = new Set();
    const available = songsWithPreview.filter(s => !excludeIds.includes(s.id));
    
    // Shuffle available songs
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    
    for (const song of shuffled) {
      if (selected.length >= count) break;
      
      // Skip if we already have a song from this artist
      const artistKey = song.artist.toLowerCase();
      if (usedArtists.has(artistKey)) continue;
      
      selected.push(song);
      usedArtists.add(artistKey);
    }
    
    // If we couldn't get enough diverse songs, fill with any remaining
    if (selected.length < count) {
      for (const song of shuffled) {
        if (selected.length >= count) break;
        if (!selected.find(s => s.id === song.id)) {
          selected.push(song);
        }
      }
    }
    
    return selected;
  }

  // Start a new round within a match
  function startRound() {
    currentRound++;
    
    if (isFirstMatch) {
      currentSong = dailySongs[currentRound - 1];
    } else {
      // Random song with artist diversity
      const usedSongIds = matchResults.map(r => r.song.id);
      const usedArtists = new Set(matchResults.map(r => r.song.artist.toLowerCase()));
      
      // Get available songs, preferring different artists
      const available = songsWithPreview.filter(s => 
        !usedSongIds.includes(s.id) && !usedArtists.has(s.artist.toLowerCase())
      );
      
      // If no diverse songs left, fall back to any unused song
      const pool = available.length > 0 ? available : 
        songsWithPreview.filter(s => !usedSongIds.includes(s.id));
      
      const randomIndex = Math.floor(Math.random() * pool.length);
      currentSong = pool[randomIndex] || songsWithPreview[0];
    }
    
    hasAnswered = false;
    currentChoices = [];  // Reset choices for new round
    
    // Update round display
    roundDisplay.textContent = `${currentRound}/${SONGS_PER_MATCH}`;
    scoreEl.textContent = matchScore;
    gameStatusEl.textContent = '';
    
    // Reset UI
    resetUI();
    
    // Load and auto-play audio
    loadAndPlayAudio();
    
    if (multipleChoiceEnabled) {
      generateChoices(true);  // Generate fresh choices for new round
    }
    
    // Track round start (send only to Blind Test property, not Hub)
    if (typeof gtag === 'function') {
      gtag('event', 'blindtest_round_start', {
        song: currentSong.title,
        round: currentRound,
        is_daily: isFirstMatch,
        send_to: 'G-KW4DNXXF1X'
      });
    }
  }

  // Reset UI for new round
  function resetUI() {
    // Hide result, show input
    resultSection.style.display = 'none';
    
    if (multipleChoiceEnabled) {
      guessSection.style.display = 'none';
      choicesSection.style.display = 'block';
    } else {
      guessSection.style.display = 'block';
      choicesSection.style.display = 'none';
    }
    
    // Reset input
    songInput.value = '';
    autocompleteDropdown.style.display = 'none';
    
    // Reset album art (hidden during play)
    albumArt.style.display = 'flex';
    albumRevealed.style.display = 'none';
    
    // Reset progress
    progressFill.style.width = '0%';
    timeDisplay.textContent = '0:00 / 0:30';
    
    // Reset choices
    const choiceBtns = choicesGrid.querySelectorAll('.choice-btn');
    choiceBtns.forEach(btn => {
      btn.classList.remove('correct', 'wrong');
      btn.disabled = false;
    });
  }

  // Load and auto-play audio
  function loadAndPlayAudio() {
    if (currentSong && currentSong.previewUrl) {
      audioPlayer.src = currentSong.previewUrl;
      audioPlayer.load();
      
      // Auto-play when loaded
      audioPlayer.addEventListener('canplaythrough', function onCanPlay() {
        audioPlayer.removeEventListener('canplaythrough', onCanPlay);
        audioPlayer.play().catch(e => console.error('Auto-play error:', e));
      }, { once: true });
    }
  }

  // Fisher-Yates shuffle for uniform randomness
  function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
  
  // Store current choices to keep them consistent when toggling display mode
  let currentChoices = [];
  
  // Generate multiple choice options
  function generateChoices(forceNewChoices = true) {
    choicesGrid.innerHTML = '';
    
    // Only generate new choices if forced or no choices exist
    if (forceNewChoices || currentChoices.length === 0) {
      // Get 3 wrong answers using Fisher-Yates shuffle
      const otherSongs = songsWithPreview.filter(s => s.id !== currentSong.id);
      const shuffledOthers = shuffleArray(otherSongs);
      const wrongChoices = shuffledOthers.slice(0, 3);
      
      // Combine with correct answer and shuffle again
      currentChoices = shuffleArray([...wrongChoices, currentSong]);
    }
    
    currentChoices.forEach(song => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.dataset.songId = song.id;
      
      if (easyModeEnabled) {
        btn.innerHTML = `
          <span class="choice-title">${song.title}</span>
          <span class="choice-artist">${song.artist}</span>
        `;
      } else {
        btn.innerHTML = `<span class="choice-title">${song.title}</span>`;
      }
      
      btn.addEventListener('click', () => handleChoiceClick(btn, song));
      choicesGrid.appendChild(btn);
    });
  }

  // Handle choice click
  function handleChoiceClick(btn, song) {
    if (hasAnswered) return;
    hasAnswered = true;
    
    const isCorrect = song.id === currentSong.id;
    
    // Mark buttons
    const allBtns = choicesGrid.querySelectorAll('.choice-btn');
    allBtns.forEach(b => {
      b.disabled = true;
      if (b.dataset.songId === currentSong.id) {
        b.classList.add('correct');
      } else if (b === btn && !isCorrect) {
        b.classList.add('wrong');
      }
    });
    
    showResult(isCorrect);
  }

  // Filter songs for autocomplete
  function filterSongs(query) {
    if (!query || query.trim() === '') return [];
    
    const normalizedQuery = normalizeText(query.trim());
    
    return allSongs.filter(song => {
      if (normalizeText(song.title).includes(normalizedQuery)) return true;
      if (easyModeEnabled && normalizeText(song.artist).includes(normalizedQuery)) return true;
      return false;
    }).slice(0, 10);
  }

  // Display autocomplete
  function displayAutocomplete(results) {
    autocompleteDropdown.innerHTML = '';
    autocompleteState.filteredSongs = results || [];
    autocompleteState.selectedIndex = -1;
    
    if (!results || results.length === 0) {
      autocompleteDropdown.style.display = 'none';
      autocompleteState.isOpen = false;
      return;
    }
    
    autocompleteDropdown.style.display = 'block';
    autocompleteState.isOpen = true;
    
    results.forEach((song, index) => {
      const item = document.createElement('div');
      item.className = 'autocomplete-item';
      
      if (easyModeEnabled) {
        item.innerHTML = `
          <span class="song-title">${song.title}</span>
          <span class="artist-name">${song.artist}</span>
        `;
      } else {
        item.innerHTML = `<span class="song-title">${song.title}</span>`;
      }
      
      item.addEventListener('click', () => selectSong(song.title));
      item.addEventListener('mouseenter', () => {
        autocompleteState.selectedIndex = index;
        updateAutocompleteSelection();
      });
      
      autocompleteDropdown.appendChild(item);
    });
  }

  // Update autocomplete selection
  function updateAutocompleteSelection() {
    const items = autocompleteDropdown.querySelectorAll('.autocomplete-item');
    items.forEach((item, index) => {
      item.classList.toggle('selected', index === autocompleteState.selectedIndex);
    });
  }

  // Select song from autocomplete
  function selectSong(title) {
    songInput.value = title;
    autocompleteDropdown.style.display = 'none';
    autocompleteState.isOpen = false;
    songInput.focus();
  }

  // Submit guess
  function submitGuess() {
    if (hasAnswered) return;
    
    const inputValue = songInput.value.trim();
    if (!inputValue) return;
    
    const guess = allSongs.find(s => 
      normalizeText(s.title) === normalizeText(inputValue)
    );
    
    if (!guess) {
      GameUtils.showWarning(i18n.t('common.notFound', { item: i18n.t('games.blindtest.title') }));
      return;
    }
    
    hasAnswered = true;
    const isCorrect = guess.id === currentSong.id;
    showResult(isCorrect);
  }

  // Skip song
  function skipSong() {
    if (hasAnswered) return;
    hasAnswered = true;
    showResult(false, true);
  }

  // Show result for current round (song keeps playing!)
  function showResult(isCorrect, skipped = false) {
    // DON'T stop audio - let it keep playing during result
    
    // Calculate time used and points
    const timeUsed = audioPlayer.currentTime || 0;
    const points = calculatePoints(timeUsed, isCorrect);
    
    // Update match score
    if (isCorrect) {
      matchScore += points;
    }
    
    // Record result
    matchResults.push({
      song: currentSong,
      correct: isCorrect,
      skipped,
      points,
      timeUsed
    });
    
    // Update display
    if (isCorrect) {
      resultIcon.textContent = '✅';
      resultPoints.textContent = `+${points} ${i18n.t('common.points') || 'points'}`;
      resultPoints.style.color = 'var(--success-color)';
      gameStatusEl.textContent = i18n.t('common.correct');
      gameStatusEl.style.color = 'var(--success-color)';
    } else {
      resultIcon.textContent = skipped ? '⏭️' : '❌';
      resultPoints.textContent = `+0 ${i18n.t('common.points') || 'points'}`;
      resultPoints.style.color = 'var(--text-muted)';
      gameStatusEl.textContent = skipped ? i18n.t('common.skipped') : i18n.t('common.wrong');
      gameStatusEl.style.color = 'var(--error-color)';
    }
    
    scoreEl.textContent = matchScore;
    
    // Show album art
    if (currentSong.albumImage) {
      albumImage.src = currentSong.albumImage;
      albumArt.style.display = 'none';
      albumRevealed.style.display = 'block';
    }
    
    // Show result
    resultTitle.textContent = currentSong.title;
    resultArtist.textContent = currentSong.artist;
    
    guessSection.style.display = 'none';
    choicesSection.style.display = 'none';
    resultSection.style.display = 'flex';
    
    // Update next button text
    if (currentRound < SONGS_PER_MATCH) {
      nextBtn.textContent = `Next Song (${currentRound + 1}/${SONGS_PER_MATCH})`;
    } else {
      nextBtn.textContent = 'See Results';
    }
    
    // Track result (send only to Blind Test property)
    if (typeof gtag === 'function') {
      gtag('event', 'blindtest_answer', {
        song: currentSong.title,
        correct: isCorrect,
        skipped: skipped,
        send_to: 'G-KW4DNXXF1X',
        points: points,
        round: currentRound,
        is_daily: isFirstMatch
      });
    }
  }

  // Proceed to next round or show summary
  function nextRoundOrSummary() {
    // Stop current audio before moving on
    audioPlayer.pause();
    audioPlayer.currentTime = 0;
    
    if (currentRound < SONGS_PER_MATCH) {
      startRound();
    } else {
      showMatchSummary();
    }
  }

  // Show match summary
  function showMatchSummary() {
    // Hide game sections
    resultSection.style.display = 'none';
    guessSection.style.display = 'none';
    choicesSection.style.display = 'none';
    modeToggles.style.display = 'none';  // Will be shown inside summary via CSS/HTML restructure
    playerSection.style.display = 'none';
    document.getElementById('game-info').style.display = 'none';  // Hide game info bar (including "Wrong!" status)
    
    // Calculate stats
    const correctCount = matchResults.filter(r => r.correct).length;
    const wrongCount = matchResults.filter(r => !r.correct).length;
    const avgTime = matchResults.reduce((sum, r) => sum + r.timeUsed, 0) / SONGS_PER_MATCH;
    
    // Save whether this was a daily match BEFORE changing isFirstMatch
    const wasDaily = isFirstMatch;
    lastMatchWasDaily = wasDaily; // Store for share text generation
    
    // Save game result to storage
    const won = correctCount >= Math.ceil(SONGS_PER_MATCH / 2); // Won if got majority correct
    const result = {
      won: won,
      score: matchScore,
      correctCount: correctCount,
      wrongCount: wrongCount,
      avgTime: avgTime,
      isDaily: wasDaily,
      gameData: {
        matchResults: matchResults.map(r => ({
          song: { title: r.song.title, artist: r.song.artist },
          correct: r.correct,
          skipped: r.skipped,
          points: r.points,
          timeUsed: r.timeUsed
        })),
        easyModeEnabled: easyModeEnabled,
        multipleChoiceEnabled: multipleChoiceEnabled
      }
    };
    
    // If this was the first (daily) match, mark it as completed
    if (isFirstMatch) {
      console.log('[BlindTest] Saving daily game result:', result);
      gameStorage.completeDailyGame(result);
      console.log('[BlindTest] Daily game saved. Verify with: localStorage.getItem("blindtest_daily_' + getDateString() + '")');
      isFirstMatch = false; // Next game will be random
      
      // Submit stats to API (only for daily games)
      if (typeof GameUtils !== 'undefined' && GameUtils.submitBlindtestStats) {
        GameUtils.submitBlindtestStats({
          dateString: getDateString(),
          totalScore: matchScore,
          correctCount: correctCount,
          wrongCount: wrongCount,
          avgTimeMs: Math.round(avgTime * 1000),
          settingsArtist: easyModeEnabled,
          settingsMultiple: multipleChoiceEnabled,
          isRandomMode: false
        });
      }
    } else {
      // For random matches, just update stats
      gameStorage.updateStats(result);
    }
    
    // Update summary display
    summaryScore.textContent = matchScore;
    summaryCorrect.textContent = correctCount;
    summaryWrong.textContent = wrongCount;
    summaryAvgTime.textContent = `${avgTime.toFixed(1)}s`;
    
    // Mode description
    const modes = [];
    if (multipleChoiceEnabled) modes.push(i18n.t('games.blindtest.multipleChoice'));
    if (easyModeEnabled) modes.push(i18n.t('games.blindtest.displayArtist'));
    summaryMode.textContent = modes.length > 0 ? modes.join(' + ') : 'Hard Mode (Type Only)';
    
    // Build results list
    summaryResults.innerHTML = '';
    matchResults.forEach(result => {
      const div = document.createElement('div');
      div.className = 'song-result';
      div.innerHTML = `
        <span class="result-emoji">${result.correct ? '✅' : (result.skipped ? '⏭️' : '❌')}</span>
        <div class="song-info">
          <div class="song-name">${result.song.title}</div>
          <div class="song-artist">${result.song.artist}</div>
        </div>
        <span class="song-points ${result.points === 0 ? 'zero' : ''}">${result.points > 0 ? '+' : ''}${result.points}</span>
      `;
      summaryResults.appendChild(div);
    });
    
    // Show share button for daily matches (use wasDaily since isFirstMatch was changed)
    if (wasDaily) {
      summaryActions.classList.remove('no-share');
      shareResultsBtn.style.display = '';
    } else {
      shareResultsBtn.style.display = 'none';
    }
    
    // Sync summary toggles with current state
    if (summaryEasyMode) summaryEasyMode.checked = easyModeEnabled;
    if (summaryMultipleChoice) summaryMultipleChoice.checked = multipleChoiceEnabled;
    
    // Show summary
    matchSummary.style.display = 'block';
    
    // Track match complete (send only to Blind Test property)
    if (typeof gtag === 'function') {
      gtag('event', 'blindtest_match_complete', {
        score: matchScore,
        correct: correctCount,
        is_daily: isFirstMatch,
        send_to: 'G-KW4DNXXF1X',
        easy_mode: easyModeEnabled,
        multiple_choice: multipleChoiceEnabled
      });
    }
  }

  // Generate share text
  function generateShareText() {
    const correctCount = matchResults.filter(r => r.correct).length;
    
    // Emoji representation
    const emojis = matchResults.map(r => r.correct ? '🟢' : '🔴').join('');
    
    // Mode indicator
    let modeText = '';
    if (multipleChoiceEnabled && easyModeEnabled) modeText = ' (Artist + MC)';
    else if (multipleChoiceEnabled) modeText = ' (Multiple Choice)';
    else if (easyModeEnabled) modeText = ' (Artist Hint)';
    
    // Daily vs Random indicator
    const gameType = lastMatchWasDaily ? getDateString() : '🎲 Random';
    
    return `🎧 Blind Test ${gameType}${modeText}

${emojis}
Score: ${matchScore}/500 (${correctCount}/${SONGS_PER_MATCH})

Play at snackable-games.com/blind-test/`;
  }

  // Share results
  function shareResults() {
    const shareText = generateShareText();
    
    GameUtils.shareGameResult({
      text: shareText,
      title: 'Blind Test Score',
      button: shareResultsBtn,
      successMessage: '✅ ' + i18n.t('share.copiedToClipboard'),
      originalHTML: shareResultsBtn.innerHTML,
      analytics: {
        gtag: typeof gtag === 'function' ? gtag : null,
        event: 'blindtest_share',
        params: { score: matchScore, is_daily: isFirstMatch, send_to: 'G-KW4DNXXF1X' }
      }
    });
  }

  // Update progress display
  function updateProgress() {
    const duration = audioPlayer.duration || SONG_DURATION;
    const currentTime = audioPlayer.currentTime;
    const percent = (currentTime / duration) * 100;
    progressFill.style.width = `${percent}%`;
    
    const mins = Math.floor(currentTime / 60);
    const secs = Math.floor(currentTime % 60);
    const totalMins = Math.floor(duration / 60);
    const totalSecs = Math.floor(duration % 60);
    timeDisplay.textContent = `${mins}:${String(secs).padStart(2, '0')} / ${totalMins}:${String(totalSecs).padStart(2, '0')}`;
  }

  // Event Listeners
  audioPlayer.addEventListener('timeupdate', updateProgress);
  
  // When song ends naturally (30s), auto-skip if not answered
  audioPlayer.addEventListener('ended', () => {
    if (!hasAnswered) {
      hasAnswered = true;
      showResult(false, true); // Treat as skipped
    }
  });
  
  submitBtn.addEventListener('click', submitGuess);
  skipBtn.addEventListener('click', skipSong);
  
  nextBtn.addEventListener('click', nextRoundOrSummary);
  
  shareResultsBtn.addEventListener('click', shareResults);
  playRandomMatchBtn.addEventListener('click', () => startMatch(false));
  
  // Easy mode toggle
  easyModeToggle.addEventListener('change', (e) => {
    easyModeEnabled = e.target.checked;
    
    // Update placeholder
    songInput.placeholder = easyModeEnabled 
      ? 'Type a song or artist name...'
      : 'Type a song title...';
    
    // Refresh choices display if in multiple choice mode (keep same choices, just update display format)
    if (multipleChoiceEnabled && !hasAnswered) {
      generateChoices(false);  // false = keep same choices, just re-render with new display format
    }
    
    // Refresh autocomplete
    if (songInput.value.trim()) {
      displayAutocomplete(filterSongs(songInput.value));
    }
  });
  
  // Multiple choice toggle
  multipleChoiceToggle.addEventListener('change', (e) => {
    multipleChoiceEnabled = e.target.checked;
    
    if (multipleChoiceEnabled) {
      guessSection.style.display = 'none';
      choicesSection.style.display = 'block';
      // Use existing choices if available, otherwise generate new ones
      if (!hasAnswered) generateChoices(currentChoices.length === 0);
    } else {
      choicesSection.style.display = 'none';
      guessSection.style.display = 'block';
    }
  });
  
  // Summary toggles (for match summary screen - before random play)
  if (summaryEasyMode) {
    summaryEasyMode.addEventListener('change', (e) => {
      easyModeEnabled = e.target.checked;
      easyModeToggle.checked = easyModeEnabled;  // Sync with main toggle
    });
  }
  
  if (summaryMultipleChoice) {
    summaryMultipleChoice.addEventListener('change', (e) => {
      multipleChoiceEnabled = e.target.checked;
      multipleChoiceToggle.checked = multipleChoiceEnabled;  // Sync with main toggle
    });
  }
  
  // Autocomplete input
  songInput.addEventListener('input', (e) => {
    const results = filterSongs(e.target.value);
    displayAutocomplete(results);
  });
  
  songInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (autocompleteState.isOpen && autocompleteState.selectedIndex >= 0) {
        const selected = autocompleteState.filteredSongs[autocompleteState.selectedIndex];
        selectSong(selected.title);
        submitGuess();
      } else {
        submitGuess();
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (autocompleteState.isOpen && autocompleteState.filteredSongs.length > 0) {
        autocompleteState.selectedIndex = Math.min(
          autocompleteState.selectedIndex + 1,
          autocompleteState.filteredSongs.length - 1
        );
        updateAutocompleteSelection();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (autocompleteState.isOpen) {
        autocompleteState.selectedIndex = Math.max(autocompleteState.selectedIndex - 1, -1);
        updateAutocompleteSelection();
      }
    } else if (e.key === 'Escape') {
      autocompleteDropdown.style.display = 'none';
      autocompleteState.isOpen = false;
    }
  });
  
  // Close autocomplete when clicking outside
  document.addEventListener('click', (e) => {
    if (!songInput.contains(e.target) && !autocompleteDropdown.contains(e.target)) {
      autocompleteDropdown.style.display = 'none';
      autocompleteState.isOpen = false;
    }
  });
  
  // Load data
  loadSongsData();
});
