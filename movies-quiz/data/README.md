# Movies Quiz Database

## Overview

The movies database contains 35 curated films with the following properties:
- Title, Director, Director Nationality
- Genres (up to 3)
- Release Year, Runtime, IMDB Rating
- Country of Origin
- Cast (top 6 actors)
- Difficulty (easy/medium/hard)

## Data Structure

```javascript
{
  "title": "The Godfather",
  "director": "Francis Ford Coppola",
  "directorNationality": "USA",
  "genres": ["Crime", "Drama"],
  "releaseYear": 1972,
  "runtimeMinutes": 175,
  "imdbRating": 9.2,
  "country": "USA",
  "cast": ["Marlon Brando", "Al Pacino", "James Caan", "Robert Duvall", "Diane Keaton"],
  "difficulty": "easy"
}
```

## Game Logic

- **Secret Movie Pool**: Movies with difficulty "easy" or "medium" (IMDB 7.0+)
- **Guessable Pool**: All movies in the database
- **Daily Selection**: Based on day of year % pool size

## Updating the Database

### Manual Updates

1. Add movies directly to `movies_data.js`
2. Include all required properties
3. Use consistent formatting

### API Updates (IMDB)

1. **Add IDs to queue**: Edit `import_queue.txt` with IMDB IDs
2. **Run import**: `python3 import_movies.py`
3. **Review**: Check `new_movies.json` for accuracy
4. **Merge**: Add reviewed movies to `movies_data.js`
5. **Manual edits**: Add director info (not from API)

### Monthly Update Strategy

| Priority | Source | Movies/Month |
|----------|--------|--------------|
| 1 | New theatrical releases (8+ IMDB) | ~10 |
| 2 | Trending on streaming | ~5 |
| 3 | Award season nominees | ~5 |
| 4 | Gap filling (decades/genres) | ~5 |
| 5 | User requests | ~5 |

## API Details

**Provider**: IMDB API on RapidAPI  
**Cost**: ~1€/month for 10,000 requests  
**Requests per movie**: 2 (details + cast)

### Endpoints Used

- `GET /api/imdb/{imdbId}` - Movie details
- `GET /api/imdb/cast/{imdbId}/principals` - Cast list
- `GET /api/imdb/coming-soon` - Upcoming releases
- `GET /api/imdb/in-theaters` - Current releases

### Quality Thresholds

- IMDB Rating: ≥ 6.0
- Number of Votes: ≥ 10,000
- Avoid documentaries and short films

## Files

| File | Purpose |
|------|---------|
| `movies_data.js` | Main database (35 movies) |
| `import_movies.py` | API import script |
| `import_queue.txt` | IDs pending import |
| `new_movies.json` | Recently imported (review) |
| `import_log.txt` | Import history |

## Current Statistics

- **Total Movies**: 35
- **Easy**: ~20 (IMDB 8.0+)
- **Medium**: ~12 (IMDB 7.0-7.9)
- **Hard**: ~3 (IMDB 6.0-6.9)
- **Last Updated**: 2026-01-17
