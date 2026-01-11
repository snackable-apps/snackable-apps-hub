# F1 Drivers CSV Format

This file describes the format of the drivers CSV for the F1-Quiz game.

## Column Structure

| Column | Type | Description |
|--------|------|-------------|
| `id` | Integer | API-Sports driver ID |
| `name` | String | Full driver name |
| `abbr` | String | 3-letter abbreviation |
| `nationality` | String | Driver nationality |
| `country_code` | String | ISO country code |
| `birthdate` | Date | YYYY-MM-DD format |
| `death_date` | Date | YYYY-MM-DD format (empty if alive) |
| `world_championships` | Integer | Number of WDC titles |
| `wins` | Integer | Career race wins |
| `podiums` | Integer | Career podium finishes |
| `career_points` | Float | Total career points |
| `current_team` | String | Current team, "Retired", or "Deceased" |
| `teams_history` | String | Pipe-separated list of teams |
| `difficulty` | String | easy/medium/hard |

## Difficulty Levels

- **easy**: Current grid drivers, world champions, household names
- **medium**: Recent retirees (2020s), midfield drivers
- **hard**: Rookies, reserve drivers, obscure names

## Data Source

- Primary: API-Sports F1 API (https://api-sports.io)
- Supplemented with manual corrections for historical accuracy

## Example Rows

```csv
20,Lewis Hamilton,HAM,British,GB,1985-01-07,,7,105,202,4829,Scuderia Ferrari,Ferrari|Mercedes|McLaren,easy
1001,Ayrton Senna,SEN,Brazilian,BR,1960-03-21,1994-05-01,3,41,80,614,Deceased,McLaren|Lotus|Toleman,easy
```

Note: For deceased drivers, `death_date` is used to calculate their age at death (not current age).

## Teams History Format

Teams are listed in reverse chronological order, separated by `|`:
```
Ferrari|Mercedes|McLaren
```
(Most recent first)


