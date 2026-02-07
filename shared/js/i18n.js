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
          back: 'Back'
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
            genres: 'Genres'
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
            easyMode: 'Easy Mode',
            easyModeDesc: 'Album cover gradually revealed as hint',
            multipleChoice: 'Multiple Choice',
            multipleChoiceDesc: 'Pick from 4 options instead of typing',
            round: 'Round',
            matchComplete: 'Match Complete!',
            totalScore: 'Total Score',
            avgTime: 'Avg Time',
            nextMatch: 'Play Random Match',
            startTitle: 'Ready to play?',
            startDesc: 'Listen to 5 song samples and guess the titles. The faster you answer, the more points you get!'
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
            inputPlaceholder: 'Type a player name...'
          },
          tennis: {
            title: 'Tennis Quiz',
            subtitle: 'Guess the tennis player',
            inputPlaceholder: 'Type a player name...'
          }
        },
        share: {
          copiedToClipboard: 'Copied to clipboard!'
        }
      },
      fr: {
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
          back: 'Retour'
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
            genres: 'Genres'
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
            easyMode: 'Mode facile',
            easyModeDesc: 'La pochette se devoile progressivement',
            multipleChoice: 'Choix multiples',
            multipleChoiceDesc: 'Choisissez parmi 4 options',
            round: 'Manche',
            matchComplete: 'Match termine !',
            totalScore: 'Score total',
            avgTime: 'Temps moyen',
            nextMatch: 'Match aleatoire',
            startTitle: 'Pret a jouer ?',
            startDesc: 'Ecoutez 5 extraits et devinez les titres. Plus vous repondez vite, plus vous gagnez de points !'
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
            inputPlaceholder: 'Tapez un nom de joueur...'
          },
          tennis: {
            title: 'Quiz Tennis',
            subtitle: 'Devinez le joueur de tennis',
            inputPlaceholder: 'Tapez un nom de joueur...'
          }
        },
        share: {
          copiedToClipboard: 'Copie dans le presse-papiers !'
        }
      },
      'pt-br': {
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
          back: 'Voltar'
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
            genres: 'Generos'
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
            easyMode: 'Modo facil',
            easyModeDesc: 'Capa do album revelada gradualmente',
            multipleChoice: 'Multipla escolha',
            multipleChoiceDesc: 'Escolha entre 4 opcoes',
            round: 'Rodada',
            matchComplete: 'Partida completa!',
            totalScore: 'Pontuacao total',
            avgTime: 'Tempo medio',
            nextMatch: 'Partida aleatoria',
            startTitle: 'Pronto para jogar?',
            startDesc: 'Ouca 5 trechos e adivinhe os titulos. Quanto mais rapido responder, mais pontos voce ganha!'
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
            inputPlaceholder: 'Digite o nome do jogador...'
          },
          tennis: {
            title: 'Quiz de Tenis',
            subtitle: 'Adivinhe o tenista',
            inputPlaceholder: 'Digite o nome do jogador...'
          }
        },
        share: {
          copiedToClipboard: 'Copiado para a area de transferencia!'
        }
      },
      it: {
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
          back: 'Indietro'
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
            genres: 'Generi'
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
            easyMode: 'Modalità facile',
            easyModeDesc: 'Copertina album rivelata gradualmente',
            multipleChoice: 'Scelta multipla',
            multipleChoiceDesc: 'Scegli tra 4 opzioni',
            round: 'Round',
            matchComplete: 'Match completo!',
            totalScore: 'Punteggio totale',
            avgTime: 'Tempo medio',
            nextMatch: 'Match casuale',
            startTitle: 'Pronto a giocare?',
            startDesc: 'Ascolta 5 estratti e indovina i titoli. Piu veloce rispondi, piu punti guadagni!'
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
            inputPlaceholder: 'Scrivi il nome del giocatore...'
          },
          tennis: {
            title: 'Quiz Tennis',
            subtitle: 'Indovina il tennista',
            inputPlaceholder: 'Scrivi il nome del giocatore...'
          }
        },
        share: {
          copiedToClipboard: 'Copiato negli appunti!'
        }
      },
      es: {
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
          back: 'Volver'
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
            genres: 'Géneros'
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
            easyMode: 'Modo fácil',
            easyModeDesc: 'Portada del álbum revelada gradualmente',
            multipleChoice: 'Opción múltiple',
            multipleChoiceDesc: 'Elige entre 4 opciones',
            round: 'Ronda',
            matchComplete: '¡Partida completa!',
            totalScore: 'Puntuación total',
            avgTime: 'Tiempo promedio',
            nextMatch: 'Partida aleatoria',
            startTitle: '¿Listo para jugar?',
            startDesc: 'Escucha 5 fragmentos y adivina los títulos. ¡Cuanto más rápido respondas, más puntos ganas!'
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
            inputPlaceholder: 'Escribe el nombre del jugador...'
          },
          tennis: {
            title: 'Quiz de Tenis',
            subtitle: 'Adivina el tenista',
            inputPlaceholder: 'Escribe el nombre del jugador...'
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
