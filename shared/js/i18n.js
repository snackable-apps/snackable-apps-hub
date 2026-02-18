/**
 * i18n - Internationalization for Snackable Games
 * 
 * Supported languages: EN, FR, PT-BR, IT, ES
 * 
 * Usage:
 *   const i18n = new I18n();
 *   await i18n.init();
 *   i18n.t('common.submit'); // Returns translated string
 */

class I18n {
  constructor() {
    this.locale = 'en';
    this.translations = {};
    this.fallback = 'en';
    this.supportedLocales = ['en', 'fr', 'pt-br', 'it', 'es'];
  }

  /**
   * Initialize i18n - load translations and detect language
   */
  async init() {
    // Detect user's preferred language
    this.locale = this.detectLocale();
    
    // Load translations
    await this.loadTranslations(this.locale);
    
    // If not English, also load English as fallback
    if (this.locale !== 'en') {
      await this.loadTranslations('en');
    }

    // Update HTML lang attribute
    document.documentElement.lang = this.locale;
    
    // Translate page
    this.translatePage();
    
    // Set up language selector if exists
    this.setupLanguageSelector();
  }

  /**
   * Detect user's preferred locale
   */
  detectLocale() {
    // Check localStorage first
    const saved = localStorage.getItem('snackable_locale');
    if (saved && this.supportedLocales.includes(saved)) {
      return saved;
    }

    // Check browser language
    const browserLang = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
    
    // Direct match
    if (this.supportedLocales.includes(browserLang)) {
      return browserLang;
    }
    
    // Partial match (e.g., 'pt' matches 'pt-br')
    const shortLang = browserLang.split('-')[0];
    if (shortLang === 'pt') return 'pt-br';
    if (this.supportedLocales.includes(shortLang)) {
      return shortLang;
    }

    return 'en';
  }

  /**
   * Load translations for a locale
   */
  async loadTranslations(locale) {
    if (this.translations[locale]) return;

    try {
      // Try to load from shared/locales/
      const basePath = this.getBasePath();
      const response = await fetch(`${basePath}/shared/locales/${locale}.json`);
      if (response.ok) {
        this.translations[locale] = await response.json();
      } else {
        // Fallback to inline translations
        this.translations[locale] = this.getInlineTranslations(locale);
      }
    } catch (e) {
      console.warn(`Failed to load translations for ${locale}:`, e);
      this.translations[locale] = this.getInlineTranslations(locale);
    }
  }

  /**
   * Get base path for loading resources
   */
  getBasePath() {
    const path = window.location.pathname;
    // If we're in a game folder, go up one level
    if (path.includes('/') && !path.endsWith('/')) {
      const parts = path.split('/').filter(p => p);
      if (parts.length > 0) {
        return '/' + parts.slice(0, -1).join('/');
      }
    }
    return '';
  }

  /**
   * Translate a key
   * @param {string} key - Dot-notation key (e.g., 'common.submit')
   * @param {object} params - Optional parameters for interpolation
   */
  t(key, params = {}) {
    let value = this.getNestedValue(this.translations[this.locale], key);
    
    // Fallback to English
    if (value === undefined && this.locale !== 'en') {
      value = this.getNestedValue(this.translations['en'], key);
    }
    
    // Return key if not found
    if (value === undefined) {
      console.warn(`Translation missing: ${key}`);
      return key;
    }

    // Interpolate parameters
    if (params && typeof value === 'string') {
      Object.keys(params).forEach(param => {
        value = value.replace(new RegExp(`{${param}}`, 'g'), params[param]);
      });
    }

    return value;
  }

  /**
   * Get nested value from object using dot notation
   */
  getNestedValue(obj, key) {
    if (!obj) return undefined;
    return key.split('.').reduce((o, k) => (o || {})[k], obj);
  }

  /**
   * Change locale
   */
  async setLocale(locale) {
    if (!this.supportedLocales.includes(locale)) {
      console.warn(`Unsupported locale: ${locale}`);
      return;
    }

    this.locale = locale;
    localStorage.setItem('snackable_locale', locale);
    
    await this.loadTranslations(locale);
    document.documentElement.lang = locale;
    this.translatePage();
  }

  /**
   * Translate all elements with data-i18n attribute
   */
  translatePage() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const translated = this.t(key);
      
