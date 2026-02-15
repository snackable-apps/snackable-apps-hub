# Movies Quiz Performance Optimization

## Current State (2026-02-02)

### Problem
The movies API returns ~3.2 MB of data (1,980 movies with full cast, images, etc.) taking 7-8 seconds to load on initial page visit.

### Current Solution: localStorage Caching
- **Implemented**: localStorage caching with 24-hour expiry
- **Benefits**: 
  - Instant load on subsequent visits
  - Background refresh keeps data fresh
  - Fallback to expired cache if API fails
- **Limitations**:
  - First visit still slow (~7-8 seconds)
  - Uses ~3MB of localStorage quota

## Future Optimization Options

### Option A: Server-Side Pagination / Lazy Loading
- Only load ~100 movies initially for autocomplete
- Load full details when user selects a movie
- **Pros**: Dramatically faster initial load (~100KB vs 3MB)
- **Cons**: Requires API changes; autocomplete limited; more network requests

### Option B: Compressed/Minified Response
- Enable gzip compression on API
- Strip duplicate fields (e.g., `cast` and `castWithImages` have overlap)
- Remove null image URLs
- **Estimated reduction**: 60-70%
- **Cons**: Still large payload; requires API modification

### Option C: Static JSON File + CDN ⭐ Recommended
- Pre-generate a static JSON file during build
- Host on CDN (Vercel Edge, Cloudflare)
- Update via cron job or on data changes
- **Pros**: Fastest possible load; edge caching; cheap
- **Cons**: Not real-time; requires build pipeline

### Option D: Two-Stage Load ⭐ Best UX
Create two endpoints:
1. **Light endpoint** (~200KB): title, releaseYear, director, difficulty, posterUrl
2. **Full endpoint**: Called on-demand for selected movie

**Implementation:**
```javascript
// Stage 1: Load light data for autocomplete
const lightData = await fetch('/api/movies/light');
ALL_MOVIES_LIGHT = lightData.movies;

// Stage 2: When guess is made, fetch full movie if needed
async function getFullMovieData(title) {
  if (movieCache.has(title)) return movieCache.get(title);
  const full = await fetch(`/api/movies/${encodeURIComponent(title)}`);
  movieCache.set(title, full);
  return full;
}
```

**Pros**: Best balance of speed and functionality
**Cons**: Requires API changes; slightly more complex frontend

### Option E: Service Worker + Cache API
- Use Service Worker to cache API responses
- More control than localStorage
- Works offline
- **Cons**: More complex implementation

## Data Size Breakdown (Approximate)

| Field | Size per movie | Total (1,980 movies) |
|-------|---------------|---------------------|
| title, director, year, rating | ~100 bytes | ~200 KB |
| genres, country | ~50 bytes | ~100 KB |
| cast (10 names) | ~200 bytes | ~400 KB |
| castWithImages (10 with URLs) | ~800 bytes | ~1.6 MB |
| posterUrl | ~100 bytes | ~200 KB |
| **Total** | ~1.25 KB | **~2.5 MB** |

**Recommendation**: Remove `cast` array (redundant with `castWithImages`), compress images URLs, and consider Option D for best UX.

## API Endpoint Ideas

```
GET /api/movies/light
Returns: [{title, releaseYear, director, difficulty, posterUrl}]
Size: ~200-300 KB

GET /api/movies/full/{title}
Returns: Full movie object with cast, images, etc.
Size: ~2 KB per movie

GET /api/movies/daily
Returns: Today's movie with full details
Size: ~2 KB
```

## Implementation Priority

1. ✅ localStorage caching (done)
2. 🔜 Enable gzip on API (quick win)
3. 🔜 Create light/full endpoints (best UX)
4. 🔜 CDN for static assets (best performance)
