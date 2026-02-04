#!/usr/bin/env python3
"""
Re-fetch movies that are missing image data from the IMDb API.

This script:
1. Queries Supabase for movies where raw_data lacks primaryImage
2. Fetches fresh data from IMDb API (with all available fields)
3. Updates both movies_raw and movies tables

Usage:
    python3 refetch_movies_with_images.py

Rate limits: ~10 requests/second on paid tier, will save progress on 429

Fields captured from IMDb API:
- primaryImage (movie poster)
- cast[].primaryImage (actor photos)
- cast[].fullName, job, characters
- directors[].fullName, primaryImage
- genres, countriesOfOrigin, spokenLanguages
- plotSummary (for future use)
- contentRating (PG, R, etc)
- keywords
- awards info
"""

import json
import os
import time
import urllib.request
from urllib.error import HTTPError, URLError
from datetime import datetime

# ============ CONFIGURATION ============

# Supabase config
SUPABASE_URL = os.environ.get('SUPABASE_URL', 'https://qdrtfwmcscpnmxvufulr.supabase.co')
SUPABASE_ANON_KEY = os.environ.get('SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkcnRmd21jc2Nwbm14dnVmdWxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYxMTIzNzksImV4cCI6MjA1MTY4ODM3OX0.89MNchXuOcNLLsHMdS20nzCikFOEHsRY4V_q1LeDqEU')
# Service role key for writes (bypasses RLS)
SUPABASE_SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_KEY', '')

# RapidAPI config
RAPIDAPI_HOST = "imdb236.p.rapidapi.com"
RAPIDAPI_KEY = ""  # Will be loaded from file

# API key file location
API_KEY_FILE = "../../../.cursor/.api_keys.txt"

# Rate limiting
REQUESTS_PER_SECOND = 5  # Conservative to avoid 429
BATCH_SIZE = 10  # Save progress every N movies

# Output files
PROGRESS_FILE = "refetch_progress.json"
REMAINING_FILE = "remaining_to_refetch.json"

# ============ HELPER FUNCTIONS ============

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

def load_service_key():
    """Load Supabase service role key."""
    key_path = os.path.join(os.path.dirname(__file__), API_KEY_FILE)
    try:
        with open(key_path, 'r') as f:
            for line in f:
                if line.startswith('SUPABASE_SERVICE_KEY='):
                    return line.strip().split('=', 1)[1]
    except FileNotFoundError:
        pass
    return os.environ.get('SUPABASE_SERVICE_KEY', '')

def supabase_request(endpoint, method='GET', data=None, use_service_key=False):
    """Make a request to Supabase REST API."""
    url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    key = SUPABASE_SERVICE_KEY if use_service_key else SUPABASE_ANON_KEY
    
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json"
    }
    
    if method in ('POST', 'PATCH', 'PUT'):
        headers["Prefer"] = "return=representation"
    
    body = json.dumps(data).encode('utf-8') if data else None
    
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except HTTPError as e:
        error_body = e.read().decode('utf-8') if e.fp else ''
        print(f"  ❌ Supabase {method} error {e.code}: {error_body[:200]}")
        return None
    except URLError as e:
        print(f"  ❌ Supabase URL error: {e.reason}")
        return None

def fetch_imdb_details(imdb_id, api_key):
    """Fetch movie details from IMDb API."""
    url = f"https://{RAPIDAPI_HOST}/api/imdb/{imdb_id}"
    
    headers = {
        "x-rapidapi-host": RAPIDAPI_HOST,
        "x-rapidapi-key": api_key
    }
    
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=30) as response:
            return json.loads(response.read().decode('utf-8'))
    except HTTPError as e:
        if e.code == 429:
            print(f"  ⚠️ Rate limited! Saving progress...")
            return "RATE_LIMITED"
        print(f"  ❌ IMDb API error {e.code}")
        return None
    except URLError as e:
        print(f"  ❌ IMDb API URL error: {e.reason}")
        return None

def get_movies_missing_images():
    """Get list of movies that don't have image data in raw_data."""
    print("📊 Fetching movies from Supabase...")
    
    # Get all movies_raw entries
    raw_data = supabase_request("movies_raw?select=imdb_id,title,raw_data")
    
    if not raw_data:
        print("❌ Failed to fetch movies_raw")
        return []
    
    print(f"   Found {len(raw_data)} total movies in database")
    
    # Filter to movies missing primaryImage
    missing = []
    for movie in raw_data:
        raw = movie.get('raw_data', {})
        if not raw.get('primaryImage'):
            missing.append({
                'imdb_id': movie['imdb_id'],
                'title': movie['title']
            })
    
    print(f"   {len(missing)} movies missing image data")
    return missing

def process_raw_data(raw_data):
    """Extract processed movie data from raw API response."""
    if not raw_data:
        return None
    
    # Extract cast with images (top 10 actors)
    cast_members = []
    raw_cast = raw_data.get('cast', [])
    
    for person in raw_cast:
        if isinstance(person, dict):
            job = person.get('job', '')
            if job == 'actor':
                cast_members.append(person.get('fullName', ''))
                if len(cast_members) >= 10:
                    break
        elif isinstance(person, str):
            cast_members.append(person)
            if len(cast_members) >= 10:
                break
    
    # Get director
    director = ''
    directors = raw_data.get('directors', [])
    if directors:
        if isinstance(directors[0], dict):
            director = directors[0].get('fullName', '')
        elif isinstance(directors[0], str):
            director = directors[0]
    
    # Build processed record
    return {
        'title': raw_data.get('primaryTitle', raw_data.get('originalTitle', '')),
        'director': director,
        'release_year': raw_data.get('startYear', 0),
        'runtime_minutes': raw_data.get('runtimeMinutes', 0),
        'imdb_rating': raw_data.get('averageRating', 0),
        'genres': raw_data.get('genres', [])[:3],
        'country': (raw_data.get('countriesOfOrigin', ['USA']) or ['USA'])[0],
        'cast_members': cast_members
    }

