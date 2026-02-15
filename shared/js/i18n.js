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
          averageGuesses: 'Avg Guesses'
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
        }
      },
      fr: {
        hub: {
          title: 'Snackable Games',
          subtitle: 'Des jeux rapides et amusants',
          about: 'A propos',
          privacy: 'Confidentialite',
          featured: 'A la une',
          games: {
            blindtest: { title: 'Blind Test', desc: 'Ecoutez des extraits et devinez le titre. Testez vos connaissances musicales !' },
            movies: { title: 'Quiz Films', desc: 'Devinez le film grace aux indices sur le realisateur, le genre et la note.' },
            f1: { title: 'Quiz F1', desc: 'Devinez le pilote de Formule 1 grace aux indices sur sa carriere.' },
            fut: { title: 'FutQuiz', desc: 'Devinez le joueur de football grace aux indices sur sa carriere.' },
            music: { title: 'Quiz Musique', desc: 'Devinez la chanson grace aux indices sur l\'artiste et l\'epoque.' },
            animal: { title: 'Quiz Animaux', desc: 'Devinez l\'animal mystere grace aux indices sur son habitat et son regime.' },
            sudoku: { title: 'Sudoku', desc: 'Le puzzle de chiffres classique. Design epure, sans distractions.' },
            tennis: { title: 'Quiz Tennis', desc: 'Devinez le joueur de tennis grace aux indices sur sa carriere.' },
            books: { title: 'Quiz Livres', desc: 'Devinez le livre classique grace aux indices sur l\'auteur et la publication.' }
          }
        },
        common: {
          submit: 'Valider',
          guess: 'Deviner',
          skip: 'Passer',
          giveUp: 'Abandonner',
          playAgain: 'Rejouer',
          playRandom: 'Partie aleatoire',
          shareResults: 'Partager',
          nextSong: 'Chanson suivante',
          close: 'Fermer',
          loading: 'Chargement...',
          error: 'Une erreur est survenue',
          correct: 'Correct !',
          wrong: 'Faux !',
          skipped: 'Passe',
          guesses: 'Essais',
          score: 'Score',
          streak: 'Serie',
          stats: 'Statistiques',
          howToPlay: 'Comment jouer',
          daily: 'Quotidien',
          random: 'Aleatoire',
          startGame: 'Commencer',
          back: 'Retour',
          dailyComplete: 'Le defi du jour est termine !',
          playingRandom: 'Mode aleatoire.',
          solvedIn: 'Resolu en {count} essai !',
          solvedInPlural: 'Resolu en {count} essais !',
          gaveUpAfter: 'Abandonne apres {count} essai',
          gaveUpAfterPlural: 'Abandonne apres {count} essais',
          newDaily: 'Un nouveau defi chaque jour !',
          dataProvider: 'Donnees fournies par {source}',
          notFound: '{item} introuvable. Veuillez selectionner parmi les suggestions.',
          alreadyGuessed: 'Vous avez deja devine ce {item} !',
          noDataAvailable: 'Aucune donnee disponible. Veuillez actualiser la page.',
          loadError: 'Echec du chargement. Verifiez votre connexion et actualisez.',
          refreshPage: 'Veuillez actualiser la page.',
          notNationality: '❌ Nationalite :',
          notCountry: '❌ Pays :',
          notTeam: '❌ Equipe :',
          notHand: '❌ Main :',
          notBackhand: '❌ Revers :',
          notClass: '❌ Classe :',
          notDiet: '❌ Regime :',
          notAuthor: '❌ Auteur :',
          notGenre: '❌ Genre :',
          notDirector: '❌ Realisateur :',
          notActor: '❌ Acteur :'
        },
        stats: {
          gamesPlayed: 'Parties jouees',
          winPercentage: '% Victoires',
          currentStreak: 'Serie actuelle',
          maxStreak: 'Meilleure serie',
          bestScore: 'Meilleur score',
          averageGuesses: 'Moyenne essais'
        },
        games: {
          movies: {
            title: 'Quiz Films',
            subtitle: 'Devinez le film a partir des indices',
            inputPlaceholder: 'Tapez un titre de film...',
            cluesSummary: 'Resume des indices',
            director: 'Realisateur',
            directors: 'Realisateurs',
            year: 'Annee',
            country: 'Pays',
            cast: 'Casting',
            actors: 'Acteurs',
            rating: 'IMDB',
            runtime: 'Duree',
            genres: 'Genres',
            loadingMessage: '🎬 Fin du tournage...',
            newMovieDaily: 'Un nouveau film chaque jour ! 🎬',
            dataAttribution: 'Donnees fournies par IMDb API sur RapidAPI'
          },
          books: {
            title: 'Quiz Livres',
            subtitle: 'Devinez le livre a partir des indices',
            inputPlaceholder: 'Tapez un titre de livre...',
            author: 'Auteur',
            year: 'Annee',
            pages: 'Pages',
            genres: 'Genres'
          },
          music: {
            title: 'Quiz Musique',
            subtitle: 'Devinez la chanson a partir des indices',
            inputPlaceholder: 'Tapez un titre de chanson...',
            artist: 'Artiste',
            album: 'Album',
            year: 'Annee'
          },
          blindtest: {
            title: 'Blind Test',
            subtitle: 'Ecoutez et devinez la chanson',
            inputPlaceholder: 'Tapez un titre...',
            displayArtist: 'Afficher l\'artiste',
            displayArtistDesc: 'Affiche le nom de l\'artiste comme indice',
            multipleChoice: 'Choix multiples',
            multipleChoiceDesc: 'Choisissez parmi 4 options',
            round: 'Manche',
            matchComplete: 'Match termine !',
            totalScore: 'Score total',
            avgTime: 'Temps moyen',
            nextMatch: 'Match aleatoire',
            startTitle: 'Pret a jouer ?',
            startDesc: 'Ecoutez 5 extraits et devinez les titres. Plus vous repondez vite, plus vous gagnez de points !',
            dailyComplete: 'Defi du jour termine !',
            playRandomDesc: 'Vous pouvez jouer autant de matchs aleatoires que vous voulez.',
            loadingMessage: '🎧 Branchement du casque...'
          },
          f1: {
            loadingMessage: '🏎️ Chauffe des pneus...'
          },
          tennis: {
            loadingMessage: '🎾 Echauffement en cours...'
          },
          music: {
            loadingMessage: '🎵 Accordage des instruments...'
          },
          books: {
            loadingMessage: '📚 Ouverture de la bibliotheque...'
          },
          animal: {
            loadingMessage: '🐾 En safari...'
          },
          fut: {
            loadingMessage: '⚽ Echauffement sur le terrain...'
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
            loadingMessage: '⚽ Echauffement sur le terrain...',
            cluesSummary: 'Resume des indices',
            age: 'Age',
            height: 'Taille',
            nationality: 'Nationalite',
            club: 'Club',
            position: 'Position',
            foot: 'Pied',
            worldCup: 'Coupe du Monde?',
            leagues: 'Ligues',
            titles: 'Titres',
            notNationality: '❌ Nationalite:',
            notClub: '❌ Club:',
            notPosition: '❌ Position:'
          },
          tennis: {
            title: 'Quiz Tennis',
            subtitle: 'Devinez le joueur de tennis',
            inputPlaceholder: 'Tapez un nom de joueur...',
            loadingMessage: '🎾 Echauffement en cours...',
            cluesSummary: 'Resume des indices',
            age: 'Age',
            ranking: 'Classement',
            bestRank: 'Meilleur rang',
            slams: 'Grand Chelem',
            titles: 'Titres',
            proSince: 'Pro depuis',
            nationality: 'Nationalite',
            hand: 'Main',
            backhand: 'Revers',
            notNationality: '❌ Nationalite:',
            notHand: '❌ Main:',
            notBackhand: '❌ Revers:'
          }
        },
        share: {
          copiedToClipboard: 'Copie dans le presse-papiers !'
        }
      },
      'pt-br': {
        hub: {
          title: 'Snackable Games',
          subtitle: 'Jogos rapidos e divertidos',
          about: 'Sobre',
          privacy: 'Privacidade',
          featured: 'Destaque',
          games: {
            blindtest: { title: 'Blind Test', desc: 'Ouca trechos de musicas e adivinhe o titulo. Teste seus conhecimentos!' },
            movies: { title: 'Quiz de Filmes', desc: 'Adivinhe o filme usando dicas sobre diretor, genero e nota.' },
            f1: { title: 'Quiz F1', desc: 'Adivinhe o piloto de Formula 1 usando dicas sobre sua carreira.' },
            fut: { title: 'FutQuiz', desc: 'Adivinhe o jogador de futebol usando dicas sobre sua carreira.' },
            music: { title: 'Quiz de Musica', desc: 'Adivinhe a musica usando dicas sobre artista, genero e epoca.' },
            animal: { title: 'Quiz de Animais', desc: 'Adivinhe o animal misterioso usando dicas sobre habitat e dieta.' },
            sudoku: { title: 'Sudoku', desc: 'O classico puzzle de numeros. Design limpo, sem distracoes.' },
            tennis: { title: 'Quiz de Tenis', desc: 'Adivinhe o jogador de tenis usando dicas sobre sua carreira.' },
            books: { title: 'Quiz de Livros', desc: 'Adivinhe o livro classico usando dicas sobre autor e publicacao.' }
          }
        },
        common: {
          submit: 'Enviar',
          guess: 'Adivinhar',
          skip: 'Pular',
          giveUp: 'Desistir',
          playAgain: 'Jogar novamente',
          playRandom: 'Jogo aleatorio',
          shareResults: 'Compartilhar',
          nextSong: 'Proxima musica',
          close: 'Fechar',
          loading: 'Carregando...',
          error: 'Ocorreu um erro',
          correct: 'Correto!',
          wrong: 'Errado!',
          skipped: 'Pulado',
          guesses: 'Tentativas',
          score: 'Pontuacao',
          streak: 'Sequencia',
          stats: 'Estatisticas',
          howToPlay: 'Como jogar',
          daily: 'Diario',
          random: 'Aleatorio',
          startGame: 'Comecar',
          back: 'Voltar',
          dailyComplete: 'O desafio de hoje esta completo!',
          playingRandom: 'Modo aleatorio.',
          solvedIn: 'Resolvido em {count} tentativa!',
          solvedInPlural: 'Resolvido em {count} tentativas!',
          gaveUpAfter: 'Desistiu apos {count} tentativa',
          gaveUpAfterPlural: 'Desistiu apos {count} tentativas',
          newDaily: 'Um novo desafio todo dia!',
          dataProvider: 'Dados fornecidos por {source}',
          notFound: '{item} nao encontrado. Por favor, selecione das sugestoes.',
          alreadyGuessed: 'Voce ja tentou esse {item}!',
          noDataAvailable: 'Dados indisponiveis. Por favor, atualize a pagina.',
          loadError: 'Falha ao carregar dados. Verifique sua conexao e atualize.',
          refreshPage: 'Por favor, atualize a pagina.',
          notNationality: '❌ Nacionalidade:',
          notCountry: '❌ Pais:',
          notTeam: '❌ Equipe:',
          notHand: '❌ Mao:',
          notBackhand: '❌ Backhand:',
          notClass: '❌ Classe:',
          notDiet: '❌ Dieta:',
          notAuthor: '❌ Autor:',
          notGenre: '❌ Genero:',
          notDirector: '❌ Diretor:',
          notActor: '❌ Ator:'
        },
        stats: {
          gamesPlayed: 'Jogos',
          winPercentage: '% Vitorias',
          currentStreak: 'Sequencia atual',
          maxStreak: 'Melhor sequencia',
          bestScore: 'Melhor pontuacao',
          averageGuesses: 'Media de tentativas'
        },
        games: {
          movies: {
            title: 'Quiz de Filmes',
            subtitle: 'Adivinhe o filme pelas dicas',
            inputPlaceholder: 'Digite o titulo do filme...',
            cluesSummary: 'Resumo das dicas',
            director: 'Diretor',
            directors: 'Diretores',
            year: 'Ano',
            country: 'Pais',
            cast: 'Elenco',
            actors: 'Atores',
            rating: 'IMDB',
            runtime: 'Duracao',
            genres: 'Generos',
            loadingMessage: '🎬 Finalizando as filmagens...',
            newMovieDaily: 'Um novo filme todo dia! 🎬',
            dataAttribution: 'Dados fornecidos por IMDb API no RapidAPI'
          },
          books: {
            title: 'Quiz de Livros',
            subtitle: 'Adivinhe o livro pelas dicas',
            inputPlaceholder: 'Digite o titulo do livro...',
            author: 'Autor',
            year: 'Ano',
            pages: 'Paginas',
            genres: 'Generos'
          },
          music: {
            title: 'Quiz de Musica',
            subtitle: 'Adivinhe a musica pelas dicas',
            inputPlaceholder: 'Digite o titulo da musica...',
            artist: 'Artista',
            album: 'Album',
            year: 'Ano'
          },
          blindtest: {
            title: 'Blind Test',
            subtitle: 'Ouca e adivinhe a musica',
            inputPlaceholder: 'Digite o titulo...',
            displayArtist: 'Exibir Artista',
            displayArtistDesc: 'Mostra o nome do artista como dica',
            multipleChoice: 'Multipla escolha',
            multipleChoiceDesc: 'Escolha entre 4 opcoes',
            round: 'Rodada',
            matchComplete: 'Partida completa!',
            totalScore: 'Pontuacao total',
            avgTime: 'Tempo medio',
            nextMatch: 'Partida aleatoria',
            startTitle: 'Pronto para jogar?',
            startDesc: 'Ouca 5 trechos e adivinhe os titulos. Quanto mais rapido responder, mais pontos voce ganha!',
            dailyComplete: 'Desafio diario completo!',
            playRandomDesc: 'Voce pode jogar quantas partidas aleatorias quiser.',
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
            loadingMessage: '🐾 Em safari...'
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
            position: 'Posicao',
            foot: 'Pe',
            worldCup: 'Copa do Mundo?',
            leagues: 'Ligas',
            titles: 'Titulos',
            notNationality: '❌ Nacionalidade:',
            notClub: '❌ Clube:',
            notPosition: '❌ Posicao:'
          },
          tennis: {
            title: 'Quiz de Tenis',
            subtitle: 'Adivinhe o tenista',
            inputPlaceholder: 'Digite o nome do jogador...',
            loadingMessage: '🎾 Aquecendo...',
            cluesSummary: 'Resumo das Pistas',
            age: 'Idade',
            ranking: 'Ranking',
            bestRank: 'Melhor Ranking',
            slams: 'Grand Slams',
            titles: 'Titulos',
            proSince: 'Profissional desde',
            nationality: 'Nacionalidade',
            hand: 'Mao',
            backhand: 'Backhand',
            notNationality: '❌ Nacionalidade:',
            notHand: '❌ Mao:',
            notBackhand: '❌ Backhand:'
          }
        },
        share: {
          copiedToClipboard: 'Copiado para a area de transferencia!'
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
          alreadyGuessed: 'Hai gia provato questo {item}!',
          noDataAvailable: 'Dati non disponibili. Aggiorna la pagina.',
          loadError: 'Caricamento fallito. Controlla la connessione e aggiorna.',
          refreshPage: 'Aggiorna la pagina.',
          notNationality: '❌ Nazionalita:',
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
          averageGuesses: 'Media tentativi'
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
            nextMatch: 'Match casuale',
            startTitle: 'Pronto a giocare?',
            startDesc: 'Ascolta 5 estratti e indovina i titoli. Piu veloce rispondi, piu punti guadagni!',
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
            age: 'Eta',
            height: 'Altezza',
            nationality: 'Nazionalita',
            club: 'Club',
            position: 'Posizione',
            foot: 'Piede',
            worldCup: 'Coppa del Mondo?',
            leagues: 'Campionati',
            titles: 'Titoli',
            notNationality: '❌ Nazionalita:',
            notClub: '❌ Club:',
            notPosition: '❌ Posizione:'
          },
          tennis: {
            title: 'Quiz Tennis',
            subtitle: 'Indovina il tennista',
            inputPlaceholder: 'Scrivi il nome del giocatore...',
            loadingMessage: '🎾 Riscaldamento...',
            cluesSummary: 'Riepilogo indizi',
            age: 'Eta',
            ranking: 'Classifica',
            bestRank: 'Miglior ranking',
            slams: 'Slam',
            titles: 'Titoli',
            proSince: 'Pro dal',
            nationality: 'Nazionalita',
            hand: 'Mano',
            backhand: 'Rovescio',
            notNationality: '❌ Nazionalita:',
            notHand: '❌ Mano:',
            notBackhand: '❌ Rovescio:'
          }
        },
        share: {
          copiedToClipboard: 'Copiato negli appunti!'
        }
      },
      es: {
        hub: {
          title: 'Snackable Games',
          subtitle: 'Juegos rapidos y divertidos',
          about: 'Acerca de',
          privacy: 'Privacidad',
          featured: 'Destacado',
          games: {
            blindtest: { title: 'Blind Test', desc: 'Escucha fragmentos de canciones y adivina el titulo. ¡Pon a prueba tus conocimientos!' },
            movies: { title: 'Quiz de Peliculas', desc: 'Adivina la pelicula usando pistas sobre director, genero y puntuacion.' },
            f1: { title: 'Quiz F1', desc: 'Adivina el piloto de Formula 1 usando pistas sobre su carrera.' },
            fut: { title: 'FutQuiz', desc: 'Adivina el jugador de futbol usando pistas sobre su carrera.' },
            music: { title: 'Quiz de Musica', desc: 'Adivina la cancion usando pistas sobre artista, genero y epoca.' },
            animal: { title: 'Quiz de Animales', desc: 'Adivina el animal misterioso usando pistas sobre habitat y dieta.' },
            sudoku: { title: 'Sudoku', desc: 'El clasico puzzle numerico. Diseno limpio, sin distracciones.' },
            tennis: { title: 'Quiz de Tenis', desc: 'Adivina el tenista usando pistas sobre su carrera.' },
            books: { title: 'Quiz de Libros', desc: 'Adivina el libro clasico usando pistas sobre autor y publicacion.' }
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
          nextSong: 'Siguiente cancion',
          close: 'Cerrar',
          loading: 'Cargando...',
          error: 'Ha ocurrido un error',
          correct: '¡Correcto!',
          wrong: '¡Incorrecto!',
          skipped: 'Saltado',
          guesses: 'Intentos',
          score: 'Puntuacion',
          streak: 'Racha',
          stats: 'Estadísticas',
          howToPlay: 'Como jugar',
          daily: 'Diario',
          random: 'Aleatorio',
          startGame: 'Empezar',
          back: 'Volver',
          dailyComplete: '¡El reto de hoy esta completo!',
          playingRandom: 'Modo aleatorio.',
          solvedIn: '¡Resuelto en {count} intento!',
          solvedInPlural: '¡Resuelto en {count} intentos!',
          gaveUpAfter: 'Rendido despues de {count} intento',
          gaveUpAfterPlural: 'Rendido despues de {count} intentos',
          newDaily: '¡Un nuevo reto cada dia!',
          dataProvider: 'Datos proporcionados por {source}',
          notFound: '{item} no encontrado. Selecciona de las sugerencias.',
          alreadyGuessed: '¡Ya intentaste este {item}!',
          noDataAvailable: 'Datos no disponibles. Actualiza la pagina.',
          loadError: 'Error al cargar datos. Verifica tu conexion y actualiza.',
          refreshPage: 'Por favor, actualiza la pagina.',
          notNationality: '❌ Nacionalidad:',
          notCountry: '❌ Pais:',
          notTeam: '❌ Equipo:',
          notHand: '❌ Mano:',
          notBackhand: '❌ Reves:',
          notClass: '❌ Clase:',
          notDiet: '❌ Dieta:',
          notAuthor: '❌ Autor:',
          notGenre: '❌ Genero:',
          notDirector: '❌ Director:',
          notActor: '❌ Actor:'
        },
        stats: {
          gamesPlayed: 'Partidas',
          winPercentage: '% Victorias',
          currentStreak: 'Racha actual',
          maxStreak: 'Mejor racha',
          bestScore: 'Mejor puntuacion',
          averageGuesses: 'Media de intentos'
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
        }
      }
    };

    return translations[locale] || translations.en;
  }
}

// Export for use in games
window.I18n = I18n;
