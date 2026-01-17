# Books Quiz - Data Management

## Overview

The Books Quiz uses a **manual database** with optional API assistance.

**Why manual?** Classic book data is static - pages, year, author never change.
The API is only useful for fetching details when adding new books.

## Current Database

- **35 books** (20 initial + 15 added Jan 2026)
- Mix of classics and modern bestsellers
- Multiple genres, languages, and nationalities

## Adding New Books

### Option 1: Manual (Recommended for Classics)

Just add entries directly to `books_data.js`:

```javascript
{
  "title": "Book Title",
  "author": "Author Name",
  "authorNationality": "Country",  // Author's country of origin
  "genre": "Fiction",              // Primary genre
  "publicationYear": 1950,
  "pageCount": 300,
  "originalLanguage": "English",
  "difficulty": "easy"             // easy, medium, or hard
}
```

### Option 2: API-Assisted

Use `add_books.py` to fetch details from Goodreads.

**⚠️ Limitations:**
- 30 requests/month on basic plan
- Search often returns derivative works (study guides, etc.)
- Better to use specific Goodreads book IDs

**Usage:**
```bash
# Modify the titles list in the script
python3 add_books.py
```

## Difficulty Guidelines

| Difficulty | Description |
|------------|-------------|
| `easy` | Famous books everyone knows (1984, Harry Potter, etc.) |
| `medium` | Well-known classics (Jane Eyre, Dune, etc.) |
| `hard` | Lesser-known works (should NOT be daily secret) |

## API Details

**Provider:** Goodreads (via RapidAPI)
**Limit:** 30 requests/month (basic plan)
**Endpoints:**
- `searchBooks?keyword=X` - Search by title
- `getBookByID?bookID=X` - Get details by Goodreads ID

## Data Sources

- **Goodreads** - For page counts, publication years
- **Wikipedia** - For author nationalities
- **Manual curation** - For genre and difficulty