def save_progress(processed, remaining):
    """Save progress to file."""
    with open(PROGRESS_FILE, 'w') as f:
        json.dump({
            'processed_count': len(processed),
            'remaining_count': len(remaining),
            'last_updated': datetime.now().isoformat()
        }, f, indent=2)
    
    if remaining:
        with open(REMAINING_FILE, 'w') as f:
            json.dump(remaining, f, indent=2)
        print(f"   💾 Saved {len(remaining)} remaining to {REMAINING_FILE}")

def load_remaining():
    """Load remaining movies from previous run."""
    if os.path.exists(REMAINING_FILE):
        with open(REMAINING_FILE, 'r') as f:
            return json.load(f)
    return None

# ============ MAIN ============

def main():
    print("=" * 60)
    print("🎬 Movie Image Data Re-fetch Script")
    print("=" * 60)
    
    # Load API keys
    global RAPIDAPI_KEY, SUPABASE_SERVICE_KEY
    RAPIDAPI_KEY = load_api_key()
    SUPABASE_SERVICE_KEY = load_service_key()
    
    if not RAPIDAPI_KEY:
        print("❌ RapidAPI key not found")
        return
    
    if not SUPABASE_SERVICE_KEY:
        print("❌ Supabase service key not found (needed for writes)")
        return
    
    print("✅ API keys loaded")
    
    # Check for remaining from previous run
    remaining = load_remaining()
    if remaining:
        print(f"📂 Found {len(remaining)} movies from previous run")
        response = input("   Continue from where we left off? (y/n): ").strip().lower()
        if response != 'y':
            remaining = None
    
    # Get movies to process
    if not remaining:
        remaining = get_movies_missing_images()
    
    if not remaining:
        print("✅ All movies have image data!")
        return
    
    print(f"\n🚀 Starting to refetch {len(remaining)} movies...")
    print(f"   Rate: {REQUESTS_PER_SECOND} requests/second")
    print(f"   Saving every {BATCH_SIZE} movies")
    print()
    
    processed = []
    failed = []
    delay = 1.0 / REQUESTS_PER_SECOND
    
    for i, movie in enumerate(remaining[:], 1):  # Use copy for safe removal
        imdb_id = movie['imdb_id']
        title = movie['title']
        
        print(f"[{i}/{len(remaining)}] {title} ({imdb_id})...")
        
        # Fetch from IMDb API
        raw_data = fetch_imdb_details(imdb_id, RAPIDAPI_KEY)
        
        if raw_data == "RATE_LIMITED":
            # Save progress and exit
            save_progress(processed, remaining)
            print(f"\n⏸️ Rate limited after {len(processed)} movies")
            print(f"   Run again later to continue with remaining {len(remaining)} movies")
            return
        
        if not raw_data:
            failed.append(movie)
            remaining.remove(movie)
            continue
        
        # Update movies_raw
        raw_update = {
            'raw_data': raw_data,
            'fetched_at': datetime.now().isoformat()
        }
        
        result = supabase_request(
            f"movies_raw?imdb_id=eq.{imdb_id}",
            method='PATCH',
            data=raw_update,
            use_service_key=True
        )
        
        if result is None:
            print(f"  ⚠️ Failed to update movies_raw")
        
        # Update movies table with processed data
        movie_data = process_raw_data(raw_data)
        if movie_data:
            result = supabase_request(
                f"movies?imdb_id=eq.{imdb_id}",
                method='PATCH',
                data=movie_data,
                use_service_key=True
            )
            if result is None:
                print(f"  ⚠️ Failed to update movies")
        
        processed.append(movie)
        remaining.remove(movie)
        
        # Check for poster
        has_poster = bool(raw_data.get('primaryImage'))
        cast_with_images = sum(1 for c in raw_data.get('cast', [])[:10] 
                               if isinstance(c, dict) and c.get('primaryImage'))
        print(f"  ✅ Poster: {'Yes' if has_poster else 'No'}, Actor images: {cast_with_images}")
        
        # Save progress periodically
        if len(processed) % BATCH_SIZE == 0:
            save_progress(processed, remaining)
        
        # Rate limiting
        time.sleep(delay)
    
    # Final save
    save_progress(processed, remaining)
    
    # Clean up remaining file if done
    if not remaining and os.path.exists(REMAINING_FILE):
        os.remove(REMAINING_FILE)
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 REFETCH SUMMARY")
    print("=" * 60)
    print(f"   ✅ Processed: {len(processed)}")
    print(f"   ❌ Failed:    {len(failed)}")
    print(f"   ⏳ Remaining: {len(remaining)}")
    
    if failed:
        print("\nFailed movies:")
        for m in failed[:10]:
            print(f"   - {m['title']} ({m['imdb_id']})")

if __name__ == "__main__":
    main()
