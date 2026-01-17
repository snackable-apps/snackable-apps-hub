# Tennis Quiz - Data Management

## Overview

The Tennis Quiz uses a **hybrid data model**:
- **API** → Current ATP rankings (auto-updated)
- **Manual** → Career stats, retired players, legends

## Files

| File | Purpose |
|------|---------|
| `players_data.js` | Final output used by the game |
| `manual_stats.json` | Manual career stats (edit this!) |
| `update_rankings.py` | Script to update rankings from API |

## Monthly Update Process

Run this command to update rankings:

```bash
cd tennis-quiz/data
python3 update_rankings.py
```

**What it does:**
1. Fetches current ATP rankings from FlashLive API
2. Matches API players to our database by name
3. Updates `currentRanking` for active players
4. Preserves all manual stats (hand, GS titles, etc.)
5. Skips retired players (keeps them as 9999)
6. Generates new `players_data.js`

## Adding New Players

1. Edit `manual_stats.json`
2. Add player with all required fields
3. Set `"isRetired": false` for active players
4. Run `update_rankings.py`

### Required Fields

```json
{
  "name": "Player Name",
  "nationality": "Country",
  "birthdate": "YYYY-MM-DD",
  "hand": "Right" or "Left",
  "backhand": "One-handed" or "Two-handed",
  "grandSlamTitles": 0,
  "careerTitles": 0,
  "highestRanking": 1,
  "turnedPro": 2020,
  "deathDate": null,
  "difficulty": "easy" | "medium" | "hard",
  "isRetired": false
}
```

## API Details

**Provider:** FlashLive Sports (via RapidAPI)
**Endpoint:** `/v1/rankings/data?ranking_id=dSJr14Y8`
**Ranking ID:** `dSJr14Y8` (ATP Singles)

## Difficulty Guidelines

| Difficulty | Who |
|------------|-----|
| `easy` | Famous players (Big 3, Grand Slam winners, top 10) |
| `medium` | Well-known players (top 20, recent stars) |
| `hard` | Lesser-known (should NOT be daily secret) |

## Data Sources

- **Rankings:** FlashLive Sports API (live)
- **Career stats:** Manual research (Wikipedia, ATP website)
- **Death dates:** Manual (for deceased legends)
