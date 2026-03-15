-- =====================================================
-- MOVIE TRANSLATIONS TABLE
-- Localized movie titles for multilingual support
-- =====================================================

-- Translations table: one row per (movie, language)
CREATE TABLE IF NOT EXISTS movie_translations (
  id SERIAL PRIMARY KEY,
  imdb_id TEXT NOT NULL REFERENCES movies_raw(imdb_id),
  lang TEXT NOT NULL,              -- ISO code: 'pt-br', 'fr', 'pt', 'es', 'it'
  title TEXT NOT NULL,             -- Primary localized title
  alt_titles TEXT[] DEFAULT '{}',  -- Other known titles in this language (for search)
  source TEXT DEFAULT 'imdb_akas', -- Data provenance
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(imdb_id, lang)
);

-- RLS
ALTER TABLE movie_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON movie_translations
  FOR SELECT USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mt_imdb_id ON movie_translations(imdb_id);
CREATE INDEX IF NOT EXISTS idx_mt_lang ON movie_translations(lang);
CREATE INDEX IF NOT EXISTS idx_mt_imdb_lang ON movie_translations(imdb_id, lang);

-- Verify
SELECT 'movie_translations' as table_name, COUNT(*) as count FROM movie_translations;
