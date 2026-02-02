# Data Explorer

Internal tool to browse and inspect game databases.

## Access

- **Production**: https://snackable-games.com/data-explorer/
- **Local**: http://localhost:8000/data-explorer/

## Features

- **Database selector**: Switch between different game databases
- **Total count**: Shows total records in database
- **Filtered count**: Shows matching records when filters applied
- **Column sorting**: Click headers to sort ascending/descending
- **Filters**: Text search, number ranges, dropdown selects
- **Color-coded ratings**: Green (8+), Yellow (6.5-8), Red (<6.5)

## Supported Databases

| Database | Status | Source |
|----------|--------|--------|
| Movies | Active | Supabase API |
| Tennis | Coming soon | — |
| F1 | Coming soon | — |
| Football | Coming soon | — |

## Adding a New Database

1. Add endpoint to `API_ENDPOINTS` in `js/explorer.js`:
```javascript
const API_ENDPOINTS = {
    movies: 'https://snackable-api.vercel.app/api/movies',
    tennis: 'https://snackable-api.vercel.app/api/tennis'  // new
};
```

2. Define columns in `COLUMNS`:
```javascript
const COLUMNS = {
    tennis: [
        { key: 'name', label: 'Name', filterable: true, type: 'text' },
        { key: 'country', label: 'Country', filterable: true, type: 'text' },
        // ... more columns
    ]
};
```

3. Enable in HTML dropdown:
```html
<option value="tennis">Tennis</option>
```

## Column Types

| Type | Description | Filter UI |
|------|-------------|-----------|
| `text` | String values | Text input |
| `number` | Numeric values | Min/Max inputs |
| `array` | Array of strings | Text search (any match) |
| `select` | Fixed options | Dropdown |

## Files

| File | Purpose |
|------|---------|
| `index.html` | Main page structure |
| `css/explorer.css` | Styling (dark theme) |
| `js/explorer.js` | Data loading, filtering, rendering |
