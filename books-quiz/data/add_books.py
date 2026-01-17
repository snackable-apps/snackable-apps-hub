#!/usr/bin/env python3
"""
Books Quiz - Add Books Script
==============================

Fetches book data from Goodreads API and formats it for our database.

Usage:
    python3 add_books.py                    # Interactive mode
    python3 add_books.py --search "1984"    # Search for a book
    python3 add_books.py --id 5470          # Fetch by Goodreads ID
    python3 add_books.py --batch titles.txt # Process list of titles

API: Goodreads (via RapidAPI)
Limit: 30 requests/month on basic plan
"""

import json
import os
import urllib.request
import urllib.parse
from datetime import datetime

# =============================================================================
# CONFIGURATION
# =============================================================================

RAPIDAPI_KEY = "ea015ba987msh2b34628eb575af3p1c02a8jsn8960cb255978"
RAPIDAPI_HOST = "goodreads12.p.rapidapi.com"

SEARCH_URL = "https://goodreads12.p.rapidapi.com/searchBooks"
BOOK_URL = "https://goodreads12.p.rapidapi.com/getBookByID"

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_FILE = os.path.join(SCRIPT_DIR, "new_books.json")

# =============================================================================
# API FUNCTIONS
# =============================================================================

def get_headers():
    return {
        "X-RapidAPI-Key": RAPIDAPI_KEY,
        "X-RapidAPI-Host": RAPIDAPI_HOST
    }


def search_book(keyword):
    """Search for a book by title/keyword."""
    params = urllib.parse.urlencode({"keyword": keyword})
    url = f"{SEARCH_URL}?{params}"
    
    try:
        req = urllib.request.Request(url, headers=get_headers())
        with urllib.request.urlopen(req, timeout=30) as response:
            data = json.loads(response.read().decode("utf-8"))
        return data
    except Exception as e:
        print(f"❌ Search error: {e}")
        return []


def get_book_by_id(book_id):
    """Get detailed book info by Goodreads ID."""
    params = urllib.parse.urlencode({"bookID": book_id})
    url = f"{BOOK_URL}?{params}"
    
    try:
        req = urllib.request.Request(url, headers=get_headers())
        with urllib.request.urlopen(req, timeout=30) as response:
            data = json.loads(response.read().decode("utf-8"))
        return data
    except Exception as e:
        print(f"❌ Fetch error: {e}")
        return None


# =============================================================================
# DATA PROCESSING
# =============================================================================

def parse_book_data(data):
    """Convert API response to our format."""
    if not data:
        return None
    
    # Title
    title = data.get("title", "Unknown")
    
    # Author
    author_data = data.get("author", {})
    author = author_data.get("name", "Unknown") if author_data else "Unknown"
    
    # Genre (first one)
    genres = data.get("bookGenres", [])
    genre = genres[0]["name"] if genres else "Fiction"
    # Skip meta-genres
    skip_genres = ["Audiobook", "Classics", "School", "Literature", "Novels"]
    for g in genres:
        if g["name"] not in skip_genres:
            genre = g["name"]
            break
    
    # Publication year
    pub_year = None
    details = data.get("details", {})
    pub_time = details.get("publicationTime")
    if pub_time:
        try:
            pub_year = datetime.fromtimestamp(pub_time / 1000).year
        except:
            pass
    
    # Page count
    page_count = details.get("numPages")
    if page_count:
        try:
            page_count = int(page_count)
        except:
            page_count = 300  # default
    else:
        page_count = 300
    
    # Language
    language_data = details.get("language", {})
    language = language_data.get("name", "English") if language_data else "English"
    
    return {
        "title": title,
        "author": author,
        "authorNationality": "TODO",  # Manual input needed
        "genre": genre,
        "publicationYear": pub_year or 2000,
        "pageCount": page_count,
        "originalLanguage": language,
        "difficulty": "medium"  # Default, adjust manually
    }


def fetch_book_by_title(title):
    """Search for a title and fetch the first result's details."""
    print(f"🔍 Searching: {title}")
    
    # Search
    results = search_book(title)
    if not results:
        print(f"  ❌ No results found")
        return None
    
    # Get first result
    first = results[0]
    book_id = first.get("bookId")
    print(f"  📖 Found: {first.get('title', 'Unknown')[:50]}... (ID: {book_id})")
    
    # Fetch details
    details = get_book_by_id(book_id)
    if not details:
        return None
    
    # Parse
    parsed = parse_book_data(details)
    if parsed:
        print(f"  ✅ {parsed['title']} by {parsed['author']} ({parsed['publicationYear']})")
    
    return parsed


# =============================================================================
# MAIN
# =============================================================================

def main():
    """Main function - batch process a list of titles."""
    
    # List of books to add (15 for this month - 30 API requests)
    # Each book = 1 search + 1 fetch = 2 requests
    titles = [
        "The Alchemist Paulo Coelho",
        "Brave New World Aldous Huxley",
        "The Lord of the Rings Tolkien",
        "Moby Dick Herman Melville",
        "War and Peace Tolstoy",
        "Wuthering Heights Emily Bronte",
        "Jane Eyre Charlotte Bronte",
        "Frankenstein Mary Shelley",
        "The Kite Runner Khaled Hosseini",
        "Life of Pi Yann Martel",
        "Dune Frank Herbert",
        "The Hitchhiker's Guide to the Galaxy",
        "Fahrenheit 451 Ray Bradbury",
        "The Hunger Games Suzanne Collins",
        "Harry Potter Philosopher's Stone"
    ]
    
    print("=" * 60)
    print("📚 Books Quiz - Add Books Script")
    print("=" * 60)
    print(f"Processing {len(titles)} titles...")
    print()
    
    books = []
    for title in titles:
        book = fetch_book_by_title(title)
        if book:
            books.append(book)
        print()
    
    # Save to file
    print("=" * 60)
    print(f"📝 Saving {len(books)} books to {OUTPUT_FILE}")
    
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(books, f, indent=2, ensure_ascii=False)
    
    print("✅ Done!")
    print()
    print("Next steps:")
    print("1. Open new_books.json")
    print("2. Fill in 'authorNationality' for each book")
    print("3. Adjust 'difficulty' (easy/medium/hard)")
    print("4. Copy entries to books_data.js")


if __name__ == "__main__":
    main()
