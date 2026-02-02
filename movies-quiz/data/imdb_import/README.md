# IMDB Import Pipeline

3-step pipeline to import movies from IMDB to Supabase.

## Overview

```
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  1. Select       │───▶│  2. Fetch        │───▶│  3. Import       │
│  (IMDB datasets) │    │  (RapidAPI)      │    │  (Supabase)      │
└──────────────────┘    └──────────────────┘    └──────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
  selected_movies.json    movies_raw.json         Supabase DB
```

## Prerequisites

- Python 3.x
- RapidAPI key for `imdb236.p.rapidapi.com`
- Supabase service_role key (for import)

## Step 1: Select Movies

Downloads IMDB public datasets and filters to quality movies.

```bash
python3 1_select_movies.py
```

### Configuration
```python
MIN_VOTES = 50000      # Minimum IMDB votes
MIN_RATING = 6.5       # Minimum IMDB rating
MIN_YEAR = 1960        # Oldest year to include
MAX_MOVIES = 1000      # Maximum movies to select
```

### Input
- Downloads `title.basics.tsv.gz` and `title.ratings.tsv.gz` from IMDB

### Output
- `selected_movies.json` - List of movies with basic info

## Step 2: Fetch Details

Fetches detailed info from IMDB API for each selected movie.

```bash
python3 2_fetch_details.py
```

### Configuration
```python
MAX_MOVIES_TO_FETCH = 1000      # Limit (None = unlimited)
SAVE_INTERVAL = 50              # Save progress every N items
SAVE_THRESHOLD = 950            # After this, save more frequently
SAVE_INTERVAL_AFTER_THRESHOLD = 10
REQUESTS_PER_SECOND = 2         # Rate limiting
```

### Input
- `selected_movies.json` from Step 1

### Output
- `movies_raw.json` - Enriched movie data
- `fetch_progress.json` - Resume capability
- `fetch_errors.log` - Error log

### Resume Capability
If interrupted, re-running will resume from last saved progress.

## Step 3: Import to Supabase

Imports data to Supabase using REST API.

```bash
python3 3_import_direct.py
```

### Tables Updated
- `movies_raw` - Full API response as JSONB
- `movies` - Processed data for the game

### Prerequisites
1. Run `schema_only.sql` in Supabase SQL Editor first
2. Set service_role key in the script

## Files

| File | Purpose |
|------|---------|
| `1_select_movies.py` | Filter IMDB datasets |
| `2_fetch_details.py` | Fetch from API |
| `3_import_direct.py` | Import to Supabase |
| `3_import_supabase.py` | SQL generator (alternative) |
| `schema_only.sql` | Database schema |
| `selected_movies.json` | Step 1 output |
| `movies_raw.json` | Step 2 output |
| `fetch_progress.json` | Resume state |
| `fetch_errors.log` | Error log |

## Troubleshooting

### HTTP 403 Forbidden
- Check RapidAPI subscription is active
- Verify API key is correct
- May have hit rate limit - wait and retry

### HTTP 429 Too Many Requests
- API rate limit exceeded
- Script saves progress - just re-run later

### RLS Policy Error
- Use service_role key instead of anon key
- Or add INSERT policies to tables

## Replicating for Other Games

This pipeline pattern can be adapted for other quizzes:

1. **Copy folder structure**
2. **Modify Step 1** for data source (CSV, API, etc.)
3. **Modify Step 2** for API endpoints and data extraction
4. **Modify Step 3** for table schema

See `.cursor/skills/game-data-import/SKILL.md` for full template.
