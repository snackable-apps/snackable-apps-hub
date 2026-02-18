# To-Do List

## High Priority

### SEO & Growth
- [ ] **Create OG Images** for social sharing (1200x630px each)
  - `/assets/og-image.png` (homepage)
  - `/f1-quiz/assets/og-image.png`
  - `/fut-quiz/assets/og-image.png`
  - `/movies-quiz/assets/og-image.png`
  - `/tennis-quiz/assets/og-image.png`
  - `/music/assets/og-image.png`
  - `/books-quiz/assets/og-image.png`
  - `/animal/assets/og-image.png`
  - `/blind-test/assets/og-image.png`
  - `/sudoku/assets/og-image.png`
  - Tip: Use Canva "Facebook Post" template

---

## Documentation

### Project Stack & Costs Documentation
- [ ] **Document full project stack**
  - Frontend: HTML/CSS/JS, hosting (Vercel?)
  - Backend: Vercel serverless functions
  - Database: Supabase
  - APIs: External services used
  - Analytics: GA4
  - Ads: Google AdSense
  
- [ ] **Current costs breakdown**
  - What's free tier
  - What's paid
  - Monthly estimates
  
- [ ] **Scaling considerations & future-proofing**
  - What happens at 10K, 100K, 1M users?
  - Which services will hit paid tiers first?
  - Supabase row limits
  - Vercel function invocation limits
  - API rate limits
  - Recommended architecture changes at scale

---

## Code Quality

### Major Code Review (Periodic)
- [ ] **Consistency audit**
  - Variable naming conventions across games
  - Function patterns (are similar functions implemented the same way?)
  - CSS class naming conventions
  - File structure consistency
  
- [ ] **Redundancy cleanup**
  - Identify duplicate code that could be centralized
  - Check for unused functions/CSS
  - Look for copy-paste code that drifted
  
- [ ] **Performance review**
  - Large file sizes
  - Unnecessary dependencies
  - Image optimization opportunities

---

## Repository Housekeeping

### Repo Cleanup
- [ ] **Clean up repository structure**
  - Remove unused files
  - Organize assets folders
  - Clean up old/test files
  
- [ ] **Review .gitignore**
  - Ensure sensitive files excluded
  - Check for accidentally committed files
  
- [ ] **Agent/AI files cleanup**
  - Review any AI-generated temp files
  - Clean transcript/log files if any

---

## Pending Features

### Translation Review
- [ ] **Comprehensive translation audit**: Review all games for hardcoded English strings
  - Known issues to check:
    - "Next Song" in Blind Test
    - Game-specific UI elements (buttons, labels, messages)
    - Error messages
    - Timer/score displays
  - Languages to verify: Portuguese, French, Italian, Spanish
  - Priority: Medium
  - Note: User will review and provide specific list of missing translations

### Data Explorer
- [ ] **Stats View**: Create aggregated statistics dashboard view in DataExplorer
  - Currently only raw data is available
  - Should include charts/graphs for game statistics trends

---

## Completed
- [x] SEO: sitemap.xml and robots.txt
- [x] SEO: Open Graph and Twitter Card meta tags
- [x] SEO: Canonical URLs
- [x] Game restoration: Show previous guesses when returning
- [x] Clues panel: Add missing NOT sections
- [x] Centralized GameUtils.updateCategoricalClue()
- [x] Fix Animal Quiz continent/habitat display

---

*Last updated: February 2026*
