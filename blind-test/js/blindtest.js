document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const songInput = document.getElementById("song-input");
  const autocompleteDropdown = document.getElementById("autocomplete-dropdown");
  const submitBtn = document.getElementById("submit-guess");
  const skipBtn = document.getElementById("skip-btn");
  const playBtn = document.getElementById("play-btn");
  const audioPlayer = document.getElementById("audio-player");
  const progressBar = document.getElementById("progress-bar");
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
  const nextBtn = document.getElementById("next-btn");
  const playAgainBtn = document.getElementById("play-again-btn");
  const scoreEl = document.getElementById("score");
  const streakEl = document.getElementById("streak");
  const gameStatusEl = document.getElementById("game-status");
  
  // Toggle elements
  const easyModeToggle = document.getElementById("easy-mode-toggle");
  const multipleChoiceToggle = document.getElementById("multiple-choice-toggle");
  const toggleDescription = document.getElementById("toggle-description");
  const mcToggleDescription = document.getElementById("mc-toggle-description");

  // State
  let allSongs = [];
  let songsWithPreview = [];
  let currentSong = null;
  let isPlaying = false;
  let easyModeEnabled = false;
  let multipleChoiceEnabled = false;
  let score = 0;
  let streak = 0;
  let isFirstRound = true;
  let dailySongIndex = null;
  let hasAnswered = false;

  // Autocomplete state
  let autocompleteState = {
    selectedIndex: -1,
    filteredSongs: [],
    isOpen: false
  };

  const API_URL = 'https://snackable-api.vercel.app/api/songs';

  // Text normalization
  function normalizeText(text) {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  // Get date string for daily song
  function getDateString() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
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
      
      console.log('Songs loaded:', allSongs.length);
      console.log('Songs with preview:', songsWithPreview.length);
      
      if (songsWithPreview.length === 0) {
        alert('No songs with audio previews available.');
        return;
      }
      
      // Calculate daily song index
      const dateString = getDateString();
      const date = new Date(dateString);
      const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
      dailySongIndex = dayOfYear % songsWithPreview.length;
      
      initializeGame();
      
    } catch (error) {
      console.error('Failed to load songs:', error);
      alert('Failed to load songs. Please refresh the page.');
    }
  }

  // Initialize game
  function initializeGame() {
    if (isFirstRound) {
      // First round is the daily song
      currentSong = songsWithPreview[dailySongIndex];
      isFirstRound = false;
    } else {
      // Random song for subsequent rounds
      const randomIndex = Math.floor(Math.random() * songsWithPreview.length);
      currentSong = songsWithPreview[randomIndex];
    }
    
    hasAnswered = false;
    
    // Reset UI
    resetUI();
    loadAudio();
    
    if (multipleChoiceEnabled) {
      generateChoices();
    }
    
    // Track game start
    if (typeof gtag === 'function') {
      gtag('event', 'blindtest_round_start', {
        song: currentSong.title,
        is_daily: isFirstRound
      });
    }
  }

  // Reset UI
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
    
    // Reset album art
    albumArt.style.display = 'flex';
    albumRevealed.style.display = 'none';
    
    // Reset audio
    progressFill.style.width = '0%';
    timeDisplay.textContent = '0:00 / 0:30';
    playBtn.classList.remove('playing');
    playBtn.querySelector('.play-text').textContent = 'Play Sample';
    
    // Reset choices
    const choiceBtns = choicesGrid.querySelectorAll('.choice-btn');
    choiceBtns.forEach(btn => {
      btn.classList.remove('correct', 'wrong');
      btn.disabled = false;
    });
  }

  // Load audio
  function loadAudio() {
    if (currentSong && currentSong.previewUrl) {
      audioPlayer.src = currentSong.previewUrl;
      audioPlayer.load();
    }
  }

  // Generate multiple choice options
  function generateChoices() {
    choicesGrid.innerHTML = '';
    
    // Get 3 wrong answers
    const otherSongs = songsWithPreview.filter(s => s.id !== currentSong.id);
    const shuffled = otherSongs.sort(() => Math.random() - 0.5);
    const wrongChoices = shuffled.slice(0, 3);
    
    // Combine with correct answer and shuffle
    const allChoices = [...wrongChoices, currentSong].sort(() => Math.random() - 0.5);
    
    allChoices.forEach(song => {
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
      alert('Song not found. Please select from the suggestions.');
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

  // Show result
  function showResult(isCorrect, skipped = false) {
    // Stop audio
    audioPlayer.pause();
    isPlaying = false;
    playBtn.classList.remove('playing');
    
    // Update score and streak
    if (isCorrect) {
      score++;
      streak++;
      resultIcon.textContent = '✅';
      gameStatusEl.textContent = 'Correct!';
      gameStatusEl.style.color = 'var(--success-color)';
    } else {
      streak = 0;
      resultIcon.textContent = skipped ? '⏭️' : '❌';
      gameStatusEl.textContent = skipped ? 'Skipped' : 'Wrong!';
      gameStatusEl.style.color = 'var(--error-color)';
    }
    
    scoreEl.textContent = score;
    streakEl.textContent = streak;
    
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
    
    // Track result
    if (typeof gtag === 'function') {
      gtag('event', 'blindtest_answer', {
        song: currentSong.title,
        correct: isCorrect,
        skipped: skipped,
        streak: streak
      });
    }
  }

  // Audio player controls
  function togglePlay() {
    if (isPlaying) {
      audioPlayer.pause();
      isPlaying = false;
      playBtn.classList.remove('playing');
      playBtn.querySelector('.play-text').textContent = 'Play Sample';
    } else {
      audioPlayer.play().catch(e => console.error('Play error:', e));
      isPlaying = true;
      playBtn.classList.add('playing');
      playBtn.querySelector('.play-text').textContent = 'Pause';
    }
  }

  // Update progress
  function updateProgress() {
    const duration = audioPlayer.duration || 30;
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
  playBtn.addEventListener('click', togglePlay);
  audioPlayer.addEventListener('timeupdate', updateProgress);
  audioPlayer.addEventListener('ended', () => {
    isPlaying = false;
    playBtn.classList.remove('playing');
    playBtn.querySelector('.play-text').textContent = 'Play Again';
  });
  
  submitBtn.addEventListener('click', submitGuess);
  skipBtn.addEventListener('click', skipSong);
  
  nextBtn.addEventListener('click', initializeGame);
  playAgainBtn.addEventListener('click', initializeGame);
  
  // Easy mode toggle
  easyModeToggle.addEventListener('change', (e) => {
    easyModeEnabled = e.target.checked;
    
    if (easyModeEnabled) {
      toggleDescription.innerHTML = `
        <span class="current-mode">🎤 <strong>Song + Artist</strong> search</span>
        <span class="mode-action">Disable to search by title only</span>
      `;
      songInput.placeholder = 'Type a song or artist name...';
    } else {
      toggleDescription.innerHTML = `
        <span class="current-mode">🎯 <strong>Song title</strong> only</span>
        <span class="mode-action">Enable to show artist in search</span>
      `;
      songInput.placeholder = 'Type a song title...';
    }
    
    // Refresh choices if in multiple choice mode
    if (multipleChoiceEnabled && !hasAnswered) {
      generateChoices();
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
      mcToggleDescription.innerHTML = `
        <span class="current-mode">🎯 <strong>4 choices</strong> to pick from</span>
        <span class="mode-action">Disable to type your answer</span>
      `;
      guessSection.style.display = 'none';
      choicesSection.style.display = 'block';
      if (!hasAnswered) generateChoices();
    } else {
      mcToggleDescription.innerHTML = `
        <span class="current-mode">⌨️ <strong>Type</strong> your answer</span>
        <span class="mode-action">Enable for 4 choices</span>
      `;
      choicesSection.style.display = 'none';
      guessSection.style.display = 'block';
    }
  });
  
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
  
  // Keyboard shortcut to play
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && document.activeElement !== songInput) {
      e.preventDefault();
      togglePlay();
    }
  });
  
  // Load data
  loadSongsData();
});
