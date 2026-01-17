#!/usr/bin/env python3
"""
Tennis Quiz - Rankings Update Script
=====================================

This script fetches current ATP rankings from the FlashLive Sports API
and merges them with our manual player stats to generate players_data.js

Usage:
    python3 update_rankings.py

API Used:
    FlashLive Sports (flashlive-sports.p.rapidapi.com)
    - Rankings endpoint: /v1/rankings/data?ranking_id=dSJr14Y8 (ATP Singles)

No external dependencies required - uses only Python standard library.
"""

import json
import os
import urllib.request
import urllib.parse
from datetime import datetime

# =============================================================================
# CONFIGURATION
# =============================================================================

# RapidAPI credentials
RAPIDAPI_KEY = "ea015ba987msh2b34628eb575af3p1c02a8jsn8960cb255978"
RAPIDAPI_HOST = "flashlive-sports.p.rapidapi.com"

# FlashLive API endpoints
RANKINGS_URL = "https://flashlive-sports.p.rapidapi.com/v1/rankings/data"

# ATP Singles ranking ID (from FlashLive API)
ATP_SINGLES_RANKING_ID = "dSJr14Y8"

# File paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MANUAL_STATS_FILE = os.path.join(SCRIPT_DIR, "manual_stats.json")
OUTPUT_FILE = os.path.join(SCRIPT_DIR, "players_data.js")

# Retired player ranking value
RETIRED_RANKING = 9999

# =============================================================================
# API FUNCTIONS
# =============================================================================

def fetch_atp_rankings():
    """Fetch current ATP Singles rankings from FlashLive API."""
    print("📡 Fetching ATP rankings from FlashLive API...")
    
    params = urllib.parse.urlencode({
        "ranking_id": ATP_SINGLES_RANKING_ID,
        "locale": "en_INT"
    })
    
    url = f"{RANKINGS_URL}?{params}"
    
    headers = {
        "X-RapidAPI-Key": RAPIDAPI_KEY,
        "X-RapidAPI-Host": RAPIDAPI_HOST
    }
    
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=30) as response:
            data = json.loads(response.read().decode("utf-8"))
        
        rankings = {}
        for player in data.get("DATA", []):
            # Parse rank (comes as "1.", "2.", etc.)
            rank_str = player.get("RANK", "").replace(".", "").strip()
            try:
                rank = int(rank_str)
            except ValueError:
                continue
            
            # Get player name (comes as "Lastname Firstname")
            name = player.get("PARTICIPANT_NAME", "")
            player_id = player.get("PARTICIPANT_ID", "")
            
            rankings[name] = {
                "rank": rank,
                "player_id": player_id,
                "points": player.get("RESULT", "")
            }
        
        print(f"✅ Fetched {len(rankings)} players from API")
        return rankings
        
    except Exception as e:
        print(f"❌ Error fetching rankings: {e}")
        return {}


# =============================================================================
# MAIN LOGIC
# =============================================================================

