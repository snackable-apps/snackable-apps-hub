# Snackable Games Hub

The main hub for all Snackable Games at https://snackable-games.com

## Games

| Game | Description | Data Source |
|------|-------------|-------------|
| 🏎️ F1 Quiz | Guess the F1 driver | Local JS |
| ⚽ FutQuiz | Guess the football player | Local JS |
| 🎾 Tennis Quiz | Guess the tennis player | Local JS |
| 🎬 Movies Quiz | Guess the movie | Supabase API (705 movies) |
| 📚 Books Quiz | Guess the book | Local JS |
| 🎵 Music Quiz | Guess the song | Local JS |
| 🦁 Animal Quiz | Guess the animal | Local JS |
| 🧩 Sudoku | Classic number puzzle | Generated |

## Tools

| Tool | Purpose | URL |
|------|---------|-----|
| Data Explorer | Browse game databases | `/data-explorer/` |

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    snackable-games.com                   │
│                   (GitHub Pages)                         │
├─────────────────────────────────────────────────────────┤
│  index.html    │  f1-quiz/  │  movies-quiz/  │  ...     │
└─────────────────────────────────────────────────────────┘
                              │
                              │ (Movies Quiz only)
                              ▼
┌─────────────────────────────────────────────────────────┐
│                 snackable-api.vercel.app                 │
│                    (Vercel Serverless)                   │
├─────────────────────────────────────────────────────────┤
│                    GET /api/movies                       │
└─────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│                       Supabase                           │
│                     (PostgreSQL)                         │
├─────────────────────────────────────────────────────────┤
│  movies_raw (JSONB)  │  movies (processed)              │
└─────────────────────────────────────────────────────────┘
```

## Repository Structure

```
snackable-apps-hub/
├── index.html              # Main landing page
├── about.html              # About page
├── privacy.html            # Privacy policy
├── css/style.css           # Global styles
├── data-explorer/          # Database browser tool
├── f1-quiz/                # F1 Quiz game
├── fut-quiz/               # Football Quiz game
├── tennis-quiz/            # Tennis Quiz game
├── movies-quiz/            # Movies Quiz game
├── books-quiz/             # Books Quiz game
├── music/                  # Music Quiz game
├── animal/                 # Animal Quiz game
└── sudoku/                 # Sudoku game
```

## Related Repositories

| Repository | Purpose |
|------------|---------|
| [snackable-api](../snackable-api) | Vercel API for Supabase data |

## Development

### Local Server
```bash
python3 -m http.server 8000
# Open http://localhost:8000
```

### Deploy
Automatically deploys via GitHub Pages on push to `main`.

## Data Management

### Movies (Supabase)
See `movies-quiz/data/README.md` for import pipeline documentation.

### Other Games (Local JS)
Each game has a `data/` folder with:
- `*_data.js` - Main data file
- `README.md` - Data documentation
