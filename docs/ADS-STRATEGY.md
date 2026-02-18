# Snackable Games - Advertising Strategy

## Overview

This document outlines the advertising strategy for Snackable Games, including placement options, aggressiveness levels, and implementation recommendations.

## Core Principles

1. **User Experience First**: Ads should not interrupt gameplay or frustrate users
2. **Consistency**: Same ad placements across all games for predictable UX
3. **Non-intrusive by Default**: Start with mild approaches, test and iterate
4. **Revenue Optimization**: Balance monetization with retention

---

## Layout Consistency (Implemented)

All games now use a shared layout system (`shared/css/shared.css`) that ensures:

- **Main container**: `max-width: 600px` centered
- **Panels/cards**: 100% width within the container
- **Mobile**: Full width with 12px padding
- **Desktop (1200px+)**: Space for sidebar ads on left/right

---

## Ad Types & Placements

### 1. Banner Ads (Static/Display)

**Description**: Standard rectangular ads displayed in specific zones.

#### Mobile Placements

| Location | Aggressiveness | Recommendation |
|----------|---------------|----------------|
| **Top of page** (below header) | MILD | Good starting point |
| **Between sections** (e.g., after progress bar) | MILD | Natural content break |
| **Bottom of page** (above footer) | VERY MILD | Least intrusive |
| **After game completion** (in results) | MILD | User is done playing |

#### Desktop Placements

| Location | Aggressiveness | Recommendation |
|----------|---------------|----------------|
| **Left sidebar** | VERY MILD | Standard, out of the way |
| **Right sidebar** | VERY MILD | Standard, out of the way |
| **Between game sections** | MILD | As on mobile |

**Recommended starting approach**: VERY MILD
- Mobile: Single banner at bottom of page OR after game completion
- Desktop: Sidebar ads only (left and/or right)

---

### 2. Interstitial Ads (Full-screen)

**Description**: Full-screen ads that appear between content/actions.

| Trigger Point | Aggressiveness | Notes |
|---------------|---------------|-------|
| **Before Play Random** | MODERATE | User chose to continue playing |
| **After game completion** (before results) | MODERATE | Natural break point |
| **Between songs (Blind Test)** | AGGRESSIVE | Interrupts flow, NOT recommended |
| **After every N games** | MODERATE | Cap at 1 per 3-5 games max |
| **On page load** | VERY AGGRESSIVE | NOT recommended - terrible UX |

**Recommended starting approach**: AVOID initially
- Only implement after establishing user base
- If used: After game completion only, max 1 per session
- NEVER interrupt active gameplay (between songs, between guesses)

---

### 3. Rewarded Ads (Opt-in)

**Description**: Users choose to watch ads in exchange for benefits.

| Reward Type | Aggressiveness | Notes |
|-------------|---------------|-------|
| **Extra hint/clue** | VERY MILD | User explicitly opts in |
| **Reveal answer** (after give up) | VERY MILD | Optional enhancement |
| **Skip daily cooldown** | MILD | For engagement features |
| **Bonus points/stats** | VERY MILD | Non-essential rewards |

**Recommended starting approach**: MILD (implement first)
- Best user experience - completely optional
- Users feel they're getting value
- Start with "extra hint" feature in quiz games

---

## Aggressiveness Levels Summary

| Level | Description | Examples |
|-------|-------------|----------|
| **VERY MILD** | Barely noticeable, never interrupts | Sidebars, bottom banners, rewarded ads |
| **MILD** | Present but unobtrusive | Between sections, after completion |
| **MODERATE** | Noticeable, occasional interruption | Interstitial after every few games |
| **AGGRESSIVE** | Frequent, potentially annoying | Interstitials between songs/rounds |
| **VERY AGGRESSIVE** | Major UX impact | Pop-ups on load, mid-gameplay ads |

---

## Recommended Implementation Phases

### Phase 1: Foundation (Recommended Start)
**Aggressiveness: VERY MILD**

1. Desktop sidebar ads (left/right)
2. Single banner after game completion (mobile)
3. Optional: Rewarded ad for "extra hint"

**Expected impact**: Minimal revenue, zero user friction

### Phase 2: Optimization
**Aggressiveness: MILD**

1. Add banner between progress bar and game area
2. Interstitial after Play Random (every 3rd time)
3. More rewarded ad triggers

**Expected impact**: Moderate revenue, low user friction

### Phase 3: Full Monetization
**Aggressiveness: MODERATE** (with caution)

1. Interstitials after game completion
2. More banner placements
3. Frequency caps: 1 interstitial per 5 minutes max

**Expected impact**: Higher revenue, monitor retention closely

---

## What NOT to Do

1. **Never interrupt active gameplay** (mid-song, mid-guess)
2. **Never show ads on page load** (wait for user action)
3. **Never force video ads without skip option**
4. **Never show more than 2 interstitials in 5 minutes**
5. **Never cover game controls with ads**
6. **Never use deceptive ad placements** (fake buttons)

---

## Technical Implementation Notes

### CSS Classes (Added to shared.css)

```css
.ad-slot-banner     /* Horizontal banner container */
.ad-slot-sidebar    /* Desktop sidebar container */
```

### Integration Points

1. **AdSense auto ads**: Let Google decide placements (easiest, but less control)
2. **Manual placement**: Use ad slot classes for specific locations
3. **Ad blockers**: Gracefully handle blocked ads (don't break layout)

### Responsive Behavior

- Sidebar ads: Only on screens > 1200px
- Banner ads: Scale to container width
- Mobile: Prefer smaller ad formats (320x50, 320x100)

---

## Metrics to Track

1. **Revenue per session**
2. **Ad impressions per game played**
3. **User retention (7-day, 30-day)**
4. **Session duration before/after ads**
5. **Bounce rate changes**

---

## Blind Test Specific Notes

**Current state**: Unique share message (keep as-is)

**Ad placements to AVOID**:
- Between songs (interrupts flow)
- During audio playback
- Over the answer input

**Acceptable placements**:
- After match completion (in summary)
- Before starting a new match (if user clicks Play Random)
- Rewarded ad for extra time/hints

---

## Future Considerations

1. **Premium/Ad-free option**: Subscription to remove ads
2. **Frequency caps per user**: Don't over-serve to returning users
3. **A/B testing**: Test different placements on user segments
4. **Seasonal adjustments**: Higher ad load during peak traffic

---

*Last updated: February 2026*
