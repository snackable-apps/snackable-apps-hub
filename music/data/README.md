# Music Quiz Database

## Overview

The music database contains songs with the following properties:
- Song name, Artist name
- Genre, Decade
- Duration
- Artist country, Group members, Language
- Difficulty

## Data Structure

```javascript
{
  "songName": "Bohemian Rhapsody",
  "artistName": "Queen",
  "genre": "Rock",
  "releaseDecade": "1970s",
  "duration": "5:55",
  "artistCountry": ["UK"],
  "groupMembers": 4,
  "language": ["English"],
  "difficulty": "easy"
}
```

## Updating the Database

### Manual Updates

1. Edit `music_data.js` directly
2. Follow the existing format
3. All properties are required

### API Updates (Spotify)

**API**: Spotify23 on RapidAPI  
**Cost**: Free = 500 req/month, Paid = $10 for 10,000/month  
**Requests per song**: 2-3

#### Process

1. **Add to queue**: Edit `import_queue.txt`
   ```
   Bohemian Rhapsody - Queen
   Billie Jean - Michael Jackson
   ```

2. **Run import**: `python3 import_music.py`

3. **Review**: Check `new_songs.json`

4. **Fill manual properties**:
   | Property | From API | Manual |
   |----------|----------|--------|
   | songName | ✅ | — |
   | artistName | ✅ | — |
   | genre | ✅ (mapped) | — |
   | releaseDecade | ✅ | — |
   | duration | ✅ | — |
   | artistCountry | ❌ | ✅ Required |
   | groupMembers | ❌ | ✅ Required |
   | language | ❌ | ✅ Required |
   | difficulty | ❌ | ✅ Required |

5. **Clean up**: Remove `_spotify*` fields

6. **Merge**: Add to `music_data.js`

### Genre Mapping

Spotify genres are mapped to our simplified categories:

| Spotify | Our Genre |
|---------|-----------|
| hip hop, rap | Hip-Hop |
| r&b, soul | R&B |
| rock, alt rock | Rock |
| electronic, edm, house | Electronic |
| indie, alternative | Indie |
| latin, reggaeton | Latin |
| (default) | Pop |

## Files

| File | Purpose |
|------|---------|
| `music_data.js` | Main database |
| `music.csv` | CSV backup |
| `import_music.py` | Spotify import script |
| `import_queue.txt` | Songs pending import |
| `new_songs.json` | Recently imported (review) |
| `import_log.txt` | Import history |

## Current Statistics

- **Total Songs**: ~80
- **Last Updated**: 2026-01-17
