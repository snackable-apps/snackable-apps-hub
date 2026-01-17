#!/usr/bin/env python3
"""
Music Quiz - Spotify API Import Script

This script fetches song details from the Spotify API and adds them to the database.

Usage:
    1. Add songs to import_queue.txt (format: "Song Name - Artist")
    2. Run: python3 import_music.py
    3. Review new_songs.json
    4. Add manual properties (nationality, groupMembers, language, difficulty)
    5. Merge into music_data.js

API: https://rapidapi.com/Glavier/api/spotify23
Cost: Free tier = 500 requests/month, Paid = $10 for 10,000/month

Requests per song: 2-3
    - Search: 1 request
    - Artist details (for genre): 1 request
    - Album details (for year): 1 request (optional, year often in search)
"""

import json
import os
import re
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
from datetime import datetime
import time

# API Configuration
API_HOST = "spotify23.p.rapidapi.com"
API_KEY_FILE = "../../../../.cursor/.api_keys.txt"

# Files
EXISTING_DB = "music_data.js"
IMPORT_QUEUE = "import_queue.txt"
OUTPUT_FILE = "new_songs.json"
LOG_FILE = "import_log.txt"

# Rate limiting
REQUEST_DELAY = 0.5  # seconds between requests

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

def load_existing_songs():
    """Load existing songs to check for duplicates."""
    existing = set()
    try:
        with open(EXISTING_DB, 'r') as f:
            content = f.read()
            # Extract song titles (simple pattern match)
            titles = re.findall(r'"songName":\s*"([^"]+)"', content)
            existing = set(t.lower() for t in titles)
    except FileNotFoundError:
        print("⚠️ No existing database found")
    return existing

