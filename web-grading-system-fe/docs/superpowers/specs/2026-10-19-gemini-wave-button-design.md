# Design Spec: Gemini Wave Shimmer Button & Reassuring Message

## 1. Overview
When a user clicks "Tạo giải thích AI" (Generate AI Explanation) in `AiExplanationCard.tsx`, the request takes several seconds. To make the waiting experience delightful and prevent user impatience, we enhance the button with a Gemini-inspired animated gradient wave shimmer and floating pulse effect, and update the status message to a reassuring, comforting message: *"Sắp xong rồi, đang hoàn thiện giải thích cho bạn..."*.

## 2. Requirements & Behavior
- **Target Component:** `src/shared/ui/AiExplanationCard.tsx`
- **Button Animation when `generating === true`:**
  - Multi-stop Gemini gradient: `linear-gradient(90deg, #4285f4, #9b72cf, #d96570, #4285f4)`.
  - Animated wave effect: `background-size: 300% 100%` with `@keyframes geminiWave` moving smoothly.
  - Floating wave pulse: `@keyframes geminiPulse` subtly moving `translateY(-2px)` with a soft glow shadow (`box-shadow`).
  - Text on button: Shows loading spinner or sparkle/robot icon and "AI đang phân tích..." (`t('ai.generating')`).
- **Reassuring Status Text:**
  - When `generating === true`, replace the technical hint with a warm, comforting message:
    - Vietnamese: *"Sắp xong rồi, đang hoàn thiện giải thích cho bạn..."*
    - English: *"Almost ready, finalizing your explanation..."*
  - Add a subtle pulse or fade transition so it feels alive and calming.
- **Localization (i18n):**
  - Add `generatingReassuring` to `vi.json` and `en.json`.
- **Quality & Verification:**
  - `npm run i18n:check` must pass.
  - `npm run lint` must pass with 0 errors.
  - `npm run build` must succeed cleanly.

## 3. Architecture & Code Changes
- File: `web-grading-system-fe/src/shared/ui/AiExplanationCard.tsx`
  - Inline scoped styles / CSS keyframes injected via a `<style>` block or dynamic style object for `@keyframes geminiWave` and `@keyframes geminiPulse`.
  - Conditional styling on the Button when `generating` is true.
  - Render `t('ai.generatingReassuring')` when `generating` is true; otherwise render `t('ai.generatingHint')`.
- File: `web-grading-system-fe/src/locales/vi.json`
  - `"generatingReassuring": "Sắp xong rồi, đang hoàn thiện giải thích cho bạn..."`
- File: `web-grading-system-fe/src/locales/en.json`
  - `"generatingReassuring": "Almost ready, finalizing your explanation..."`
