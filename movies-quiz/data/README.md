# Movies Quiz Database

## Overview

The movies database contains **705 curated films** stored in Supabase and served via API.

### Data Properties
- Title, Director
- Genres (array)
- Release Year, Runtime, IMDB Rating
- Country of Origin
- Cast (top 6 actors)
- Difficulty (easy/medium/hard)

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   IMDB API      │────▶│   Supabase      │────▶│  Vercel API     │
│  (RapidAPI)     │     │  (PostgreSQL)   │     │  /api/movies    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                              │                        │
                              ▼                        ▼
                        ┌─────────────────┐     ┌─────────────────┐
                        │  movies_raw     │     │  Movies Quiz    │
                        │  (full JSONB)   │     │  (frontend)     │
                        └─────────────────┘     └─────────────────┘
```

### Database Tables

| Table | Purpose |
|-------|---------|
| `movies_raw` | Full API response as JSONB (for future use) |
| `movies` | Processed data for the game |

### API Endpoint

**URL**: `https://snackable-api.vercel.app/api/movies`

**Response:**
```json
{
  "success": true,
  "count": 705,
  "movies": [...]
}
```

## Data Import Pipeline

Located in `imdb_import/` folder. Uses a 3-step process:

### Step 1: Select Movies (`1_select_movies.py`)
- Downloads IMDB public datasets (title.basics.tsv, title.ratings.tsv)
- Filters by: votes ≥ 50,000, rating ≥ 6.5, year ≥ 1960
- Outputs `selected_movies.json`

### Step 2: Fetch Details (`2_fetch_details.py`)
- Fetches from IMDB236 API on RapidAPI
- Gets director, cast, country, genres, etc.
- Saves progress every 50 items (configurable)
- Outputs `movies_raw.json`

### Step 3: Import to Supabase (`3_import_direct.py`)
- Reads `movies_raw.json`
- Inserts to both `movies_raw` and `movies` tables
- Uses service_role key to bypass RLS

### Running the Pipeline

```bash
cd imdb_import

# Step 1: Select movies from IMDB datasets
python3 1_select_movies.py

# Step 2: Fetch details from API (requires RapidAPI key)
python3 2_fetch_details.py

# Step 3: Import to Supabase (requires service_role key)
python3 3_import_direct.py
```

## Configuration

### Environment Variables

| Variable | Purpose | Where |
|----------|---------|-------|
| `RAPIDAPI_KEY` | IMDB API access | Local (fetch script) |
| `SUPABASE_URL` | Database URL | Vercel + local |
| `SUPABASE_ANON_KEY` | Read-only access | Vercel + local |
| `SUPABASE_SERVICE_ROLE_KEY` | Write access | Local only (import) |

### Fetch Script Parameters

In `2_fetch_details.py`:
```python
MAX_MOVIES_TO_FETCH = 1000   # Limit
SAVE_INTERVAL = 50           # Save every N items
SAVE_THRESHOLD = 950         # After this, save more frequently
SAVE_INTERVAL_AFTER_THRESHOLD = 10
```

## Monthly Update Strategy

1. **Check for new releases**: Use IMDB "coming-soon" or "in-theaters" endpoints
2. **Add IDs to selection**: Update `1_select_movies.py` criteria or manually add IDs
3. **Run pipeline**: Execute steps 1-3
4. **Verify**: Check Data Explorer at `/data-explorer/`

## Files

| File | Purpose |
|------|---------|
| `movies_data.js` | Legacy fallback (35 movies) |
| `imdb_import/` | Import pipeline scripts |
| `supabase_setup.sql` | Original schema (deprecated) |
| `supabase_v2_setup.sql` | Current schema reference |

## Current Statistics

- **Total Movies**: 705
- **With Director**: 705
- **With Cast**: 705
- **Date Range**: 1960-2025
- **Last Updated**: 2026-02-02
