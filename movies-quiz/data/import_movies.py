#!/usr/bin/env python3
"""
Movies Quiz - IMDB API Import Script

This script fetches movie details from the IMDB API and adds them to the database.

Usage:
    1. Add IMDB IDs to import_queue.txt (one per line)
    2. Run: python3 import_movies.py
    3. Review new_movies.json
    4. Merge into movies_data.js

API: https://rapidapi.com/apidojo/api/imdb236
Cost: ~1€/month for 10,000 requests (1 request per movie)

Rate Limits:
    - Free tier: 100 requests/month
    - Paid tier: 10,000 requests/month
"""

import json
import os
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
from datetime import datetime

# API Configuration
API_HOST = "imdb236.p.rapidapi.com"
API_KEY_FILE = "../../../.cursor/.api_keys.txt"

# Files
EXISTING_DB = "movies_data.js"
IMPORT_QUEUE = "import_queue.txt"
OUTPUT_FILE = "new_movies.json"
LOG_FILE = "import_log.txt"

def load_api_key():
    """Load RapidAPI key from config file."""
    key_path = os.path.join(os.path.dirname(__file__), API_KEY_FILE)
    try:
        with open(key_path, 'r') as f:
            for line in f:
                if line.startswith('RAPIDAPI_APP_KEY='):
                    return line.strip().split('=', 1)[1]
    except FileNotFoundError:
        print(f"❌ API key file not found: {key_path}")
    return None

def load_existing_movies():
    """Load existing movies to check for duplicates."""
    existing = set()
    try:
        with open(EXISTING_DB, 'r') as f:
            content = f.read()
            # Extract titles (simple pattern match)
            import re
            titles = re.findall(r'"title":\s*"([^"]+)"', content)
            existing = set(t.lower() for t in titles)
    except FileNotFoundError:
        print("⚠️ No existing database found")
    return existing

def load_import_queue():
    """Load IMDB IDs from queue file."""
    queue = []
    try:
        with open(IMPORT_QUEUE, 'r') as f:
            for line in f:
                line = line.strip()
                # Accept tt1234567 format or just the ID
                if line and not line.startswith('#'):
                    if not line.startswith('tt'):
                        line = f'tt{line}'
                    queue.append(line)
    except FileNotFoundError:
        print(f"⚠️ No queue file found. Create {IMPORT_QUEUE} with IMDB IDs.")
    return queue

def fetch_movie_details(imdb_id, api_key):
    """Fetch movie details from IMDB API."""
    url = f"https://{API_HOST}/api/imdb/{imdb_id}"
    
    headers = {
        "x-rapidapi-host": API_HOST,
        "x-rapidapi-key": api_key
    }
    
    try:
        req = Request(url, headers=headers)
        with urlopen(req, timeout=30) as response:
            data = json.loads(response.read().decode('utf-8'))
            return data
    except HTTPError as e:
        print(f"  ❌ HTTP Error {e.code}: {e.reason}")
        return None
    except URLError as e:
        print(f"  ❌ URL Error: {e.reason}")
        return None
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return None

def fetch_movie_cast(imdb_id, api_key):
    """Fetch movie cast from IMDB API."""
    url = f"https://{API_HOST}/api/imdb/cast/{imdb_id}/principals"
    
    headers = {
        "x-rapidapi-host": API_HOST,
        "x-rapidapi-key": api_key
    }
    
    try:
        req = Request(url, headers=headers)
        with urlopen(req, timeout=30) as response:
            data = json.loads(response.read().decode('utf-8'))
            return data
    except HTTPError as e:
        print(f"  ❌ Cast HTTP Error {e.code}: {e.reason}")
        return []
    except Exception as e:
        print(f"  ❌ Cast Error: {e}")
        return []

