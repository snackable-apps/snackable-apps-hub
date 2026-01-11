// F1 Quiz - Embedded drivers data
// =================================
// Data reflects the 2025 season (through Abu Dhabi GP)
// Source: API-Sports F1 API + Manual additions
// Method: hybrid (api + manual_csv)
// Notes: Modern era from API (2010+), legendary drivers added manually

// Data freshness info
const DATA_SEASON = "2025";
const DATA_LAST_RACE = "Abu Dhabi GP";
const DATA_LAST_RACE_DATE = "2025-12-08";
const DATA_SCRIPT_DATE = "2026-01-10";
const DATA_SOURCE = "API-Sports F1 API + Manual";
const DATA_UPDATE_METHOD = "hybrid";

const DRIVERS_DATA = [
  {
    "id": 1,
    "name": "Nico Rosberg",
    "abbr": "ROS",
    "nationality": "German",
    "countryCode": "DE",
    "birthdate": "1985-06-27",
    "worldChampionships": 1,
    "wins": 23,
    "podiums": 57,
    "careerPoints": 1594.5,
    "currentTeam": "Retired",
    "teamsHistory": [
      "Mercedes",
      "Williams"
    ],
    "difficulty": "medium"
  },
  {
    "id": 2,
    "name": "Kevin Magnussen",
    "abbr": "MAG",
    "nationality": "Danish",
    "countryCode": "DK",
    "birthdate": "1992-10-05",
    "worldChampionships": 0,
    "wins": 0,
    "podiums": 1,
    "careerPoints": 189.0,
    "currentTeam": "Retired",
    "teamsHistory": [
      "Haas",
      "Renault",
      "McLaren"
    ],
    "difficulty": "medium"
  },
  {
    "id": 3,
    "name": "Jenson Button",
    "abbr": "BUT",
    "nationality": "British",
    "countryCode": "GB",
    "birthdate": "1980-01-19",
    "worldChampionships": 1,
    "wins": 15,
    "podiums": 50,
    "careerPoints": 1235.0,
    "currentTeam": "Retired",
    "teamsHistory": [
      "McLaren",
      "Brawn",
      "Honda",
      "BAR",
      "Williams",
      "Benetton"
    ],
    "difficulty": "medium"
  },
  {
    "id": 4,
    "name": "Fernando Alonso",
    "abbr": "ALO",
    "nationality": "Spanish",
    "countryCode": "ES",
    "birthdate": "1981-07-29",
    "worldChampionships": 2,
    "wins": 32,
    "podiums": 106,
    "careerPoints": 2385.0,
    "currentTeam": "Aston Martin F1 Team",
    "teamsHistory": [
      "Aston Martin",
      "Alpine",
      "McLaren",
      "Ferrari",
      "Renault",
      "Minardi"
    ],
    "difficulty": "easy"
  },
  {
    "id": 5,
    "name": "Valtteri Bottas",
    "abbr": "BOT",
    "nationality": "Finnish",
    "countryCode": "FI",
    "birthdate": "1989-08-28",
    "worldChampionships": 0,
    "wins": 10,
    "podiums": 67,
    "careerPoints": 1797.0,
    "currentTeam": "Without Seat",
    "teamsHistory": [
      "Sauber",
      "Mercedes",
      "Williams"
    ],
    "difficulty": "easy"
  },
  {
    "id": 6,
    "name": "Nico Hulkenberg",
    "abbr": "HUL",
    "nationality": "German",
    "countryCode": "DE",
    "birthdate": "1987-08-19",
    "worldChampionships": 0,
    "wins": 0,
    "podiums": 1,
    "careerPoints": 620.0,
    "currentTeam": "Stake F1 Team Kick Sauber",
    "teamsHistory": [
      "Sauber",
      "Haas",
      "Renault",
      "Force India",
      "Williams"
    ],
    "difficulty": "medium"
  },
  {
    "id": 7,
    "name": "Kimi Raikkonen",
    "abbr": "RAI",
    "nationality": "Finnish",
    "countryCode": "FI",
    "birthdate": "1979-10-17",
    "worldChampionships": 1,
    "wins": 21,
    "podiums": 103,
    "careerPoints": 1873.0,
    "currentTeam": "Retired",
    "teamsHistory": [
      "Alfa Romeo",
      "Ferrari",
      "Lotus",
      "McLaren",
      "Sauber"
    ],
    "difficulty": "easy"
  },
  {
    "id": 10,
    "name": "Sergio Perez",
    "abbr": "PER",
    "nationality": "Mexican",
    "countryCode": "MX",
    "birthdate": "1990-01-26",
    "worldChampionships": 0,
    "wins": 6,
    "podiums": 39,
    "careerPoints": 1638.0,
    "currentTeam": "Without Seat",
    "teamsHistory": [
      "Red Bull",
      "Racing Point",
      "Force India",
      "McLaren",
      "Sauber"
    ],
    "difficulty": "easy"
  },
  {
    "id": 14,
    "name": "Daniel Ricciardo",
    "abbr": "RIC",
    "nationality": "Australian",
    "countryCode": "AU",
    "birthdate": "1989-07-01",
    "worldChampionships": 0,
    "wins": 8,
    "podiums": 32,
    "careerPoints": 1329.0,
    "currentTeam": "Without Seat",
    "teamsHistory": [
      "Racing Bulls",
      "McLaren",
      "Renault",
      "Red Bull",
      "Toro Rosso",
      "HRT"
    ],
    "difficulty": "easy"
  },
  {
    "id": 19,
    "name": "Sebastian Vettel",
    "abbr": "VET",
    "nationality": "German",
    "countryCode": "DE",
    "birthdate": "1987-07-03",
    "worldChampionships": 4,
    "wins": 53,
    "podiums": 122,
    "careerPoints": 3098.0,
    "currentTeam": "Retired",
    "teamsHistory": [
      "Aston Martin",
      "Ferrari",
      "Red Bull",
      "Toro Rosso",
      "BMW Sauber"
    ],
    "difficulty": "easy"
  },
  {
    "id": 20,
    "name": "Lewis Hamilton",
    "abbr": "HAM",
    "nationality": "British",
    "countryCode": "GB",
    "birthdate": "1985-01-07",
    "worldChampionships": 7,
    "wins": 105,
    "podiums": 202,
    "careerPoints": 5014.5,
    "currentTeam": "Scuderia Ferrari",
    "teamsHistory": [
      "Ferrari",
      "Mercedes",
      "McLaren"
    ],
    "difficulty": "easy"
  },
  {
    "id": 24,
    "name": "Carlos Sainz Jr",
    "abbr": "SAI",
    "nationality": "Spanish",
    "countryCode": "ES",
    "birthdate": "1994-09-01",
    "worldChampionships": 0,
    "wins": 4,
    "podiums": 29,
    "careerPoints": 1336.5,
    "currentTeam": "Williams F1 Team",
    "teamsHistory": [
      "Williams",
      "Ferrari",
      "McLaren",
      "Renault",
      "Toro Rosso"
    ],
    "difficulty": "easy"
  },
  {
    "id": 25,
    "name": "Max Verstappen",
    "abbr": "VER",
    "nationality": "Dutch",
    "countryCode": "NL",
    "birthdate": "1997-09-30",
    "worldChampionships": 4,
    "wins": 70,
    "podiums": 126,
    "careerPoints": 3419.5,
    "currentTeam": "Red Bull Racing",
    "teamsHistory": [
      "Red Bull",
      "Toro Rosso"
    ],
    "difficulty": "easy"
  },
  {
    "id": 28,
    "name": "Esteban Ocon",
    "abbr": "OCO",
    "nationality": "French",
    "countryCode": "FR",
    "birthdate": "1996-09-17",
    "worldChampionships": 0,
    "wins": 1,
    "podiums": 4,
    "careerPoints": 477.0,
    "currentTeam": "Haas F1 Team",
    "teamsHistory": [
      "Haas",
      "Alpine",
      "Renault",
      "Racing Point",
      "Force India",
      "Manor"
    ],
    "difficulty": "medium"
  },
  {
    "id": 31,
    "name": "Lance Stroll",
    "abbr": "STR",
    "nationality": "Canadian",
    "countryCode": "CA",
    "birthdate": "1998-10-29",
    "worldChampionships": 0,
    "wins": 0,
    "podiums": 3,
    "careerPoints": 324.0,
    "currentTeam": "Aston Martin F1 Team",
    "teamsHistory": [
      "Aston Martin",
      "Racing Point",
      "Williams"
    ],
    "difficulty": "easy"
  },
  {
    "id": 34,
    "name": "Charles Leclerc",
    "abbr": "LEC",
    "nationality": "Monegasque",
    "countryCode": "MC",
    "birthdate": "1997-10-16",
    "worldChampionships": 0,
    "wins": 8,
    "podiums": 50,
    "careerPoints": 1660.0,
    "currentTeam": "Scuderia Ferrari",
    "teamsHistory": [
      "Ferrari",
      "Sauber"
    ],
    "difficulty": "easy"
  },
  {
    "id": 36,
    "name": "Pierre Gasly",
    "abbr": "GAS",
    "nationality": "French",
    "countryCode": "FR",
    "birthdate": "1996-02-07",
    "worldChampionships": 0,
    "wins": 1,
    "podiums": 5,
    "careerPoints": 458.0,
    "currentTeam": "Alpine F1 Team",
    "teamsHistory": [
      "Alpine",
      "AlphaTauri",
      "Red Bull",
      "Toro Rosso"
    ],
    "difficulty": "easy"
  },
  {
    "id": 46,
    "name": "Michael Schumacher",
    "abbr": "MSC",
    "nationality": "German",
    "countryCode": "DE",
    "birthdate": "1969-01-03",
    "worldChampionships": 7,
    "wins": 91,
    "podiums": 155,
    "careerPoints": 1566.0,
    "currentTeam": "Retired",
    "teamsHistory": [
      "Mercedes",
      "Ferrari",
      "Benetton",
      "Jordan"
    ],
    "difficulty": "easy"
  },
  {
    "id": 49,
    "name": "Lando Norris",
    "abbr": "NOR",
    "nationality": "British",
    "countryCode": "GB",
    "birthdate": "1999-11-13",
    "worldChampionships": 1,
    "wins": 11,
    "podiums": 43,
    "careerPoints": 1415.0,
    "currentTeam": "McLaren Racing",
    "teamsHistory": [
      "McLaren"
    ],
    "difficulty": "easy"
  },
  {
    "id": 50,
    "name": "Alexander Albon",
    "abbr": "ALB",
    "nationality": "Thai",
    "countryCode": "TH",
    "birthdate": "1996-03-23",
    "worldChampionships": 0,
    "wins": 0,
    "podiums": 2,
    "careerPoints": 313.0,
    "currentTeam": "Williams F1 Team",
    "teamsHistory": [
      "Williams",
      "Red Bull",
      "Toro Rosso"
    ],
    "difficulty": "easy"
  },
  {
    "id": 51,
    "name": "George Russell",
    "abbr": "RUS",
    "nationality": "British",
    "countryCode": "GB",
    "birthdate": "1998-02-15",
    "worldChampionships": 0,
    "wins": 5,
    "podiums": 24,
    "careerPoints": 1023.0,
    "currentTeam": "Mercedes-AMG Petronas",
    "teamsHistory": [
      "Mercedes",
      "Williams"
    ],
    "difficulty": "easy"
  },
  {
    "id": 80,
    "name": "Mick Schumacher",
    "abbr": "MSC",
    "nationality": "German",
    "countryCode": "DE",
    "birthdate": "1999-03-22",
    "worldChampionships": 0,
    "wins": 0,
    "podiums": 0,
    "careerPoints": 12.0,
    "currentTeam": "Reserve Driver",
    "teamsHistory": [
      "Haas"
    ],
    "difficulty": "medium"
  },
  {
    "id": 82,
    "name": "Yuki Tsunoda",
    "abbr": "TSU",
    "nationality": "Japanese",
    "countryCode": "JP",
    "birthdate": "2000-05-11",
    "worldChampionships": 0,
    "wins": 0,
    "podiums": 0,
    "careerPoints": 124.0,
    "currentTeam": "Red Bull Racing",
    "teamsHistory": [
      "Red Bull",
      "Racing Bulls",
      "AlphaTauri"
    ],
    "difficulty": "easy"
  },
  {
    "id": 83,
    "name": "Guanyu Zhou",
    "abbr": "ZHO",
    "nationality": "Chinese",
    "countryCode": "CN",
    "birthdate": "1999-05-30",
    "worldChampionships": 0,
    "wins": 0,
    "podiums": 0,
    "careerPoints": 12.0,
    "currentTeam": "Retired",
    "teamsHistory": [
      "Sauber"
    ],
    "difficulty": "medium"
  },
  {
    "id": 97,
    "name": "Oscar Piastri",
    "abbr": "PIA",
    "nationality": "Australian",
    "countryCode": "AU",
    "birthdate": "2001-04-06",
    "worldChampionships": 0,
    "wins": 9,
    "podiums": 25,
    "careerPoints": 781.0,
    "currentTeam": "McLaren Racing",
    "teamsHistory": [
      "McLaren"
    ],
    "difficulty": "easy"
  },
  {
    "id": 101,
    "name": "Oliver Bearman",
    "abbr": "BEA",
    "nationality": "British",
    "countryCode": "GB",
    "birthdate": "2005-05-08",
    "worldChampionships": 0,
    "wins": 0,
    "podiums": 0,
    "careerPoints": 48.0,
    "currentTeam": "Haas F1 Team",
    "teamsHistory": [
      "Haas",
      "Ferrari"
    ],
    "difficulty": "medium"
  },
  {
    "id": 94,
    "name": "Jack Doohan",
    "abbr": "DOO",
    "nationality": "Australian",
    "countryCode": "AU",
    "birthdate": "2003-01-20",
    "worldChampionships": 0,
    "wins": 0,
    "podiums": 0,
    "careerPoints": 0.0,
    "currentTeam": "Alpine F1 Team",
    "teamsHistory": [
      "Alpine"
    ],
    "difficulty": "hard"
  },
  {
    "id": 105,
    "name": "Franco Colapinto",
    "abbr": "COL",
    "nationality": "Argentine",
    "countryCode": "AR",
    "birthdate": "2003-05-27",
    "worldChampionships": 0,
    "wins": 0,
    "podiums": 0,
    "careerPoints": 5.0,
    "currentTeam": "Alpine F1 Team",
    "teamsHistory": [
      "Williams",
      "Alpine"
    ],
    "difficulty": "hard"
  },
  {
    "id": 89,
    "name": "Liam Lawson",
    "abbr": "LAW",
    "nationality": "New Zealander",
    "countryCode": "NZ",
    "birthdate": "2002-02-11",
    "worldChampionships": 0,
    "wins": 0,
    "podiums": 0,
    "careerPoints": 44.0,
    "currentTeam": "Racing Bulls",
    "teamsHistory": [
      "Racing Bulls"
    ],
    "difficulty": "medium"
  },
  {
    "id": 16,
    "name": "Romain Grosjean",
    "abbr": "GRO",
    "nationality": "French",
    "countryCode": "FR",
    "birthdate": "1986-04-17",
    "worldChampionships": 0,
    "wins": 0,
    "podiums": 10,
    "careerPoints": 391.0,
    "currentTeam": "Retired",
    "teamsHistory": [
      "Haas",
      "Lotus",
      "Renault"
    ],
    "difficulty": "medium"
  },
  {
    "id": 9,
    "name": "Daniil Kvyat",
    "abbr": "KVY",
    "nationality": "Russian",
    "countryCode": "RU",
    "birthdate": "1994-04-26",
    "worldChampionships": 0,
    "wins": 0,
    "podiums": 3,
    "careerPoints": 202.0,
    "currentTeam": "Retired",
    "teamsHistory": [
      "AlphaTauri",
      "Toro Rosso",
      "Red Bull"
    ],
    "difficulty": "medium"
  },
  {
    "id": 75,
    "name": "Rubens Barrichello",
    "abbr": "BAR",
    "nationality": "Brazilian",
    "countryCode": "BR",
    "birthdate": "1972-05-23",
    "worldChampionships": 0,
    "wins": 11,
    "podiums": 68,
    "careerPoints": 658.0,
    "currentTeam": "Retired",
    "teamsHistory": [
      "Williams",
      "Brawn",
      "Honda",
      "Ferrari",
      "Stewart",
      "Jordan"
    ],
    "difficulty": "medium"
  },
  {
    "id": 22,
    "name": "Felipe Massa",
    "abbr": "MAS",
    "nationality": "Brazilian",
    "countryCode": "BR",
    "birthdate": "1981-04-25",
    "worldChampionships": 0,
    "wins": 11,
    "podiums": 41,
    "careerPoints": 1167.0,
    "currentTeam": "Retired",
    "teamsHistory": [
      "Williams",
      "Ferrari",
      "Sauber"
    ],
    "difficulty": "medium"
  },
  {
    "id": 38,
    "name": "Mark Webber",
    "abbr": "WEB",
    "nationality": "Australian",
    "countryCode": "AU",
    "birthdate": "1976-08-27",
    "worldChampionships": 0,
    "wins": 9,
    "podiums": 42,
    "careerPoints": 1047.5,
    "currentTeam": "Retired",
    "teamsHistory": [
      "Red Bull",
      "Williams",
      "Jaguar",
      "Minardi"
    ],
    "difficulty": "medium"
  },
  {
    "id": 1001,
    "name": "Ayrton Senna",
    "abbr": "SEN",
    "nationality": "Brazilian",
    "countryCode": "BR",
    "birthdate": "1960-03-21",
    "worldChampionships": 3,
    "wins": 41,
    "podiums": 80,
    "careerPoints": 614.0,
    "currentTeam": "Deceased",
    "teamsHistory": [
      "McLaren",
      "Lotus",
      "Toleman"
    ],
    "difficulty": "easy"
  },
  {
    "id": 1002,
    "name": "Alain Prost",
    "abbr": "PRO",
    "nationality": "French",
    "countryCode": "FR",
    "birthdate": "1955-02-24",
    "worldChampionships": 4,
    "wins": 51,
    "podiums": 106,
    "careerPoints": 798.5,
    "currentTeam": "Retired",
    "teamsHistory": [
      "Williams",
      "Ferrari",
      "McLaren",
      "Renault"
    ],
    "difficulty": "easy"
  },
  {
    "id": 1003,
    "name": "Niki Lauda",
    "abbr": "LAU",
    "nationality": "Austrian",
    "countryCode": "AT",
    "birthdate": "1949-02-22",
    "worldChampionships": 3,
    "wins": 25,
    "podiums": 54,
    "careerPoints": 420.5,
    "currentTeam": "Deceased",
    "teamsHistory": [
      "McLaren",
      "Ferrari",
      "Brabham",
      "March",
      "BRM"
    ],
    "difficulty": "easy"
  },
  {
    "id": 1004,
    "name": "Nelson Piquet",
    "abbr": "PIQ",
    "nationality": "Brazilian",
    "countryCode": "BR",
    "birthdate": "1952-08-17",
    "worldChampionships": 3,
    "wins": 23,
    "podiums": 60,
    "careerPoints": 485.5,
    "currentTeam": "Retired",
    "teamsHistory": [
      "Benetton",
      "Lotus",
      "Williams",
      "Brabham",
      "Ensign"
    ],
    "difficulty": "medium"
  },
  {
    "id": 1005,
    "name": "Jackie Stewart",
    "abbr": "STE",
    "nationality": "British",
    "countryCode": "GB",
    "birthdate": "1939-06-11",
    "worldChampionships": 3,
    "wins": 27,
    "podiums": 43,
    "careerPoints": 360.0,
    "currentTeam": "Retired",
    "teamsHistory": [
      "Tyrrell",
      "March",
      "Matra",
      "BRM"
    ],
    "difficulty": "medium"
  },
  {
    "id": 1006,
    "name": "Jim Clark",
    "abbr": "CLA",
    "nationality": "British",
    "countryCode": "GB",
    "birthdate": "1936-03-04",
    "worldChampionships": 2,
    "wins": 25,
    "podiums": 32,
    "careerPoints": 274.0,
    "currentTeam": "Deceased",
    "teamsHistory": [
      "Lotus"
    ],
    "difficulty": "medium"
  },
  {
    "id": 1007,
    "name": "Juan Manuel Fangio",
    "abbr": "FAN",
    "nationality": "Argentine",
    "countryCode": "AR",
    "birthdate": "1911-06-24",
    "worldChampionships": 5,
    "wins": 24,
    "podiums": 35,
    "careerPoints": 277.14,
    "currentTeam": "Deceased",
    "teamsHistory": [
      "Maserati",
      "Ferrari",
      "Mercedes",
      "Alfa Romeo"
    ],
    "difficulty": "medium"
  },
  {
    "id": 1008,
    "name": "Mika Hakkinen",
    "abbr": "HAK",
    "nationality": "Finnish",
    "countryCode": "FI",
    "birthdate": "1968-09-28",
    "worldChampionships": 2,
    "wins": 20,
    "podiums": 51,
    "careerPoints": 420.0,
    "currentTeam": "Retired",
    "teamsHistory": [
      "McLaren",
      "Lotus"
    ],
    "difficulty": "easy"
  },
  {
    "id": 1009,
    "name": "Damon Hill",
    "abbr": "HIL",
    "nationality": "British",
    "countryCode": "GB",
    "birthdate": "1960-09-17",
    "worldChampionships": 1,
    "wins": 22,
    "podiums": 42,
    "careerPoints": 360.0,
    "currentTeam": "Retired",
    "teamsHistory": [
      "Williams",
      "Arrows",
      "Jordan",
      "Brabham"
    ],
    "difficulty": "medium"
  },
  {
    "id": 1010,
    "name": "Nigel Mansell",
    "abbr": "MAN",
    "nationality": "British",
    "countryCode": "GB",
    "birthdate": "1953-08-08",
    "worldChampionships": 1,
    "wins": 31,
    "podiums": 59,
    "careerPoints": 482.0,
    "currentTeam": "Retired",
    "teamsHistory": [
      "Williams",
      "Ferrari",
      "Lotus"
    ],
    "difficulty": "medium"
  },
  {
    "id": 1011,
    "name": "David Coulthard",
    "abbr": "COU",
    "nationality": "British",
    "countryCode": "GB",
    "birthdate": "1971-03-27",
    "worldChampionships": 0,
    "wins": 13,
    "podiums": 62,
    "careerPoints": 535.0,
    "currentTeam": "Retired",
    "teamsHistory": [
      "Red Bull",
      "McLaren",
      "Williams"
    ],
    "difficulty": "medium"
  },
  {
    "id": 1012,
    "name": "Gerhard Berger",
    "abbr": "BER",
    "nationality": "Austrian",
    "countryCode": "AT",
    "birthdate": "1959-08-27",
    "worldChampionships": 0,
    "wins": 10,
    "podiums": 48,
    "careerPoints": 385.0,
    "currentTeam": "Retired",
    "teamsHistory": [
      "McLaren",
      "Ferrari",
      "Benetton"
    ],
    "difficulty": "hard"
  },
  {
    "id": 1013,
    "name": "Emerson Fittipaldi",
    "abbr": "FIT",
    "nationality": "Brazilian",
    "countryCode": "BR",
    "birthdate": "1946-12-12",
    "worldChampionships": 2,
    "wins": 14,
    "podiums": 35,
    "careerPoints": 281.0,
    "currentTeam": "Retired",
    "teamsHistory": [
      "McLaren",
      "Lotus",
      "Fittipaldi",
      "Brabham"
    ],
    "difficulty": "medium"
  },
  {
    "id": 1014,
    "name": "Graham Hill",
    "abbr": "GHI",
    "nationality": "British",
    "countryCode": "GB",
    "birthdate": "1929-02-15",
    "worldChampionships": 2,
    "wins": 14,
    "podiums": 36,
    "careerPoints": 289.0,
    "currentTeam": "Deceased",
    "teamsHistory": [
      "Lotus",
      "BRM",
      "Brabham"
    ],
    "difficulty": "hard"
  },
  {
    "id": 1015,
    "name": "Jody Scheckter",
    "abbr": "SCH",
    "nationality": "South African",
    "countryCode": "ZA",
    "birthdate": "1950-01-29",
    "worldChampionships": 1,
    "wins": 10,
    "podiums": 33,
    "careerPoints": 255.0,
    "currentTeam": "Retired",
    "teamsHistory": [
      "Ferrari",
      "Wolf",
      "Tyrrell",
      "McLaren"
    ],
    "difficulty": "hard"
  },
  {
    "id": 1016,
    "name": "James Hunt",
    "abbr": "HUN",
    "nationality": "British",
    "countryCode": "GB",
    "birthdate": "1947-08-29",
    "worldChampionships": 1,
    "wins": 10,
    "podiums": 23,
    "careerPoints": 179.0,
    "currentTeam": "Deceased",
    "teamsHistory": [
      "McLaren",
      "Hesketh",
      "Wolf"
    ],
    "difficulty": "medium"
  },
  {
    "id": 1017,
    "name": "Jochen Rindt",
    "abbr": "RIN",
    "nationality": "Austrian",
    "countryCode": "AT",
    "birthdate": "1942-04-18",
    "worldChampionships": 1,
    "wins": 6,
    "podiums": 13,
    "careerPoints": 109.0,
    "currentTeam": "Deceased",
    "teamsHistory": [
      "Lotus",
      "Brabham",
      "Cooper"
    ],
    "difficulty": "hard"
  },
  {
    "id": 1018,
    "name": "Alan Jones",
    "abbr": "JON",
    "nationality": "Australian",
    "countryCode": "AU",
    "birthdate": "1946-11-02",
    "worldChampionships": 1,
    "wins": 12,
    "podiums": 24,
    "careerPoints": 206.0,
    "currentTeam": "Retired",
    "teamsHistory": [
      "Williams",
      "Arrows",
      "Shadow",
      "Surtees",
      "Hesketh"
    ],
    "difficulty": "hard"
  },
  {
    "id": 1019,
    "name": "Jacques Villeneuve",
    "abbr": "VIL",
    "nationality": "Canadian",
    "countryCode": "CA",
    "birthdate": "1971-04-09",
    "worldChampionships": 1,
    "wins": 11,
    "podiums": 23,
    "careerPoints": 235.0,
    "currentTeam": "Retired",
    "teamsHistory": [
      "Williams",
      "BAR",
      "Sauber",
      "Renault"
    ],
    "difficulty": "medium"
  },
  {
    "id": 1020,
    "name": "Gilles Villeneuve",
    "abbr": "GVI",
    "nationality": "Canadian",
    "countryCode": "CA",
    "birthdate": "1950-01-18",
    "worldChampionships": 0,
    "wins": 6,
    "podiums": 13,
    "careerPoints": 107.0,
    "currentTeam": "Deceased",
    "teamsHistory": [
      "Ferrari",
      "McLaren"
    ],
    "difficulty": "medium"
  }
];

const ALL_DRIVERS = DRIVERS_DATA.map(d => d.name);
