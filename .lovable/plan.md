

# PDF Export & Smart Model Recommendation Plan

## Summary

Two features to add:
1. **PDF Export** on the Model Comparison page -- export performance leaderboard data as a formatted PDF report
2. **Smart Model Recommendation** in Chat -- before sending, show a suggestion banner recommending the optimal model based on query type and historical performance data

---

## Feature 1: PDF Export for Model Comparison

### What it does
Adds an "Export PDF" button to the Model Comparison page header. Clicking it generates a professional PDF report containing:
- Report title, date, and branding
- Performance overview (best models for each metric)
- Full leaderboard table with all models ranked by response time, TTFT, and generation speed
- Summary statistics

### Implementation

**New file: `src/utils/modelComparisonPdfExport.ts`**

A utility function `exportModelComparisonPDF(aggregatedMetrics, bestModels)` that uses the existing `jspdf` dependency to:
- Render a branded header ("MagVerse AI - Model Performance Report")
- Draw a "Top Performers" section with best model for each metric
- Draw a table with columns: Rank, Model, Avg Response Time, TTFT, Words/sec, Requests
- Add footer with generation timestamp

**Modified file: `src/pages/ModelComparison.tsx`**

- Import the new export utility
- Add a `Download` icon button next to the page title
- Call `exportModelComparisonPDF()` on click, trigger browser download

---

## Feature 2: Smart Model Recommendation

### What it does
When the user types a message in Chat, a small recommendation banner appears above the input suggesting the best model for that query type. It combines:
- **Query classification** (already exists in `queryClassifier.ts`) to detect code/research/creative/math
- **Historical performance** from `ai_model_metrics` to rank models by actual speed within each category
- A dismissible suggestion chip showing the recommended model with a one-click "Switch" action

### Implementation

**New file: `src/hooks/useModelRecommendation.ts`**

A hook that:
- Takes the current message text and available metrics data
- Uses `classifyQuery()` to detect query type
- Cross-references with `aggregatedMetrics` from the `ai_model_metrics` table (fetched once) to find the fastest model within the suggested set
- Returns `{ queryType, recommendedModelId, recommendedModelName, reason }` or null
- Only triggers when message length > 15 characters (debounced)

**New file: `src/components/ModelRecommendationBanner.tsx`**

A small animated banner component that:
- Shows query type icon + "Recommended: [Model Name] -- [reason]"
- Has a "Switch" button to change the active model
- Has a dismiss (X) button
- Uses `framer-motion` AnimatePresence for smooth enter/exit
- Positioned above the chat input area

**Modified file: `src/pages/Chat.tsx`**

- Import and render `ModelRecommendationBanner` above the message input
- Pass current message, selected model, and an `onSwitchModel` callback
- The banner only appears when recommendation differs from current selection

**Modified file: `src/utils/queryClassifier.ts`**

- Update `getOptimalModels()` to return valid model IDs from `modelConfig.ts` (e.g., `lovable-gemini-flash` instead of `gemini`)
- Add a `math` category mapping to reasoning models

---

## Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `src/utils/modelComparisonPdfExport.ts` | Create | PDF generation for comparison data |
| `src/pages/ModelComparison.tsx` | Modify | Add export button |
| `src/hooks/useModelRecommendation.ts` | Create | Query-based model recommendation logic |
| `src/components/ModelRecommendationBanner.tsx` | Create | Recommendation UI banner |
| `src/pages/Chat.tsx` | Modify | Integrate recommendation banner |
| `src/utils/queryClassifier.ts` | Modify | Fix model ID mappings |

No database changes required. No new dependencies needed (jspdf already installed).