      if (el.tagName === 'INPUT' && el.placeholder) {
        el.placeholder = translated;
      } else {
        el.textContent = translated;
      }
    });

    // Also translate data-i18n-placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      el.placeholder = this.t(key);
    });

    // Translate data-i18n-title
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      el.title = this.t(key);
    });
  }

  /**
   * Set up language selector
   */
  setupLanguageSelector() {
    const selector = document.getElementById('language-selector');
    if (!selector) return;

    selector.value = this.locale;
    selector.addEventListener('change', (e) => {
      this.setLocale(e.target.value);
    });
  }

  /**
   * Get inline translations (fallback if JSON fails to load)
   */
  getInlineTranslations(locale) {
    const translations = {
      en: {
        hub: {
          title: 'Snackable Games',
          subtitle: 'Quick, fun games you can play in minutes',
          about: 'About',
          privacy: 'Privacy',
          featured: 'Featured',
          games: {
            blindtest: { title: 'Blind Test', desc: 'Listen to song samples and guess the title. Test your music knowledge!' },
            movies: { title: 'Movie Quiz', desc: 'Guess the film using clues about director, genre, and rating.' },
            f1: { title: 'F1 Quiz', desc: 'Guess the Formula 1 driver using clues about their career stats.' },
            fut: { title: 'FutQuiz', desc: 'Guess the football player using clues about their career.' },
            music: { title: 'Music Quiz', desc: 'Guess the song using hints about artist, genre, and era.' },
            animal: { title: 'Animal Quiz', desc: 'Guess the mystery animal from habitat, diet, and trait clues.' },
            sudoku: { title: 'Sudoku', desc: 'Classic number puzzle. Clean design, no distractions.' },
            tennis: { title: 'Tennis Quiz', desc: 'Guess the tennis player using clues about their career and stats.' },
            books: { title: 'Books Quiz', desc: 'Guess the classic book using clues about author and publication.' }
          }
        },
        common: {
          submit: 'Submit',
          guess: 'Guess',
          skip: 'Skip',
          giveUp: 'Give Up',
          playAgain: 'Play Again',
          playRandom: 'Play Random',
          shareResults: 'Share Results',
          nextSong: 'Next Song',
          close: 'Close',
          loading: 'Loading...',
          error: 'An error occurred',
          correct: 'Correct!',
          wrong: 'Wrong!',
          skipped: 'Skipped',
          guesses: 'Guesses',
          score: 'Score',
          points: 'points',
          streak: 'Streak',
          stats: 'Statistics',
          howToPlay: 'How to Play',
          daily: 'Daily',
          random: 'Random',
          startGame: 'Start Game',
          back: 'Back',
          dailyComplete: "Today's daily is complete!",
          playingRandom: 'Playing random mode.',
          solvedIn: 'Solved in {count} guess!',
          solvedInPlural: 'Solved in {count} guesses!',
          gaveUpAfter: 'Gave up after {count} guess',
          gaveUpAfterPlural: 'Gave up after {count} guesses',
          newDaily: 'A new challenge every day!',
          dataProvider: 'Data provided by {source}',
          // Notification messages
          notFound: '{item} not found. Please select from suggestions.',
          alreadyGuessed: 'You already guessed this {item}!',
          noDataAvailable: 'No data available. Please refresh the page.',
          loadError: 'Failed to load data. Please check your connection and refresh.',
          refreshPage: 'Please refresh the page.',
          // Common clue labels
          notNationality: '❌ Nationality:',
          notCountry: '❌ Country:',
          notTeam: '❌ Team:',
          notHand: '❌ Hand:',
          notBackhand: '❌ Backhand:',
          notClass: '❌ Class:',
          notDiet: '❌ Diet:',
          notAuthor: '❌ Author:',
          notGenre: '❌ Genre:',
          notDirector: '❌ Director:',
          notActor: '❌ Actor:'
        },
        stats: {
          gamesPlayed: 'Games Played',
          winPercentage: 'Win %',
          currentStreak: 'Current Streak',
          maxStreak: 'Max Streak',
          bestScore: 'Best Score',
          averageGuesses: 'Avg Guesses',
          correct: 'Correct',
          wrong: 'Wrong'
        },
        games: {
          movies: {
            title: 'Movies Quiz',
            subtitle: 'Guess the movie from the clues',
            inputPlaceholder: 'Type a movie title...',
            cluesSummary: 'Clues Summary',
            director: 'Director',
            directors: 'Directors',
            year: 'Year',
            country: 'Country',
            cast: 'Cast',
            actors: 'Actors',
            rating: 'IMDB',
            runtime: 'Runtime',
            genres: 'Genres',
            loadingMessage: '🎬 Finishing the tournage...',
            newMovieDaily: 'A new movie every day! 🎬',
            dataAttribution: 'Data provided by IMDb API on RapidAPI'
          },
          books: {
            title: 'Books Quiz',
            subtitle: 'Guess the book from the clues',
            inputPlaceholder: 'Type a book title...',
            author: 'Author',
            year: 'Year',
            pages: 'Pages',
            genres: 'Genres'
          },
          music: {
            title: 'Music Quiz',
            subtitle: 'Guess the song from the clues',
            inputPlaceholder: 'Type a song title...',
            artist: 'Artist',
            album: 'Album',
            year: 'Year'
          },
          blindtest: {
            title: 'Blind Test',
            subtitle: 'Listen and guess the song',
            inputPlaceholder: 'Type a song title...',
            displayArtist: 'Display Artist',
            displayArtistDesc: 'Show artist name as a hint',
            multipleChoice: 'Multiple Choice',
            multipleChoiceDesc: 'Pick from 4 options instead of typing',
            round: 'Round',
            matchComplete: 'Match Complete!',
            totalScore: 'Total Score',
            avgTime: 'Avg Time',
            nextMatchSettings: 'Settings for next match:',
            nextMatch: 'Play Random Match',
            startTitle: 'Ready to play?',
            startDesc: 'Listen to 5 song samples and guess the titles. The faster you answer, the more points you get!',
            dailyComplete: "Today's Daily Complete!",
            playRandomDesc: 'You can play as many random matches as you like.',
            loadingMessage: '🎧 Plugging in the headphones...'
          },
          f1: {
            loadingMessage: '🏎️ Warming up the tires...'
          },
          tennis: {
            loadingMessage: '🎾 Stretching up...'
          },
          music: {
            loadingMessage: '🎵 Tuning the instruments...'
          },
          books: {
            loadingMessage: '📚 Opening the library...'
          },
          animal: {
            loadingMessage: '🐾 On safari...'
          },
          fut: {
            loadingMessage: '⚽ Warming up on the pitch...'
          },
          animals: {
            title: 'Animal Quiz',
            subtitle: 'Guess the animal from the clues',
            inputPlaceholder: 'Type an animal name...'
          },
          f1: {
            title: 'F1 Quiz',
            subtitle: 'Guess the F1 driver',
            inputPlaceholder: 'Type a driver name...'
          },
          football: {
            title: 'Football Quiz',
            subtitle: 'Guess the football player',
            inputPlaceholder: 'Type a player name...',
            loadingMessage: '⚽ Warming up on the pitch...',
            cluesSummary: 'Clues Summary',
            age: 'Age',
            height: 'Height',
            nationality: 'Nationality',
            club: 'Club',
            position: 'Position',
            foot: 'Foot',
            worldCup: 'World Cup?',
            leagues: 'Leagues',
            titles: 'Titles',
            notNationality: '❌ Nationality:',
            notClub: '❌ Club:',
            notPosition: '❌ Position:'
          },
          tennis: {
            title: 'Tennis Quiz',
            subtitle: 'Guess the tennis player',
            inputPlaceholder: 'Type a player name...',
            loadingMessage: '🎾 Stretching up...',
            cluesSummary: 'Clues Summary',
            age: 'Age',
            ranking: 'Ranking',
            bestRank: 'Best Rank',
            slams: 'Slams',
            titles: 'Titles',
            proSince: 'Pro Since',
            nationality: 'Nationality',
            hand: 'Hand',
            backhand: 'Backhand',
            notNationality: '❌ Nationality:',
            notHand: '❌ Hand:',
            notBackhand: '❌ Backhand:'
          },
          f1: {
            title: 'F1 Quiz',
            subtitle: 'Guess the F1 driver',
            inputPlaceholder: 'Type a driver name...',
            loadingMessage: '🏎️ Warming up the tires...',
            cluesSummary: 'Clues Summary',
            age: 'Age',
            wdc: 'WDC',
            wins: 'Wins',
            podiums: 'Podiums',
            nationality: 'Nationality',
            team: 'Team',
            teams: 'Teams',
            notNationality: '❌ Nationality:',
            notTeam: '❌ Team:'
          },
          animal: {
            title: 'Animal Quiz',
            subtitle: 'Guess the animal',
            inputPlaceholder: 'Type an animal name...',
            loadingMessage: '🐾 On safari...',
            cluesSummary: 'Clues Summary',
            weight: 'Weight',
            lifespan: 'Lifespan',
            class: 'Class',
            diet: 'Diet',
            activity: 'Activity',
            continents: 'Continents',
            habitats: 'Habitats',
            notClass: '❌ Class:',
            notDiet: '❌ Diet:'
          },
          books: {
            title: 'Books Quiz',
            subtitle: 'Guess the book from the clues',
            inputPlaceholder: 'Type a book title...',
            loadingMessage: '📚 Opening the library...',
            cluesSummary: 'Clues Summary',
            author: 'Author',
            authorFrom: 'Author From',
            year: 'Year',
            pages: 'Pages',
            genre: 'Genre',
            genres: 'Genres',
            language: 'Language',
            notAuthor: '❌ Author:',
            notGenre: '❌ Genre:'
          },
          music: {
            title: 'Music Quiz',
            subtitle: 'Guess the song from the clues',
            inputPlaceholder: 'Type a song title...',
            loadingMessage: '🎵 Tuning the instruments...',
            cluesSummary: 'Clues Summary',
            artist: 'Artist',
            album: 'Album',
            year: 'Year',
            duration: 'Duration',
            genre: 'Genre',
            decade: 'Decade',
            members: 'Members',
            countries: 'Countries',
            notGenre: '❌ Genre:'
          }
        },
        share: {
          copiedToClipboard: 'Copied to clipboard!'
        },
        feedback: {
          title: 'Send Feedback',
          about: 'About:',
          topic: 'Topic:',
          message: 'Your feedback:',
          messagePlaceholder: 'Tell us what you think...',
          email: 'Email (optional):',
          emailPlaceholder: 'your@email.com',
          send: 'Send Feedback',
          sending: 'Sending...',
          success: 'Thank you for your feedback!',
          error: 'Failed to send feedback. Please try again.',
          general: 'General / Website',
          topicBug: 'Bug Report',
          topicSuggestion: 'Suggestion',
          topicData: 'Data Issue',
          topicOther: 'Other'
        },
        pages: {
          backToGames: '← Back to Games',
          home: 'Home',
          about: {
            title: 'About us',
            whatIsTitle: 'What is Snackable Games?',
            whatIsText: 'Snackable Games is a tiny studio that makes compact web games you can enjoy in minutes. We focus on fast load times, mobile friendliness, and simple mechanics: puzzles, quizzes, and micro-games.',
            goalsTitle: 'Our goals',
            goal1: 'Make fun, accessible games that load instantly in your browser.',
            goal2: 'Keep things privacy-respecting and ad-supported (so games stay free).',
            goal3: 'Ship often — small updates, fast experiments, quick learning.',
            whereTitle: 'Where to play',
            whereText: 'The main site is the best place: snackable-games.com. Each game has its own page (like /f1-quiz/ or /sudoku/).',
            contactTitle: 'Contact',
            contactText: 'Want to reach out? Use the Feedback button — we read every message!',
            sendFeedback: '💬 Send Feedback'
          },
          privacy: {
            title: 'Privacy Policy',
            lastUpdated: 'Last updated: January 2026',
            introTitle: 'Introduction',
            introText: 'Snackable Games ("we", "us") provides web games at snackable-games.com. We respect your privacy and aim to be transparent about what data we collect and why.',
            dataTitle: 'Data we collect',
            dataAnalytics: 'Analytics: We use Google Analytics 4 to measure usage (page views, game events). GA4 collects device information and anonymized IP data.',
            dataAds: 'Ads: We use Google AdSense to display ads. AdSense may use cookies to personalize ads and measure performance.',
            cookiesTitle: 'Cookies',
            cookiesText: 'Our site uses cookies and third-party cookies (Google) for analytics and advertising. You can control cookies via your browser settings. Blocking cookies may affect some functionality.',
            adsTxtTitle: 'ads.txt',
            adsTxtText: 'We publish an ads.txt file to declare authorized ad sellers.',
            sharingTitle: 'Sharing',
            sharingText: 'We do not sell personal data. We share aggregated/anonymous analytics with Google. We only disclose data if required by law.',
            feedbackTitle: 'Feedback',
            feedbackText: 'We offer an optional feedback form. If you submit feedback, we collect your message and optionally your email (if you provide it for follow-up).',
            rightsTitle: 'Your rights',
            rightsText: 'Contact us to request access, correction, or deletion of your data:',
            linksTitle: 'Third-party links',
            linksText: 'Our games may link to external sites. We are not responsible for their privacy practices.'
          }
        }
      },
      fr: {
        hub: {
          title: 'Snackable Games',
          subtitle: 'Des jeux rapides et amusants',
          about: 'À propos',
          privacy: 'Confidentialité',
          featured: 'À la une',
          games: {
            blindtest: { title: 'Blind Test', desc: 'Écoutez des extraits et devinez le titre. Testez vos connaissances musicales !' },
            movies: { title: 'Quiz Films', desc: 'Devinez le film grâce aux indices sur le réalisateur, le genre et la note.' },
            f1: { title: 'Quiz F1', desc: 'Devinez le pilote de Formule 1 grâce aux indices sur sa carrière.' },
            fut: { title: 'FutQuiz', desc: 'Devinez le joueur de football grâce aux indices sur sa carrière.' },
            music: { title: 'Quiz Musique', desc: 'Devinez la chanson grâce aux indices sur l\'artiste et l\'époque.' },
            animal: { title: 'Quiz Animaux', desc: 'Devinez l\'animal mystère grâce aux indices sur son habitat et son régime.' },
            sudoku: { title: 'Sudoku', desc: 'Le puzzle de chiffres classique. Design épuré, sans distractions.' },
            tennis: { title: 'Quiz Tennis', desc: 'Devinez le joueur de tennis grâce aux indices sur sa carrière.' },
            books: { title: 'Quiz Livres', desc: 'Devinez le livre classique grâce aux indices sur l\'auteur et la publication.' }
          }
        },
        common: {
          submit: 'Valider',
          guess: 'Deviner',
          skip: 'Passer',
          giveUp: 'Abandonner',
          playAgain: 'Rejouer',
          playRandom: 'Partie aléatoire',
          shareResults: 'Partager',
          nextSong: 'Chanson suivante',
          close: 'Fermer',
          loading: 'Chargement...',
          error: 'Une erreur est survenue',
          correct: 'Correct !',
          wrong: 'Faux !',
          skipped: 'Passé',
          guesses: 'Essais',
          score: 'Score',
          points: 'points',
          streak: 'Série',
          stats: 'Statistiques',
          howToPlay: 'Comment jouer',
          daily: 'Quotidien',
          random: 'Aléatoire',
          startGame: 'Commencer',
          back: 'Retour',
          dailyComplete: 'Le défi du jour est terminé !',
          playingRandom: 'Mode aléatoire.',
          solvedIn: 'Résolu en {count} essai !',
          solvedInPlural: 'Résolu en {count} essais !',
          gaveUpAfter: 'Abandonné après {count} essai',
          gaveUpAfterPlural: 'Abandonné après {count} essais',
          newDaily: 'Un nouveau défi chaque jour !',
          dataProvider: 'Données fournies par {source}',
          notFound: '{item} introuvable. Veuillez sélectionner parmi les suggestions.',
          alreadyGuessed: 'Vous avez déjà deviné ce {item} !',
          noDataAvailable: 'Aucune donnée disponible. Veuillez actualiser la page.',
          loadError: 'Échec du chargement. Vérifiez votre connexion et actualisez.',
          refreshPage: 'Veuillez actualiser la page.',
          notNationality: '❌ Nationalité :',
          notCountry: '❌ Pays :',
          notTeam: '❌ Équipe :',
          notHand: '❌ Main :',
          notBackhand: '❌ Revers :',
          notClass: '❌ Classe :',
          notDiet: '❌ Régime :',
          notAuthor: '❌ Auteur :',
          notGenre: '❌ Genre :',
          notDirector: '❌ Réalisateur :',
          notActor: '❌ Acteur :'
        },
        stats: {
          gamesPlayed: 'Parties jouées',
          winPercentage: '% Victoires',
          currentStreak: 'Série actuelle',
          maxStreak: 'Meilleure série',
          bestScore: 'Meilleur score',
          averageGuesses: 'Moyenne essais',
          correct: 'Correct',
          wrong: 'Faux'
        },
        games: {
          movies: {
            title: 'Quiz Films',
            subtitle: 'Devinez le film à partir des indices',
            inputPlaceholder: 'Tapez un titre de film...',
            cluesSummary: 'Résumé des indices',
            director: 'Réalisateur',
            directors: 'Réalisateurs',
            year: 'Année',
            country: 'Pays',
            cast: 'Casting',
            actors: 'Acteurs',
            rating: 'IMDB',
            runtime: 'Durée',
            genres: 'Genres',
            loadingMessage: '🎬 Fin du tournage...',
            newMovieDaily: 'Un nouveau film chaque jour ! 🎬',
            dataAttribution: 'Données fournies par IMDb API sur RapidAPI'
          },
          books: {
            title: 'Quiz Livres',
            subtitle: 'Devinez le livre à partir des indices',
            inputPlaceholder: 'Tapez un titre de livre...',
            author: 'Auteur',
            year: 'Année',
            pages: 'Pages',
            genres: 'Genres'
          },
          music: {
            title: 'Quiz Musique',
            subtitle: 'Devinez la chanson à partir des indices',
            inputPlaceholder: 'Tapez un titre de chanson...',
            artist: 'Artiste',
            album: 'Album',
            year: 'Année'
          },
          blindtest: {
            title: 'Blind Test',
            subtitle: 'Écoutez et devinez la chanson',
            inputPlaceholder: 'Tapez un titre...',
            displayArtist: 'Afficher l\'artiste',
            displayArtistDesc: 'Affiche le nom de l\'artiste comme indice',
            multipleChoice: 'Choix multiples',
            multipleChoiceDesc: 'Choisissez parmi 4 options',
            round: 'Manche',
            matchComplete: 'Match terminé !',
            totalScore: 'Score total',
            avgTime: 'Temps moyen',
            nextMatchSettings: 'Paramètres pour le prochain match :',
            nextMatch: 'Match aléatoire',
            startTitle: 'Prêt à jouer ?',
            startDesc: 'Écoutez 5 extraits et devinez les titres. Plus vous répondez vite, plus vous gagnez de points !',
            dailyComplete: 'Défi du jour terminé !',
            playRandomDesc: 'Vous pouvez jouer autant de matchs aléatoires que vous voulez.',
            loadingMessage: '🎧 Branchement du casque...'
          },
          f1: {
            loadingMessage: '🏎️ Chauffe des pneus...'
          },
          tennis: {
            loadingMessage: '🎾 Échauffement en cours...'
          },
          music: {
            loadingMessage: '🎵 Accordage des instruments...'
          },
          books: {
            loadingMessage: '📚 Ouverture de la bibliothèque...'
          },
          animal: {
            loadingMessage: '🐾 En safari...'
          },
          fut: {
            loadingMessage: '⚽ Échauffement sur le terrain...'
          },
          animals: {
            title: 'Quiz Animaux',
            subtitle: 'Devinez l\'animal',
            inputPlaceholder: 'Tapez un nom d\'animal...'
          },
          f1: {
            title: 'Quiz F1',
            subtitle: 'Devinez le pilote F1',
            inputPlaceholder: 'Tapez un nom de pilote...'
          },
          football: {
            title: 'Quiz Football',
            subtitle: 'Devinez le joueur',
            inputPlaceholder: 'Tapez un nom de joueur...',
            loadingMessage: '⚽ Échauffement sur le terrain...',
            cluesSummary: 'Résumé des indices',
            age: 'Âge',
            height: 'Taille',
            nationality: 'Nationalité',
            club: 'Club',
            position: 'Position',
            foot: 'Pied',
            worldCup: 'Coupe du Monde ?',
            leagues: 'Ligues',
            titles: 'Titres',
            notNationality: '❌ Nationalité :',
            notClub: '❌ Club :',
            notPosition: '❌ Position :'
          },
          tennis: {
            title: 'Quiz Tennis',
            subtitle: 'Devinez le joueur de tennis',
            inputPlaceholder: 'Tapez un nom de joueur...',
            loadingMessage: '🎾 Échauffement en cours...',
            cluesSummary: 'Résumé des indices',
            age: 'Âge',
            ranking: 'Classement',
            bestRank: 'Meilleur rang',
            slams: 'Grand Chelem',
            titles: 'Titres',
            proSince: 'Pro depuis',
            nationality: 'Nationalité',
            hand: 'Main',
            backhand: 'Revers',
            notNationality: '❌ Nationalité :',
            notHand: '❌ Main :',
            notBackhand: '❌ Revers :'
          }
        },
        share: {
          copiedToClipboard: 'Copié dans le presse-papiers !'
        },
        feedback: {
          title: 'Envoyer un commentaire',
          about: 'À propos de :',
          topic: 'Sujet :',
          message: 'Votre commentaire :',
          messagePlaceholder: 'Dites-nous ce que vous pensez...',
          email: 'Email (optionnel) :',
          emailPlaceholder: 'votre@email.com',
          send: 'Envoyer',
          sending: 'Envoi en cours...',
          success: 'Merci pour votre commentaire !',
          error: 'Échec de l\'envoi. Veuillez réessayer.',
          general: 'Général / Site web',
          topicBug: 'Signaler un bug',
          topicSuggestion: 'Suggestion',
          topicData: 'Problème de données',
          topicOther: 'Autre'
        },
        pages: {
          backToGames: '← Retour aux jeux',
          home: 'Accueil',
          about: {
            title: 'À propos',
            whatIsTitle: 'Qu\'est-ce que Snackable Games ?',
            whatIsText: 'Snackable Games est un petit studio qui crée des jeux web compacts que vous pouvez apprécier en quelques minutes. Nous nous concentrons sur des temps de chargement rapides, la compatibilité mobile et des mécaniques simples : puzzles, quiz et micro-jeux.',
            goalsTitle: 'Nos objectifs',
            goal1: 'Créer des jeux amusants et accessibles qui se chargent instantanément dans votre navigateur.',
            goal2: 'Respecter la vie privée et supporter par la publicité (pour que les jeux restent gratuits).',
            goal3: 'Livrer souvent — petites mises à jour, expériences rapides, apprentissage rapide.',
            whereTitle: 'Où jouer',
            whereText: 'Le site principal est le meilleur endroit : snackable-games.com. Chaque jeu a sa propre page (comme /f1-quiz/ ou /sudoku/).',
            contactTitle: 'Contact',
            contactText: 'Envie de nous contacter ? Utilisez le bouton Feedback — nous lisons chaque message !',
            sendFeedback: '💬 Envoyer un commentaire'
          },
          privacy: {
            title: 'Politique de confidentialité',
            lastUpdated: 'Dernière mise à jour : Janvier 2026',
            introTitle: 'Introduction',
            introText: 'Snackable Games ("nous") fournit des jeux web sur snackable-games.com. Nous respectons votre vie privée et visons à être transparents sur les données que nous collectons et pourquoi.',
            dataTitle: 'Données collectées',
            dataAnalytics: 'Analytiques : Nous utilisons Google Analytics 4 pour mesurer l\'utilisation. GA4 collecte des informations sur l\'appareil et des données IP anonymisées.',
            dataAds: 'Publicités : Nous utilisons Google AdSense pour afficher des publicités. AdSense peut utiliser des cookies pour personnaliser les publicités.',
            cookiesTitle: 'Cookies',
            cookiesText: 'Notre site utilise des cookies et des cookies tiers (Google) pour les analyses et la publicité. Vous pouvez contrôler les cookies via les paramètres de votre navigateur.',
            adsTxtTitle: 'ads.txt',
            adsTxtText: 'Nous publions un fichier ads.txt pour déclarer les vendeurs publicitaires autorisés.',
            sharingTitle: 'Partage',
            sharingText: 'Nous ne vendons pas de données personnelles. Nous partageons des analyses agrégées/anonymes avec Google.',
            feedbackTitle: 'Feedback',
            feedbackText: 'Nous proposons un formulaire de feedback optionnel. Si vous soumettez un feedback, nous collectons votre message et optionnellement votre email.',
            rightsTitle: 'Vos droits',
            rightsText: 'Contactez-nous pour demander l\'accès, la correction ou la suppression de vos données :',
            linksTitle: 'Liens tiers',
            linksText: 'Nos jeux peuvent contenir des liens vers des sites externes. Nous ne sommes pas responsables de leurs pratiques de confidentialité.'
          }
        }
      },
      'pt-br': {
        hub: {
          title: 'Snackable Games',
          subtitle: 'Jogos rápidos e divertidos',
          about: 'Sobre',
          privacy: 'Privacidade',
          featured: 'Destaque',
          games: {
            blindtest: { title: 'Blind Test', desc: 'Ouça trechos de músicas e adivinhe o título. Teste seus conhecimentos!' },
            movies: { title: 'Quiz de Filmes', desc: 'Adivinhe o filme usando dicas sobre diretor, gênero e nota.' },
            f1: { title: 'Quiz F1', desc: 'Adivinhe o piloto de Fórmula 1 usando dicas sobre sua carreira.' },
            fut: { title: 'FutQuiz', desc: 'Adivinhe o jogador de futebol usando dicas sobre sua carreira.' },
            music: { title: 'Quiz de Música', desc: 'Adivinhe a música usando dicas sobre artista, gênero e época.' },
            animal: { title: 'Quiz de Animais', desc: 'Adivinhe o animal misterioso usando dicas sobre habitat e dieta.' },
            sudoku: { title: 'Sudoku', desc: 'O clássico puzzle de números. Design limpo, sem distrações.' },
            tennis: { title: 'Quiz de Tênis', desc: 'Adivinhe o jogador de tênis usando dicas sobre sua carreira.' },
            books: { title: 'Quiz de Livros', desc: 'Adivinhe o livro clássico usando dicas sobre autor e publicação.' }
          }
        },
        common: {
          submit: 'Enviar',
          guess: 'Adivinhar',
          skip: 'Pular',
          giveUp: 'Desistir',
          playAgain: 'Jogar novamente',
          playRandom: 'Jogo aleatório',
          shareResults: 'Compartilhar',
          nextSong: 'Próxima música',
          close: 'Fechar',
          loading: 'Carregando...',
          error: 'Ocorreu um erro',
          correct: 'Correto!',
          wrong: 'Errado!',
          skipped: 'Pulado',
          guesses: 'Tentativas',
          score: 'Pontuação',
          points: 'pontos',
          streak: 'Sequência',
          stats: 'Estatísticas',
          howToPlay: 'Como jogar',
          daily: 'Diário',
          random: 'Aleatório',
          startGame: 'Começar',
          back: 'Voltar',
          dailyComplete: 'O desafio de hoje está completo!',
          playingRandom: 'Modo aleatório.',
          solvedIn: 'Resolvido em {count} tentativa!',
          solvedInPlural: 'Resolvido em {count} tentativas!',
          gaveUpAfter: 'Desistiu após {count} tentativa',
          gaveUpAfterPlural: 'Desistiu após {count} tentativas',
          newDaily: 'Um novo desafio todo dia!',
          dataProvider: 'Dados fornecidos por {source}',
          notFound: '{item} não encontrado. Por favor, selecione das sugestões.',
          alreadyGuessed: 'Você já tentou esse {item}!',
          noDataAvailable: 'Dados indisponíveis. Por favor, atualize a página.',
          loadError: 'Falha ao carregar dados. Verifique sua conexão e atualize.',
          refreshPage: 'Por favor, atualize a página.',
          notNationality: '❌ Nacionalidade:',
          notCountry: '❌ País:',
          notTeam: '❌ Equipe:',
          notHand: '❌ Mão:',
          notBackhand: '❌ Backhand:',
          notClass: '❌ Classe:',
          notDiet: '❌ Dieta:',
          notAuthor: '❌ Autor:',
          notGenre: '❌ Gênero:',
          notDirector: '❌ Diretor:',
          notActor: '❌ Ator:'
        },
        stats: {
          gamesPlayed: 'Jogos',
          winPercentage: '% Vitórias',
          currentStreak: 'Sequência atual',
          maxStreak: 'Melhor sequência',
          bestScore: 'Melhor pontuação',
          averageGuesses: 'Média de tentativas',
          correct: 'Correto',
          wrong: 'Errado'
        },
        games: {
          movies: {
            title: 'Quiz de Filmes',
            subtitle: 'Adivinhe o filme pelas dicas',
            inputPlaceholder: 'Digite o título do filme...',
            cluesSummary: 'Resumo das dicas',
            director: 'Diretor',
            directors: 'Diretores',
            year: 'Ano',
            country: 'País',
            cast: 'Elenco',
            actors: 'Atores',
            rating: 'IMDB',
            runtime: 'Duração',
            genres: 'Gêneros',
            loadingMessage: '🎬 Finalizando as filmagens...',
            newMovieDaily: 'Um novo filme todo dia! 🎬',
            dataAttribution: 'Dados fornecidos por IMDb API no RapidAPI'
          },
          books: {
            title: 'Quiz de Livros',
            subtitle: 'Adivinhe o livro pelas dicas',
            inputPlaceholder: 'Digite o título do livro...',
            author: 'Autor',
            year: 'Ano',
            pages: 'Páginas',
            genres: 'Gêneros'
          },
          music: {
            title: 'Quiz de Música',
            subtitle: 'Adivinhe a música pelas dicas',
            inputPlaceholder: 'Digite o título da música...',
            artist: 'Artista',
            album: 'Álbum',
            year: 'Ano'
          },
          blindtest: {
            title: 'Blind Test',
            subtitle: 'Ouça e adivinhe a música',
            inputPlaceholder: 'Digite o título...',
            displayArtist: 'Exibir Artista',
            displayArtistDesc: 'Mostra o nome do artista como dica',
            multipleChoice: 'Múltipla escolha',
            multipleChoiceDesc: 'Escolha entre 4 opções',
            round: 'Rodada',
            matchComplete: 'Partida completa!',
            totalScore: 'Pontuação total',
            avgTime: 'Tempo médio',
            nextMatchSettings: 'Configurações para a próxima partida:',
            nextMatch: 'Partida aleatória',
            startTitle: 'Pronto para jogar?',
            startDesc: 'Ouça 5 trechos e adivinhe os títulos. Quanto mais rápido responder, mais pontos você ganha!',
            dailyComplete: 'Desafio diário completo!',
            playRandomDesc: 'Você pode jogar quantas partidas aleatórias quiser.',
            loadingMessage: '🎧 Conectando os fones...'
          },
          f1: {
            loadingMessage: '🏎️ Aquecendo os pneus...'
          },
          tennis: {
            loadingMessage: '🎾 Aquecendo...'
          },
          music: {
            loadingMessage: '🎵 Afinando os instrumentos...'
          },
          books: {
            loadingMessage: '📚 Abrindo a biblioteca...'
          },
          animal: {
            loadingMessage: '🐾 Em safári...'
          },
          fut: {
            loadingMessage: '⚽ Aquecendo em campo...'
          },
          animals: {
            title: 'Quiz de Animais',
            subtitle: 'Adivinhe o animal',
            inputPlaceholder: 'Digite o nome do animal...'
          },
          f1: {
            title: 'Quiz de F1',
            subtitle: 'Adivinhe o piloto de F1',
            inputPlaceholder: 'Digite o nome do piloto...'
          },
          football: {
            title: 'Quiz de Futebol',
            subtitle: 'Adivinhe o jogador',
            inputPlaceholder: 'Digite o nome do jogador...',
            loadingMessage: '⚽ Aquecendo em campo...',
            cluesSummary: 'Resumo das Pistas',
            age: 'Idade',
            height: 'Altura',
            nationality: 'Nacionalidade',
            club: 'Clube',
            position: 'Posição',
            foot: 'Pé',
            worldCup: 'Copa do Mundo?',
            leagues: 'Ligas',
            titles: 'Títulos',
            notNationality: '❌ Nacionalidade:',
            notClub: '❌ Clube:',
            notPosition: '❌ Posição:'
          },
          tennis: {
            title: 'Quiz de Tênis',
            subtitle: 'Adivinhe o tenista',
            inputPlaceholder: 'Digite o nome do jogador...',
            loadingMessage: '🎾 Aquecendo...',
            cluesSummary: 'Resumo das Pistas',
            age: 'Idade',
            ranking: 'Ranking',
            bestRank: 'Melhor Ranking',
            slams: 'Grand Slams',
            titles: 'Títulos',
            proSince: 'Profissional desde',
            nationality: 'Nacionalidade',
            hand: 'Mão',
            backhand: 'Backhand',
            notNationality: '❌ Nacionalidade:',
            notHand: '❌ Mão:',
            notBackhand: '❌ Backhand:'
          }
        },
        share: {
          copiedToClipboard: 'Copiado para a área de transferência!'
        },
        feedback: {
          title: 'Enviar Feedback',
          about: 'Sobre:',
          topic: 'Assunto:',
          message: 'Seu feedback:',
          messagePlaceholder: 'Conte-nos o que você pensa...',
          email: 'Email (opcional):',
          emailPlaceholder: 'seu@email.com',
          send: 'Enviar Feedback',
          sending: 'Enviando...',
          success: 'Obrigado pelo seu feedback!',
          error: 'Falha ao enviar. Por favor, tente novamente.',
          general: 'Geral / Site',
          topicBug: 'Reportar Bug',
          topicSuggestion: 'Sugestão',
          topicData: 'Problema de Dados',
          topicOther: 'Outro'
        },
        pages: {
          backToGames: '← Voltar aos Jogos',
          home: 'Início',
          about: {
            title: 'Sobre nós',
            whatIsTitle: 'O que é Snackable Games?',
            whatIsText: 'Snackable Games é um pequeno estúdio que cria jogos web compactos que você pode aproveitar em minutos. Focamos em carregamento rápido, compatibilidade móvel e mecânicas simples: puzzles, quizzes e micro-jogos.',
            goalsTitle: 'Nossos objetivos',
            goal1: 'Criar jogos divertidos e acessíveis que carregam instantaneamente no seu navegador.',
            goal2: 'Manter o respeito à privacidade e suporte por publicidade (para que os jogos permaneçam gratuitos).',
            goal3: 'Lançar frequentemente — pequenas atualizações, experimentos rápidos, aprendizado rápido.',
            whereTitle: 'Onde jogar',
            whereText: 'O site principal é o melhor lugar: snackable-games.com. Cada jogo tem sua própria página (como /f1-quiz/ ou /sudoku/).',
            contactTitle: 'Contato',
            contactText: 'Quer entrar em contato? Use o botão Feedback — lemos cada mensagem!',
            sendFeedback: '💬 Enviar Feedback'
          },
          privacy: {
            title: 'Política de Privacidade',
            lastUpdated: 'Última atualização: Janeiro 2026',
            introTitle: 'Introdução',
            introText: 'Snackable Games ("nós") fornece jogos web em snackable-games.com. Respeitamos sua privacidade e buscamos ser transparentes sobre quais dados coletamos e por quê.',
            dataTitle: 'Dados coletados',
            dataAnalytics: 'Analytics: Usamos Google Analytics 4 para medir o uso. GA4 coleta informações do dispositivo e dados de IP anonimizados.',
            dataAds: 'Anúncios: Usamos Google AdSense para exibir anúncios. AdSense pode usar cookies para personalizar anúncios.',
            cookiesTitle: 'Cookies',
            cookiesText: 'Nosso site usa cookies e cookies de terceiros (Google) para analytics e publicidade. Você pode controlar cookies nas configurações do navegador.',
            adsTxtTitle: 'ads.txt',
            adsTxtText: 'Publicamos um arquivo ads.txt para declarar vendedores de anúncios autorizados.',
            sharingTitle: 'Compartilhamento',
            sharingText: 'Não vendemos dados pessoais. Compartilhamos analytics agregados/anônimos com o Google.',
            feedbackTitle: 'Feedback',
            feedbackText: 'Oferecemos um formulário de feedback opcional. Se você enviar feedback, coletamos sua mensagem e opcionalmente seu email.',
            rightsTitle: 'Seus direitos',
            rightsText: 'Entre em contato para solicitar acesso, correção ou exclusão de seus dados:',
            linksTitle: 'Links de terceiros',
            linksText: 'Nossos jogos podem ter links para sites externos. Não somos responsáveis por suas práticas de privacidade.'
          }
        }
      },
      it: {
        hub: {
          title: 'Snackable Games',
          subtitle: 'Giochi veloci e divertenti',
          about: 'Chi siamo',
          privacy: 'Privacy',
          featured: 'In evidenza',
          games: {
            blindtest: { title: 'Blind Test', desc: 'Ascolta estratti musicali e indovina il titolo. Metti alla prova le tue conoscenze!' },
            movies: { title: 'Quiz Film', desc: 'Indovina il film usando indizi su regista, genere e valutazione.' },
            f1: { title: 'Quiz F1', desc: 'Indovina il pilota di Formula 1 usando indizi sulla sua carriera.' },
            fut: { title: 'FutQuiz', desc: 'Indovina il calciatore usando indizi sulla sua carriera.' },
            music: { title: 'Quiz Musica', desc: 'Indovina la canzone usando indizi su artista, genere ed epoca.' },
            animal: { title: 'Quiz Animali', desc: 'Indovina l\'animale misterioso usando indizi su habitat e dieta.' },
            sudoku: { title: 'Sudoku', desc: 'Il classico puzzle numerico. Design pulito, senza distrazioni.' },
            tennis: { title: 'Quiz Tennis', desc: 'Indovina il tennista usando indizi sulla sua carriera.' },
            books: { title: 'Quiz Libri', desc: 'Indovina il libro classico usando indizi su autore e pubblicazione.' }
          }
        },
        common: {
          submit: 'Invia',
          guess: 'Indovina',
          skip: 'Salta',
          giveUp: 'Arrendersi',
          playAgain: 'Gioca ancora',
          playRandom: 'Partita casuale',
          shareResults: 'Condividi',
          nextSong: 'Prossima canzone',
          close: 'Chiudi',
          loading: 'Caricamento...',
          error: 'Si è verificato un errore',
          correct: 'Corretto!',
          wrong: 'Sbagliato!',
          skipped: 'Saltato',
          guesses: 'Tentativi',
          score: 'Punteggio',
          points: 'punti',
          streak: 'Serie',
          stats: 'Statistiche',
          howToPlay: 'Come giocare',
          daily: 'Giornaliero',
          random: 'Casuale',
          startGame: 'Inizia',
          back: 'Indietro',
          dailyComplete: 'La sfida di oggi è completa!',
          playingRandom: 'Modalità casuale.',
          solvedIn: 'Risolto in {count} tentativo!',
          solvedInPlural: 'Risolto in {count} tentativi!',
          gaveUpAfter: 'Arreso dopo {count} tentativo',
          gaveUpAfterPlural: 'Arreso dopo {count} tentativi',
          newDaily: 'Una nuova sfida ogni giorno!',
          dataProvider: 'Dati forniti da {source}',
          notFound: '{item} non trovato. Seleziona dai suggerimenti.',
          alreadyGuessed: 'Hai già provato questo {item}!',
          noDataAvailable: 'Dati non disponibili. Aggiorna la pagina.',
          loadError: 'Caricamento fallito. Controlla la connessione e aggiorna.',
          refreshPage: 'Aggiorna la pagina.',
          notNationality: '❌ Nazionalità:',
          notCountry: '❌ Paese:',
          notTeam: '❌ Squadra:',
          notHand: '❌ Mano:',
          notBackhand: '❌ Rovescio:',
          notClass: '❌ Classe:',
          notDiet: '❌ Dieta:',
          notAuthor: '❌ Autore:',
          notGenre: '❌ Genere:',
          notDirector: '❌ Regista:',
          notActor: '❌ Attore:'
        },
        stats: {
          gamesPlayed: 'Partite',
          winPercentage: '% Vittorie',
          currentStreak: 'Serie attuale',
          maxStreak: 'Serie migliore',
          bestScore: 'Miglior punteggio',
          averageGuesses: 'Media tentativi',
          correct: 'Corretto',
          wrong: 'Sbagliato'
        },
        games: {
          movies: {
            title: 'Quiz Film',
            subtitle: 'Indovina il film dagli indizi',
            inputPlaceholder: 'Scrivi il titolo del film...',
            cluesSummary: 'Riepilogo indizi',
            director: 'Regista',
            directors: 'Registi',
            year: 'Anno',
            country: 'Paese',
            cast: 'Cast',
            actors: 'Attori',
            rating: 'IMDB',
            runtime: 'Durata',
            genres: 'Generi',
            loadingMessage: '🎬 Fine delle riprese...',
            newMovieDaily: 'Un nuovo film ogni giorno! 🎬',
            dataAttribution: 'Dati forniti da IMDb API su RapidAPI'
          },
          books: {
            title: 'Quiz Libri',
            subtitle: 'Indovina il libro dagli indizi',
            inputPlaceholder: 'Scrivi il titolo del libro...',
            author: 'Autore',
            year: 'Anno',
            pages: 'Pagine',
            genres: 'Generi'
          },
          music: {
            title: 'Quiz Musica',
            subtitle: 'Indovina la canzone dagli indizi',
            inputPlaceholder: 'Scrivi il titolo della canzone...',
            artist: 'Artista',
            album: 'Album',
            year: 'Anno'
          },
          blindtest: {
            title: 'Blind Test',
            subtitle: 'Ascolta e indovina la canzone',
            inputPlaceholder: 'Scrivi il titolo...',
            displayArtist: 'Mostra Artista',
            displayArtistDesc: 'Mostra il nome dell\'artista come suggerimento',
            multipleChoice: 'Scelta multipla',
            multipleChoiceDesc: 'Scegli tra 4 opzioni',
            round: 'Round',
            matchComplete: 'Match completo!',
            totalScore: 'Punteggio totale',
            avgTime: 'Tempo medio',
            nextMatchSettings: 'Impostazioni per il prossimo match:',
            nextMatch: 'Match casuale',
            startTitle: 'Pronto a giocare?',
            startDesc: 'Ascolta 5 estratti e indovina i titoli. Più veloce rispondi, più punti guadagni!',
            dailyComplete: 'Sfida giornaliera completata!',
            playRandomDesc: 'Puoi giocare quanti match casuali vuoi.',
            loadingMessage: '🎧 Collegando le cuffie...'
          },
          f1: {
            loadingMessage: '🏎️ Riscaldando le gomme...'
          },
          tennis: {
            loadingMessage: '🎾 Riscaldamento...'
          },
          music: {
            loadingMessage: '🎵 Accordando gli strumenti...'
          },
          books: {
            loadingMessage: '📚 Aprendo la biblioteca...'
          },
          animal: {
            loadingMessage: '🐾 In safari...'
          },
          fut: {
            loadingMessage: '⚽ Riscaldamento in campo...'
          },
          animals: {
            title: 'Quiz Animali',
            subtitle: 'Indovina l\'animale',
            inputPlaceholder: 'Scrivi il nome dell\'animale...'
          },
          f1: {
            title: 'Quiz F1',
            subtitle: 'Indovina il pilota F1',
            inputPlaceholder: 'Scrivi il nome del pilota...'
          },
          football: {
            title: 'Quiz Calcio',
            subtitle: 'Indovina il calciatore',
            inputPlaceholder: 'Scrivi il nome del giocatore...',
            loadingMessage: '⚽ Riscaldamento in campo...',
            cluesSummary: 'Riepilogo indizi',
            age: 'Età',
            height: 'Altezza',
            nationality: 'Nazionalità',
            club: 'Club',
            position: 'Posizione',
            foot: 'Piede',
            worldCup: 'Coppa del Mondo?',
            leagues: 'Campionati',
            titles: 'Titoli',
            notNationality: '❌ Nazionalità:',
            notClub: '❌ Club:',
            notPosition: '❌ Posizione:'
          },
          tennis: {
            title: 'Quiz Tennis',
            subtitle: 'Indovina il tennista',
            inputPlaceholder: 'Scrivi il nome del giocatore...',
            loadingMessage: '🎾 Riscaldamento...',
            cluesSummary: 'Riepilogo indizi',
            age: 'Età',
            ranking: 'Classifica',
            bestRank: 'Miglior ranking',
            slams: 'Slam',
            titles: 'Titoli',
            proSince: 'Pro dal',
            nationality: 'Nazionalità',
            hand: 'Mano',
            backhand: 'Rovescio',
            notNationality: '❌ Nazionalità:',
            notHand: '❌ Mano:',
            notBackhand: '❌ Rovescio:'
          }
        },
        share: {
          copiedToClipboard: 'Copiato negli appunti!'
        },
        feedback: {
          title: 'Invia Feedback',
          about: 'Riguardo a:',
          topic: 'Argomento:',
          message: 'Il tuo feedback:',
          messagePlaceholder: 'Dicci cosa ne pensi...',
          email: 'Email (opzionale):',
          emailPlaceholder: 'tua@email.com',
          send: 'Invia Feedback',
          sending: 'Invio in corso...',
          success: 'Grazie per il tuo feedback!',
          error: 'Invio fallito. Per favore riprova.',
          general: 'Generale / Sito web',
          topicBug: 'Segnala Bug',
          topicSuggestion: 'Suggerimento',
          topicData: 'Problema Dati',
          topicOther: 'Altro'
        },
        pages: {
          backToGames: '← Torna ai Giochi',
          home: 'Home',
          about: {
            title: 'Chi siamo',
            whatIsTitle: 'Cos\'è Snackable Games?',
            whatIsText: 'Snackable Games è un piccolo studio che crea giochi web compatti che puoi goderti in pochi minuti. Ci concentriamo su tempi di caricamento rapidi, compatibilità mobile e meccaniche semplici: puzzle, quiz e micro-giochi.',
            goalsTitle: 'I nostri obiettivi',
            goal1: 'Creare giochi divertenti e accessibili che si caricano istantaneamente nel browser.',
            goal2: 'Rispettare la privacy e supportarci con la pubblicità (così i giochi rimangono gratuiti).',
            goal3: 'Rilasciare spesso — piccoli aggiornamenti, esperimenti rapidi, apprendimento veloce.',
            whereTitle: 'Dove giocare',
            whereText: 'Il sito principale è il posto migliore: snackable-games.com. Ogni gioco ha la sua pagina (come /f1-quiz/ o /sudoku/).',
            contactTitle: 'Contatto',
            contactText: 'Vuoi contattarci? Usa il pulsante Feedback — leggiamo ogni messaggio!',
            sendFeedback: '💬 Invia Feedback'
          },
          privacy: {
            title: 'Informativa sulla Privacy',
            lastUpdated: 'Ultimo aggiornamento: Gennaio 2026',
            introTitle: 'Introduzione',
            introText: 'Snackable Games ("noi") fornisce giochi web su snackable-games.com. Rispettiamo la tua privacy e miriamo a essere trasparenti sui dati che raccogliamo e perché.',
            dataTitle: 'Dati raccolti',
            dataAnalytics: 'Analytics: Utilizziamo Google Analytics 4 per misurare l\'utilizzo. GA4 raccoglie informazioni sul dispositivo e dati IP anonimizzati.',
            dataAds: 'Pubblicità: Utilizziamo Google AdSense per mostrare annunci. AdSense può utilizzare cookie per personalizzare gli annunci.',
            cookiesTitle: 'Cookie',
            cookiesText: 'Il nostro sito utilizza cookie e cookie di terze parti (Google) per analytics e pubblicità. Puoi controllare i cookie tramite le impostazioni del browser.',
            adsTxtTitle: 'ads.txt',
            adsTxtText: 'Pubblichiamo un file ads.txt per dichiarare i venditori pubblicitari autorizzati.',
            sharingTitle: 'Condivisione',
            sharingText: 'Non vendiamo dati personali. Condividiamo analytics aggregati/anonimi con Google.',
            feedbackTitle: 'Feedback',
            feedbackText: 'Offriamo un modulo di feedback opzionale. Se invii un feedback, raccogliamo il tuo messaggio e opzionalmente la tua email.',
            rightsTitle: 'I tuoi diritti',
            rightsText: 'Contattaci per richiedere accesso, correzione o cancellazione dei tuoi dati:',
            linksTitle: 'Link di terze parti',
            linksText: 'I nostri giochi potrebbero contenere link a siti esterni. Non siamo responsabili delle loro pratiche sulla privacy.'
          }
        }
      },
      es: {
        hub: {
          title: 'Snackable Games',
          subtitle: 'Juegos rápidos y divertidos',
          about: 'Acerca de',
          privacy: 'Privacidad',
          featured: 'Destacado',
          games: {
            blindtest: { title: 'Blind Test', desc: 'Escucha fragmentos de canciones y adivina el título. ¡Pon a prueba tus conocimientos!' },
            movies: { title: 'Quiz de Películas', desc: 'Adivina la película usando pistas sobre director, género y puntuación.' },
            f1: { title: 'Quiz F1', desc: 'Adivina el piloto de Fórmula 1 usando pistas sobre su carrera.' },
            fut: { title: 'FutQuiz', desc: 'Adivina el jugador de fútbol usando pistas sobre su carrera.' },
            music: { title: 'Quiz de Música', desc: 'Adivina la canción usando pistas sobre artista, género y época.' },
            animal: { title: 'Quiz de Animales', desc: 'Adivina el animal misterioso usando pistas sobre hábitat y dieta.' },
            sudoku: { title: 'Sudoku', desc: 'El clásico puzzle numérico. Diseño limpio, sin distracciones.' },
            tennis: { title: 'Quiz de Tenis', desc: 'Adivina el tenista usando pistas sobre su carrera.' },
            books: { title: 'Quiz de Libros', desc: 'Adivina el libro clásico usando pistas sobre autor y publicación.' }
          }
        },
        common: {
          submit: 'Enviar',
          guess: 'Adivinar',
          skip: 'Saltar',
          giveUp: 'Rendirse',
          playAgain: 'Jugar de nuevo',
          playRandom: 'Partida aleatoria',
          shareResults: 'Compartir',
          nextSong: 'Siguiente canción',
          close: 'Cerrar',
          loading: 'Cargando...',
          error: 'Ha ocurrido un error',
          correct: '¡Correcto!',
          wrong: '¡Incorrecto!',
          skipped: 'Saltado',
          guesses: 'Intentos',
          score: 'Puntuación',
          points: 'puntos',
          streak: 'Racha',
          stats: 'Estadísticas',
          howToPlay: 'Cómo jugar',
          daily: 'Diario',
          random: 'Aleatorio',
          startGame: 'Empezar',
          back: 'Volver',
          dailyComplete: '¡El reto de hoy está completo!',
          playingRandom: 'Modo aleatorio.',
          solvedIn: '¡Resuelto en {count} intento!',
          solvedInPlural: '¡Resuelto en {count} intentos!',
          gaveUpAfter: 'Rendido después de {count} intento',
          gaveUpAfterPlural: 'Rendido después de {count} intentos',
          newDaily: '¡Un nuevo reto cada día!',
          dataProvider: 'Datos proporcionados por {source}',
          notFound: '{item} no encontrado. Selecciona de las sugerencias.',
          alreadyGuessed: '¡Ya intentaste este {item}!',
          noDataAvailable: 'Datos no disponibles. Actualiza la página.',
          loadError: 'Error al cargar datos. Verifica tu conexión y actualiza.',
          refreshPage: 'Por favor, actualiza la página.',
          notNationality: '❌ Nacionalidad:',
          notCountry: '❌ País:',
          notTeam: '❌ Equipo:',
          notHand: '❌ Mano:',
          notBackhand: '❌ Revés:',
          notClass: '❌ Clase:',
          notDiet: '❌ Dieta:',
          notAuthor: '❌ Autor:',
          notGenre: '❌ Género:',
          notDirector: '❌ Director:',
          notActor: '❌ Actor:'
        },
        stats: {
          gamesPlayed: 'Partidas',
          winPercentage: '% Victorias',
          currentStreak: 'Racha actual',
          maxStreak: 'Mejor racha',
          bestScore: 'Mejor puntuación',
          averageGuesses: 'Media de intentos',
          correct: 'Correcto',
          wrong: 'Incorrecto'
        },
        games: {
          movies: {
            title: 'Quiz de Películas',
            subtitle: 'Adivina la película por las pistas',
            inputPlaceholder: 'Escribe el título de la película...',
            cluesSummary: 'Resumen de pistas',
            director: 'Director',
            directors: 'Directores',
            year: 'Año',
            country: 'País',
            cast: 'Reparto',
            actors: 'Actores',
            rating: 'IMDB',
            runtime: 'Duración',
            genres: 'Géneros',
            loadingMessage: '🎬 Finalizando el rodaje...',
            newMovieDaily: '¡Una nueva película cada día! 🎬',
            dataAttribution: 'Datos proporcionados por IMDb API en RapidAPI'
          },
          books: {
            title: 'Quiz de Libros',
            subtitle: 'Adivina el libro por las pistas',
            inputPlaceholder: 'Escribe el título del libro...',
            author: 'Autor',
            year: 'Año',
            pages: 'Páginas',
            genres: 'Géneros'
          },
          music: {
            title: 'Quiz de Música',
            subtitle: 'Adivina la canción por las pistas',
            inputPlaceholder: 'Escribe el título de la canción...',
            artist: 'Artista',
            album: 'Álbum',
            year: 'Año'
          },
          blindtest: {
            title: 'Blind Test',
            subtitle: 'Escucha y adivina la canción',
            inputPlaceholder: 'Escribe el título...',
            displayArtist: 'Mostrar Artista',
            displayArtistDesc: 'Muestra el nombre del artista como pista',
            multipleChoice: 'Opción múltiple',
            multipleChoiceDesc: 'Elige entre 4 opciones',
            round: 'Ronda',
            matchComplete: '¡Partida completa!',
            totalScore: 'Puntuación total',
            avgTime: 'Tiempo promedio',
            nextMatchSettings: 'Configuración para la próxima partida:',
            nextMatch: 'Partida aleatoria',
            startTitle: '¿Listo para jugar?',
            startDesc: 'Escucha 5 fragmentos y adivina los títulos. ¡Cuanto más rápido respondas, más puntos ganas!',
            dailyComplete: '¡Desafío diario completado!',
            playRandomDesc: 'Puedes jugar tantas partidas aleatorias como quieras.',
            loadingMessage: '🎧 Conectando los auriculares...'
          },
          f1: {
            loadingMessage: '🏎️ Calentando los neumáticos...'
          },
          tennis: {
            loadingMessage: '🎾 Calentando...'
          },
          music: {
            loadingMessage: '🎵 Afinando los instrumentos...'
          },
          books: {
            loadingMessage: '📚 Abriendo la biblioteca...'
          },
          animal: {
            loadingMessage: '🐾 En safari...'
          },
          fut: {
            loadingMessage: '⚽ Calentando en el campo...'
          },
          animals: {
            title: 'Quiz de Animales',
            subtitle: 'Adivina el animal',
            inputPlaceholder: 'Escribe el nombre del animal...'
          },
          f1: {
            title: 'Quiz de F1',
            subtitle: 'Adivina el piloto de F1',
            inputPlaceholder: 'Escribe el nombre del piloto...'
          },
          football: {
            title: 'Quiz de Fútbol',
            subtitle: 'Adivina el jugador',
            inputPlaceholder: 'Escribe el nombre del jugador...',
            loadingMessage: '⚽ Calentando en el campo...',
            cluesSummary: 'Resumen de pistas',
            age: 'Edad',
            height: 'Altura',
            nationality: 'Nacionalidad',
            club: 'Club',
            position: 'Posición',
            foot: 'Pie',
            worldCup: '¿Copa del Mundo?',
            leagues: 'Ligas',
            titles: 'Títulos',
            notNationality: '❌ Nacionalidad:',
            notClub: '❌ Club:',
            notPosition: '❌ Posición:'
          },
          tennis: {
            title: 'Quiz de Tenis',
            subtitle: 'Adivina el tenista',
            inputPlaceholder: 'Escribe el nombre del jugador...',
            loadingMessage: '🎾 Calentando...',
            cluesSummary: 'Resumen de pistas',
            age: 'Edad',
            ranking: 'Ranking',
            bestRank: 'Mejor ranking',
            slams: 'Grand Slams',
            titles: 'Títulos',
            proSince: 'Pro desde',
            nationality: 'Nacionalidad',
            hand: 'Mano',
            backhand: 'Revés',
            notNationality: '❌ Nacionalidad:',
            notHand: '❌ Mano:',
            notBackhand: '❌ Revés:'
          }
        },
        share: {
          copiedToClipboard: '¡Copiado al portapapeles!'
        },
        feedback: {
          title: 'Enviar Comentario',
          about: 'Sobre:',
          topic: 'Tema:',
          message: 'Tu comentario:',
          messagePlaceholder: 'Cuéntanos lo que piensas...',
          email: 'Email (opcional):',
          emailPlaceholder: 'tu@email.com',
          send: 'Enviar Comentario',
          sending: 'Enviando...',
          success: '¡Gracias por tu comentario!',
          error: 'Error al enviar. Por favor, inténtalo de nuevo.',
          general: 'General / Sitio web',
          topicBug: 'Reportar Error',
          topicSuggestion: 'Sugerencia',
          topicData: 'Problema de Datos',
          topicOther: 'Otro'
        },
        pages: {
          backToGames: '← Volver a los Juegos',
          home: 'Inicio',
          about: {
            title: 'Sobre nosotros',
            whatIsTitle: '¿Qué es Snackable Games?',
            whatIsText: 'Snackable Games es un pequeño estudio que crea juegos web compactos que puedes disfrutar en minutos. Nos enfocamos en tiempos de carga rápidos, compatibilidad móvil y mecánicas simples: puzzles, quizzes y micro-juegos.',
            goalsTitle: 'Nuestros objetivos',
            goal1: 'Crear juegos divertidos y accesibles que cargan instantáneamente en tu navegador.',
            goal2: 'Mantener el respeto a la privacidad y soporte por publicidad (para que los juegos sean gratuitos).',
            goal3: 'Lanzar frecuentemente — pequeñas actualizaciones, experimentos rápidos, aprendizaje rápido.',
            whereTitle: 'Dónde jugar',
            whereText: 'El sitio principal es el mejor lugar: snackable-games.com. Cada juego tiene su propia página (como /f1-quiz/ o /sudoku/).',
            contactTitle: 'Contacto',
            contactText: '¿Quieres contactarnos? Usa el botón Feedback — ¡leemos cada mensaje!',
            sendFeedback: '💬 Enviar Comentario'
          },
          privacy: {
            title: 'Política de Privacidad',
            lastUpdated: 'Última actualización: Enero 2026',
            introTitle: 'Introducción',
            introText: 'Snackable Games ("nosotros") proporciona juegos web en snackable-games.com. Respetamos tu privacidad y buscamos ser transparentes sobre qué datos recopilamos y por qué.',
            dataTitle: 'Datos recopilados',
            dataAnalytics: 'Analytics: Usamos Google Analytics 4 para medir el uso. GA4 recopila información del dispositivo y datos IP anonimizados.',
            dataAds: 'Anuncios: Usamos Google AdSense para mostrar anuncios. AdSense puede usar cookies para personalizar anuncios.',
            cookiesTitle: 'Cookies',
            cookiesText: 'Nuestro sitio usa cookies y cookies de terceros (Google) para analytics y publicidad. Puedes controlar las cookies en la configuración del navegador.',
            adsTxtTitle: 'ads.txt',
            adsTxtText: 'Publicamos un archivo ads.txt para declarar vendedores de anuncios autorizados.',
            sharingTitle: 'Compartir',
            sharingText: 'No vendemos datos personales. Compartimos analytics agregados/anónimos con Google.',
            feedbackTitle: 'Feedback',
            feedbackText: 'Ofrecemos un formulario de feedback opcional. Si envías feedback, recopilamos tu mensaje y opcionalmente tu email.',
            rightsTitle: 'Tus derechos',
            rightsText: 'Contáctanos para solicitar acceso, corrección o eliminación de tus datos:',
            linksTitle: 'Enlaces de terceros',
            linksText: 'Nuestros juegos pueden contener enlaces a sitios externos. No somos responsables de sus prácticas de privacidad.'
          }
        }
      }
    };

    return translations[locale] || translations.en;
  }
}

// Export for use in games
window.I18n = I18n;