def load_manual_stats():
    """Load manual stats from JSON file."""
    print(f"📂 Loading manual stats from {MANUAL_STATS_FILE}...")
    
    try:
        with open(MANUAL_STATS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            players = data.get("players", [])
            print(f"✅ Loaded {len(players)} players from manual stats")
            return players
    except FileNotFoundError:
        print(f"❌ Manual stats file not found: {MANUAL_STATS_FILE}")
        return []
    except json.JSONDecodeError as e:
        print(f"❌ Error parsing manual stats: {e}")
        return []


def match_player_name(player_name, api_rankings):
    """Try to match a player name with API rankings."""
    player_name_lower = player_name.lower()
    name_parts = player_name_lower.split()
    
    for api_name, api_data in api_rankings.items():
        api_name_lower = api_name.lower()
        api_parts = api_name_lower.split()
        
        # API format is usually "Lastname Firstname"
        # Our format is "Firstname Lastname"
        
        if len(name_parts) >= 2 and len(api_parts) >= 2:
            our_first = name_parts[0]
            our_last = name_parts[-1]
            api_first = api_parts[-1]  # API has firstname last
            api_last = api_parts[0]    # API has lastname first
            
            # Check if names match (allow for variations)
            if our_last == api_last and our_first == api_first:
                return api_data
            
            # Partial match - last names must match, first initial
            if our_last == api_last and our_first[0] == api_first[0]:
                return api_data
            
            # Handle special cases like "De Minaur" -> "de minaur alex"
            if our_last in api_name_lower and our_first[0] == api_first[0]:
                return api_data
        
        # Direct substring match for edge cases
        if our_last in api_name_lower or api_name_lower in player_name_lower:
            return api_data
    
    return None


def generate_js_output(players, update_date):
    """Generate the players_data.js file content."""
    
    # Sort players: active by ranking, then retired alphabetically
    active = [p for p in players if p.get("currentRanking", 9999) < RETIRED_RANKING]
    retired = [p for p in players if p.get("currentRanking", 9999) >= RETIRED_RANKING]
    
    active.sort(key=lambda x: x.get("currentRanking", 9999))
    retired.sort(key=lambda x: x.get("name", ""))
    
    sorted_players = active + retired
    
    # Build JavaScript content
    js_lines = [
        "// Tennis Players Database",
        "// currentRanking: number for active players, 9999 for retired (displays as \"Retired\")",
        "// deathDate: for deceased players (age shown at death with †)",
        f"// Last updated: {update_date} (ATP Rankings via FlashLive API)",
        f'const DATA_UPDATE_DATE = "{update_date}";',
        "const RETIRED_RANKING = 9999;",
        "",
        "const PLAYERS_DATA = ["
    ]
    
    for i, player in enumerate(sorted_players):
        # Add comment for sections
        if i == 0 and active:
            js_lines.append("  // Active Players (by current ATP ranking)")
        elif i == len(active) and retired:
            js_lines.append("  // Retired Players")
        
        # Build player object
        player_lines = ["  {"]
        
        # Order of properties
        props = [
            ("name", player.get("name")),
            ("nationality", player.get("nationality", "Unknown")),
            ("birthdate", player.get("birthdate", "1990-01-01")),
            ("hand", player.get("hand", "Right")),
            ("backhand", player.get("backhand", "Two-handed")),
            ("grandSlamTitles", player.get("grandSlamTitles", 0)),
            ("careerTitles", player.get("careerTitles", 0)),
            ("highestRanking", player.get("highestRanking", 100)),
            ("currentRanking", player.get("currentRanking", RETIRED_RANKING)),
            ("turnedPro", player.get("turnedPro", 2000)),
            ("deathDate", player.get("deathDate")),
            ("difficulty", player.get("difficulty", "medium"))
        ]
        
        for j, (key, value) in enumerate(props):
            if value is None:
                formatted_value = "null"
            elif isinstance(value, str):
                formatted_value = f'"{value}"'
            else:
                formatted_value = str(value)
            
            comma = "," if j < len(props) - 1 else ""
            player_lines.append(f'    "{key}": {formatted_value}{comma}')
        
        # Close player object
        comma = "," if i < len(sorted_players) - 1 else ""
        player_lines.append(f"  }}{comma}")
        
        js_lines.extend(player_lines)
    
    js_lines.append("];")
    
    return "\n".join(js_lines)


def main():
    """Main function to update tennis rankings."""
    print("=" * 60)
    print("🎾 Tennis Quiz - Rankings Update Script")
    print("=" * 60)
    print()
    
    # Load manual stats
    manual_players = load_manual_stats()
    if not manual_players:
        print("❌ No manual stats found. Exiting.")
        return
    
    # Fetch API rankings
    api_rankings = fetch_atp_rankings()
    
    if not api_rankings:
        print("⚠️  Could not fetch API rankings. Using previous data.")
    
    # Process each player
    update_date = datetime.now().strftime("%Y-%m-%d")
    merged_players = []
    updated_count = 0
    retired_count = 0
    not_found_count = 0
    
    print()
    print("🔄 Processing players...")
    
    for player in manual_players:
        merged_player = {
            "name": player["name"],
            "nationality": player.get("nationality", "Unknown"),
            "birthdate": player.get("birthdate", "1990-01-01"),
            "hand": player.get("hand", "Right"),
            "backhand": player.get("backhand", "Two-handed"),
            "grandSlamTitles": player.get("grandSlamTitles", 0),
            "careerTitles": player.get("careerTitles", 0),
            "highestRanking": player.get("highestRanking", 100),
            "turnedPro": player.get("turnedPro", 2000),
            "deathDate": player.get("deathDate"),
            "difficulty": player.get("difficulty", "medium")
        }
        
        # Handle ranking
        if player.get("isRetired", False):
            merged_player["currentRanking"] = RETIRED_RANKING
            retired_count += 1
            print(f"  📕 {player['name']}: Retired")
        elif api_rankings:
            # Try to match with API
            api_match = match_player_name(player["name"], api_rankings)
            
            if api_match:
                merged_player["currentRanking"] = api_match["rank"]
                updated_count += 1
                print(f"  ✅ {player['name']}: #{api_match['rank']}")
            else:
                # Not found in top rankings
                merged_player["currentRanking"] = 500
                not_found_count += 1
                print(f"  ⚠️  {player['name']}: Not in top 100 (set to 500)")
        else:
            # API failed, keep a default
            merged_player["currentRanking"] = 100
        
        merged_players.append(merged_player)
    
    # Generate output
    print()
    print("📝 Generating players_data.js...")
    js_content = generate_js_output(merged_players, update_date)
    
    # Write to file
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write(js_content)
    
    print(f"✅ Saved to {OUTPUT_FILE}")
    print()
    print("=" * 60)
    print("🎉 Update complete!")
    print(f"   Total players: {len(merged_players)}")
    print(f"   ✅ Ranking updated: {updated_count}")
    print(f"   📕 Retired: {retired_count}")
    print(f"   ⚠️  Not in top 100: {not_found_count}")
    print("=" * 60)


if __name__ == "__main__":
    main()
