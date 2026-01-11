#!/usr/bin/env python3
"""
Script to convert drivers CSV to the JSON format used by the game.
Usage: python3 convert_csv_to_json.py drivers.csv
"""

import csv
import json
import sys
from datetime import datetime

def parse_csv_to_json(csv_file_path, output_file_path='drivers_data.js'):
    """
    Converts a drivers CSV file to the JSON format used by the game.
    """
    drivers = []
    
    with open(csv_file_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            # Parse teams history (pipe-separated)
            teams_history = [t.strip() for t in row['teams_history'].split('|')] if row['teams_history'].strip() else []
            
            # Parse numeric fields
            try:
                world_championships = int(row['world_championships'].strip()) if row['world_championships'].strip() else 0
                wins = int(row['wins'].strip()) if row['wins'].strip() else 0
                podiums = int(row['podiums'].strip()) if row['podiums'].strip() else 0
                career_points = float(row['career_points'].strip()) if row['career_points'].strip() else 0
                driver_id = int(row['id'].strip()) if row['id'].strip() else 0
            except ValueError as e:
                print(f"Warning: Invalid numeric value for {row['name']}: {e}")
                continue
            
            driver = {
                'id': driver_id,
                'name': row['name'].strip(),
                'abbr': row['abbr'].strip(),
                'nationality': row['nationality'].strip(),
                'countryCode': row['country_code'].strip(),
                'birthdate': row['birthdate'].strip(),
                'worldChampionships': world_championships,
                'wins': wins,
                'podiums': podiums,
                'careerPoints': career_points,
                'currentTeam': row['current_team'].strip(),
                'teamsHistory': teams_history,
                'difficulty': row['difficulty'].strip()
            }
            
            drivers.append(driver)
    
    # Generate output file
    current_date = datetime.now().strftime('%Y-%m-%d')
    
    output_content = f"""// F1 Quiz - Embedded drivers data
// =================================
// Last updated: {current_date}
// Source: API-Sports F1 API + Manual additions
// Method: hybrid (api + manual_csv)
// Notes: Modern era from API (2010+), legendary drivers added manually

const DATA_UPDATE_DATE = "{current_date}";
const DATA_SOURCE = "API-Sports F1 API + Manual";
const DATA_UPDATE_METHOD = "hybrid";

const DRIVERS_DATA = {json.dumps(drivers, ensure_ascii=False, indent=2)};

const ALL_DRIVERS = DRIVERS_DATA.map(d => d.name);
"""
    
    with open(output_file_path, 'w', encoding='utf-8') as f:
        f.write(output_content)
    
    print(f"✅ Successfully converted {len(drivers)} drivers from CSV to JSON")
    print(f"📁 Output file: {output_file_path}")
    
    # Show statistics
    difficulties = {}
    for d in drivers:
        diff = d['difficulty']
        difficulties[diff] = difficulties.get(diff, 0) + 1
    
    print(f"\n📈 Distribution by difficulty:")
    for diff in ['easy', 'medium', 'hard']:
        count = difficulties.get(diff, 0)
        print(f"   {diff}: {count} drivers")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python3 convert_csv_to_json.py <csv_file> [output_file]")
        print("Example: python3 convert_csv_to_json.py drivers.csv drivers_data.js")
        sys.exit(1)
    
    csv_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else 'drivers_data.js'
    
    try:
        parse_csv_to_json(csv_file, output_file)
    except FileNotFoundError:
        print(f"❌ Error: File '{csv_file}' not found")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