def load_import_queue():
    """Load songs from queue file. Format: 'Song Name - Artist' per line."""
    queue = []
    try:
        with open(IMPORT_QUEUE, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    queue.append(line)
    except FileNotFoundError:
        print(f"⚠️ No queue file found. Create {IMPORT_QUEUE}")
    return queue

def api_request(url, api_key):
    """Make API request with rate limiting."""
    headers = {
        "x-rapidapi-host": API_HOST,
        "x-rapidapi-key": api_key
    }
    
    try:
        req = Request(url, headers=headers)
        time.sleep(REQUEST_DELAY)  # Rate limiting
        with urlopen(req, timeout=30) as response:
            return json.loads(response.read().decode('utf-8'))
    except HTTPError as e:
        if e.code == 429:
            print(f"  ⚠️ Rate limited! Waiting 60s...")
            time.sleep(60)
            return api_request(url, api_key)  # Retry
        print(f"  ❌ HTTP Error {e.code}: {e.reason}")
        return None
    except URLError as e:
        print(f"  ❌ URL Error: {e.reason}")
        return None
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return None

def search_track(query, api_key):
    """Search for a track by name and artist."""
    from urllib.parse import quote
    encoded_query = quote(query)
    url = f"https://{API_HOST}/search/?q={encoded_query}&type=tracks&offset=0&limit=1"
    
    data = api_request(url, api_key)
    if not data:
        return None
    
    tracks = data.get('tracks', {}).get('items', [])
    if not tracks:
        return None
    
    return tracks[0].get('data', {})

def get_artist_details(artist_id, api_key):
    """Get artist details including genres."""
    url = f"https://{API_HOST}/artists/?ids={artist_id}"
    
    data = api_request(url, api_key)
    if not data:
        return None
    
    artists = data.get('artists', [])
    if not artists:
        return None
    
    return artists[0]

def get_album_details(album_id, api_key):
    """Get album details including release date."""
    url = f"https://{API_HOST}/albums/?ids={album_id}"
    
    data = api_request(url, api_key)
    if not data:
        return None
    
    albums = data.get('albums', [])
    if not albums:
        return None
    
    return albums[0]

def extract_artist_id(uri):
    """Extract artist ID from Spotify URI."""
    # Format: spotify:artist:1dfeR4HaWDbWqFHLkxsg1d
    if uri and uri.startswith('spotify:artist:'):
        return uri.split(':')[2]
    return None

def extract_album_id(uri):
    """Extract album ID from Spotify URI."""
    if uri and uri.startswith('spotify:album:'):
        return uri.split(':')[2]
    return None

def parse_duration(ms):
    """Convert milliseconds to MM:SS format."""
    if not ms:
        return "0:00"
    seconds = int(ms / 1000)
    minutes = seconds // 60
    secs = seconds % 60
    return f"{minutes}:{secs:02d}"

def calculate_decade(year):
    """Calculate decade from year."""
    if not year:
        return "2020s"
    decade = (year // 10) * 10
    return f"{decade}s"

def map_genre(spotify_genres):
    """Map Spotify genres to our simplified genre categories."""
    if not spotify_genres:
        return "Pop"
    
    genre_lower = ' '.join(spotify_genres).lower()
    
    # Priority order for genre mapping
    if 'hip hop' in genre_lower or 'rap' in genre_lower:
        return "Hip-Hop"
    if 'r&b' in genre_lower or 'soul' in genre_lower:
        return "R&B"
    if 'rock' in genre_lower:
        return "Rock"
    if 'metal' in genre_lower:
        return "Metal"
    if 'punk' in genre_lower:
        return "Punk"
    if 'jazz' in genre_lower:
        return "Jazz"
    if 'blues' in genre_lower:
        return "Blues"
    if 'country' in genre_lower:
        return "Country"
    if 'folk' in genre_lower:
        return "Folk"
    if 'reggae' in genre_lower:
        return "Reggae"
    if 'electronic' in genre_lower or 'edm' in genre_lower or 'house' in genre_lower or 'techno' in genre_lower:
        return "Electronic"
    if 'dance' in genre_lower or 'disco' in genre_lower:
        return "Dance"
    if 'indie' in genre_lower or 'alternative' in genre_lower:
        return "Indie"
    if 'latin' in genre_lower or 'reggaeton' in genre_lower:
        return "Latin"
    if 'classical' in genre_lower:
        return "Classical"
    
    return "Pop"  # Default

def process_song(query, api_key, requests_used):
    """Process a single song query and return song data + requests used."""
    print(f"\n🎵 Searching: {query}")
    
    # 1. Search for track
    track = search_track(query, api_key)
    requests_used += 1
    
    if not track:
        print(f"  ❌ Not found")
        return None, requests_used
    
    song_name = track.get('name', '')
    duration_ms = track.get('duration', {}).get('totalMilliseconds', 0)
    
    # Get artist info
    artists_data = track.get('artists', {}).get('items', [])
    artist_name = artists_data[0].get('profile', {}).get('name', '') if artists_data else ''
    artist_uri = artists_data[0].get('uri', '') if artists_data else ''
    
    # Get album info
    album_data = track.get('albumOfTrack', {})
    album_name = album_data.get('name', '')
    album_uri = album_data.get('uri', '')
    
    print(f"  Found: {song_name} by {artist_name}")
    
    # 2. Get artist details for genre
    genres = []
    artist_id = extract_artist_id(artist_uri)
    if artist_id:
        artist_details = get_artist_details(artist_id, api_key)
        requests_used += 1
        if artist_details:
            genres = artist_details.get('genres', [])
            print(f"  Genres: {', '.join(genres[:3]) if genres else 'None found'}")
    
    # 3. Get album for release year (optional - try to extract from album name first)
    release_year = None
    album_id = extract_album_id(album_uri)
    if album_id:
        album_details = get_album_details(album_id, api_key)
        requests_used += 1
        if album_details:
            release_date = album_details.get('release_date', '')
            if release_date:
                release_year = int(release_date[:4])
                print(f"  Year: {release_year}")
    
    # Build song object
    song = {
        "songName": song_name,
        "artistName": artist_name,
        "genre": map_genre(genres),
        "releaseDecade": calculate_decade(release_year),
        "duration": parse_duration(duration_ms),
        "artistCountry": ["TODO"],  # Manual
        "groupMembers": 1,  # Manual - default solo
        "language": ["English"],  # Manual - default English
        "difficulty": "medium",  # Manual
        "_spotifyGenres": genres[:5],  # Keep for reference
        "_releaseYear": release_year,
        "_spotifyId": track.get('id', '')
    }
    
    return song, requests_used

def log_import(message):
    """Log import activity."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with open(LOG_FILE, 'a') as f:
        f.write(f"[{timestamp}] {message}\n")
    print(message)

def main():
    print("=" * 50)
    print("🎵 Music Quiz - Spotify Import Script")
    print("=" * 50)
    
    # Load API key
    api_key = load_api_key()
    if not api_key:
        print("❌ Cannot proceed without API key")
        return
    print("✅ API key loaded")
    
    # Load existing songs for duplicate check
    existing = load_existing_songs()
    print(f"📊 Found {len(existing)} existing songs in database")
    
    # Load import queue
    queue = load_import_queue()
    if not queue:
        print("❌ No songs in queue to import")
        print(f"   Add songs to {IMPORT_QUEUE}")
        print("   Format: 'Song Name - Artist' per line")
        return
    print(f"📋 {len(queue)} songs in import queue")
    
    # Process queue
    new_songs = []
    skipped = []
    failed = []
    requests_used = 0
    
    for query in queue:
        # Extract song name for duplicate check
        song_name = query.split(' - ')[0].strip() if ' - ' in query else query
        
        if song_name.lower() in existing:
            print(f"\n⏭️ Skipping '{song_name}' (already exists)")
            skipped.append(song_name)
            continue
        
        song, requests_used = process_song(query, api_key, requests_used)
        
        if song:
            new_songs.append(song)
            print(f"  ✅ Added")
        else:
            failed.append(query)
    
    # Save results
    if new_songs:
        with open(OUTPUT_FILE, 'w') as f:
            json.dump(new_songs, f, indent=2)
        print(f"\n💾 Saved {len(new_songs)} new songs to {OUTPUT_FILE}")
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 IMPORT SUMMARY")
    print("=" * 50)
    print(f"   ✅ Added:    {len(new_songs)}")
    print(f"   ⏭️ Skipped:  {len(skipped)}")
    print(f"   ❌ Failed:   {len(failed)}")
    print(f"   📡 Requests: {requests_used}")
    print("")
    
    # Log
    log_import(f"Imported {len(new_songs)} songs, skipped {len(skipped)}, failed {len(failed)}, used {requests_used} requests")
    
    if new_songs:
        print("👉 Next steps:")
        print(f"   1. Review {OUTPUT_FILE}")
        print("   2. Fill in manual properties:")
        print("      - artistCountry (replace TODO)")
        print("      - groupMembers (1 for solo, count for bands)")
        print("      - language")
        print("      - difficulty (easy/medium/hard)")
        print(f"   3. Remove _spotify* fields")
        print(f"   4. Merge into {EXISTING_DB}")

if __name__ == "__main__":
    main()