def parse_movie(details, cast_data):
    """Parse API response into our database format."""
    if not details:
        return None
    
    # Extract basic info
    title = details.get('primaryTitle', details.get('originalTitle', ''))
    if not title:
        return None
    
    # Extract year
    year = details.get('startYear', 0)
    
    # Extract runtime
    runtime = details.get('runtimeMinutes', 0)
    
    # Extract rating
    rating = details.get('averageRating', 0)
    
    # Extract genres
    genres = details.get('genres', [])
    if isinstance(genres, str):
        genres = [g.strip() for g in genres.split(',')]
    
    # Extract country (from production countries if available)
    countries = details.get('countriesOfOrigin', [])
    country = countries[0] if countries else 'USA'
    
    # Parse cast - get top actors
    cast = []
    if cast_data:
        for person in cast_data[:10]:  # Top 10
            name = person.get('name', {})
            if isinstance(name, dict):
                full_name = name.get('nameText', {}).get('text', '')
            else:
                full_name = str(name)
            if full_name:
                cast.append(full_name)
    
    # Determine difficulty based on rating and popularity
    if rating >= 8.0:
        difficulty = 'easy'
    elif rating >= 7.0:
        difficulty = 'medium'
    else:
        difficulty = 'hard'
    
    return {
        "title": title,
        "director": "",  # Not easily available in basic endpoint
        "directorNationality": "",
        "genres": genres[:3],  # Max 3 genres
        "releaseYear": year,
        "runtimeMinutes": runtime,
        "imdbRating": rating,
        "country": country,
        "cast": cast[:6],  # Top 6 actors
        "difficulty": difficulty,
        "_imdbId": details.get('id', '')  # Keep for reference
    }

def log_import(message):
    """Log import activity."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with open(LOG_FILE, 'a') as f:
        f.write(f"[{timestamp}] {message}\n")
    print(message)

def main():
    print("=" * 50)
    print("🎬 Movies Quiz - IMDB Import Script")
    print("=" * 50)
    
    # Load API key
    api_key = load_api_key()
    if not api_key:
        print("❌ Cannot proceed without API key")
        return
    print("✅ API key loaded")
    
    # Load existing movies for duplicate check
    existing = load_existing_movies()
    print(f"📊 Found {len(existing)} existing movies in database")
    
    # Load import queue
    queue = load_import_queue()
    if not queue:
        print("❌ No movies in queue to import")
        print(f"   Add IMDB IDs to {IMPORT_QUEUE}")
        return
    print(f"📋 {len(queue)} movies in import queue")
    
    # Process queue
    new_movies = []
    skipped = []
    failed = []
    requests_used = 0
    
    for imdb_id in queue:
        print(f"\n🎬 Processing {imdb_id}...")
        
        # Fetch details (1 request)
        details = fetch_movie_details(imdb_id, api_key)
        requests_used += 1
        
        if not details:
            failed.append(imdb_id)
            continue
        
        title = details.get('primaryTitle', '')
        print(f"   Found: {title}")
        
        # Check for duplicates
        if title.lower() in existing:
            print(f"   ⏭️ Skipping (already exists)")
            skipped.append(title)
            continue
        
        # Fetch cast (1 more request)
        cast_data = fetch_movie_cast(imdb_id, api_key)
        requests_used += 1
        
        # Parse into our format
        movie = parse_movie(details, cast_data)
        if movie:
            new_movies.append(movie)
            print(f"   ✅ Added: {movie['title']} ({movie['releaseYear']})")
            print(f"      Cast: {', '.join(movie['cast'][:3])}...")
    
    # Save results
    if new_movies:
        with open(OUTPUT_FILE, 'w') as f:
            json.dump(new_movies, f, indent=2)
        print(f"\n💾 Saved {len(new_movies)} new movies to {OUTPUT_FILE}")
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 IMPORT SUMMARY")
    print("=" * 50)
    print(f"   ✅ Added:    {len(new_movies)}")
    print(f"   ⏭️ Skipped:  {len(skipped)}")
    print(f"   ❌ Failed:   {len(failed)}")
    print(f"   📡 Requests: {requests_used}")
    print("")
    
    # Log
    log_import(f"Imported {len(new_movies)} movies, skipped {len(skipped)}, failed {len(failed)}, used {requests_used} requests")
    
    if new_movies:
        print("👉 Next steps:")
        print(f"   1. Review {OUTPUT_FILE}")
        print(f"   2. Add director info manually")
        print(f"   3. Merge into {EXISTING_DB}")

if __name__ == "__main__":
    main()
