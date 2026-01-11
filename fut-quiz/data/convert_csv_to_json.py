#!/usr/bin/env python3
"""
Script para converter CSV de jogadores para o formato JSON usado pelo jogo.
Uso: python3 convert_csv_to_json.py players.csv
"""

import csv
import json
import sys
from datetime import datetime

def parse_csv_to_json(csv_file_path, output_file_path='players_data.js'):
    """
    Converte um arquivo CSV de jogadores para o formato JSON usado pelo jogo.
    """
    players = []
    
    with open(csv_file_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            # Parse arrays (fields separated by |)
            leagues_played = [l.strip() for l in row['leaguesPlayed'].split('|')] if row['leaguesPlayed'].strip() else []
            individual_titles = [t.strip() for t in row['individualTitles'].split('|')] if row['individualTitles'].strip() else []
            team_titles = [t.strip() for t in row['teamTitles'].split('|')] if row['teamTitles'].strip() else []
            
            # Parse nationality (can be single or multiple)
            nationality = row['nationality'].strip()
            if '|' in nationality:
                nationality = [n.strip() for n in nationality.split('|')]
            
            # Parse boolean
            played_world_cup = row['playedWorldCup'].strip().lower() in ['yes', 'true', '1', 'sim']
            
            # Parse height (should be integer)
            try:
                height = int(row['height'].strip())
            except ValueError:
                print(f"Warning: Invalid height for {row['name']}: {row['height']}. Using 0.")
                height = 0
            
            # Create player object
            player = {
                'name': row['name'].strip(),
                'nationality': nationality,
                'currentClub': row['currentClub'].strip(),
                'leaguesPlayed': leagues_played,
                'primaryPosition': row['primaryPosition'].strip(),
                'dateOfBirth': row['dateOfBirth'].strip(),
                'preferredFoot': row['preferredFoot'].strip(),
                'height': height,
                'individualTitles': individual_titles,
                'teamTitles': team_titles,
                'playedWorldCup': played_world_cup,
                'difficulty': row['difficulty'].strip()
            }
            
            players.append(player)
    
    # Generate output file
    current_date = datetime.now().strftime('%Y-%m-%d')
    
    output_content = f"""// Embedded players data
// Last updated: {current_date}
const DATA_UPDATE_DATE = "{current_date}";
const PLAYERS_DATA = {json.dumps(players, ensure_ascii=False, indent=2)};

const ALL_PLAYERS = PLAYERS_DATA.map(p => p.name);
"""
    
    with open(output_file_path, 'w', encoding='utf-8') as f:
        f.write(output_content)
    
    print(f"✅ Successfully converted {len(players)} players from CSV to JSON")
    print(f"📁 Output file: {output_file_path}")
    print(f"📊 Total players: {len(players)}")
    
    # Show some statistics
    difficulties = {}
    for p in players:
        d = p['difficulty']
        difficulties[d] = difficulties.get(d, 0) + 1
    
    print(f"\n📈 Distribution by difficulty:")
    for diff in ['easy', 'medium', 'hard']:
        count = difficulties.get(diff, 0)
        print(f"   {diff}: {count} players")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python3 convert_csv_to_json.py <csv_file> [output_file]")
        print("Example: python3 convert_csv_to_json.py players.csv players_data.js")
        sys.exit(1)
    
    csv_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else 'players_data.js'
    
    try:
        parse_csv_to_json(csv_file, output_file)
    except FileNotFoundError:
        print(f"❌ Error: File '{csv_file}' not found")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)


