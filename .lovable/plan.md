

# Infinite AI Models Carousel

## Overview
Add a seamless, infinitely scrolling carousel to the home page that showcases all the AI models available on MagVerse AI. Each card displays the model's real brand logo and a brief description, communicating "all models, one platform."

## Design

```text
  ← ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ →
  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ...
  │  [Logo]  │  │  [Logo]  │  │  [Logo]  │  │  [Logo]  │
  │ ChatGPT  │  │  Claude   │  │  Gemini  │  │Perplexity│
  │ GPT-4o   │  │ Sonnet 4  │  │  Flash   │  │  Sonar   │
  │ flagship │  │ reasoning │  │  fast    │  │ web AI   │
  └──────────┘  └──────────┘  └──────────┘  └──────────┘
  ← scrolls continuously, no gaps, pauses on hover →
```

- Pure CSS animation (`@keyframes scroll`) for buttery smooth infinite scroll -- no JS timers
- Content is duplicated so the loop is seamless
- Pauses on hover so users can read
- Each card shows: real brand logo, model name, short description
- Placed between HeroSection and the existing AdvancedModelLibrary on the home page
- Uses the same real reference logos already imported in the codebase

## Files to Change

| File | Action | What |
|------|--------|------|
| `src/components/home/InfiniteModelCarousel.tsx` | **Create** | New carousel component with CSS-based infinite scroll, model cards with logos and descriptions |
| `src/pages/Home.tsx` | **Modify** | Import and place `InfiniteModelCarousel` between `HeroSection` and `IndustryLeaders` |

## Technical Details

- **Models shown**: Deduplicated list of ~8 unique models (ChatGPT, Claude, Gemini Flash, Gemini Pro, GPT-5, Perplexity, Mistral, Grok/Gemini 2.0) -- skip image-only and variant duplicates
- **Logos**: Reuse existing reference PNGs from `src/assets/ai-logos/` (chatgpt-reference.png, claude-reference.png, gemini-reference.png, etc.)
- **Animation**: CSS `@keyframes` translateX loop. The model list is rendered twice side-by-side; animation shifts by 50% width to create seamless wrap. `animation-play-state: paused` on hover.
- **Responsive**: Cards shrink on mobile; scroll speed stays consistent
- **No new dependencies needed**

