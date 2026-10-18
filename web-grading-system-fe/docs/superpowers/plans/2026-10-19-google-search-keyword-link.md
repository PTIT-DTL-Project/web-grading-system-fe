# Google Search AI Learning Keyword Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to click on AI learning keywords in the submission explanation card to open Google Search in a new tab with the keyword query.

**Architecture:** Wrap the keyword `Tag` in `AiExplanationCard.tsx` with a standard HTML `<a>` link pointed to `https://www.google.com/search?q=${encodeURIComponent(keyword)}` with `target="_blank"` and `rel="noopener noreferrer"`. Style the tag with `SearchOutlined` icon, pointer cursor, and tooltip/title. Provide translations for Vietnamese and English.

**Tech Stack:** React 19, TypeScript, Ant Design 6, react-i18next, Vite.

## Global Constraints
- Target workspace: `d:\Project\DATN\web-grading-system-fe\web-grading-system-fe`
- All translation keys must exist in both `vi.json` and `en.json`.
- Strict typing: `npm run build` (`tsc -b && vite build`) and `npm run lint` (`oxlint`) must pass cleanly.
- Target URL: `https://www.google.com/search?q=${encodeURIComponent(keyword)}`
- External links must use `target="_blank"` and `rel="noopener noreferrer"`.

---

### Task 1: Update i18n translation files

**Files:**
- Modify: `src/locales/vi.json`
- Modify: `src/locales/en.json`

**Interfaces:**
- Produces: `ai.searchGoogle` key with interpolation `{{keyword}}`

- [ ] **Step 1: Add translation key to vi.json**
Add `"searchGoogle": "Tìm kiếm \"{{keyword}}\" trên Google"` inside the `"ai"` object in `src/locales/vi.json`.

- [ ] **Step 2: Add translation key to en.json**
Add `"searchGoogle": "Search \"{{keyword}}\" on Google"` inside the `"ai"` object in `src/locales/en.json`.

- [ ] **Step 3: Run i18n check**
Run: `npm run i18n:check` in `web-grading-system-fe`.
Expected: PASS (No missing keys between vi and en).

- [ ] **Step 4: Commit translation changes**
```bash
git add src/locales/vi.json src/locales/en.json
git commit -m "feat(i18n): add searchGoogle translation key for ai learning keywords"
```

---

### Task 2: Update AiExplanationCard to make keywords clickable Google search links

**Files:**
- Modify: `src/shared/ui/AiExplanationCard.tsx:1-68`

**Interfaces:**
- Consumes: `ai.searchGoogle` from i18n, `SearchOutlined` from `@ant-design/icons`.
- Produces: Clickable `<a>` tags around `<Tag>` elements in `StepAnalysisRow`.

- [ ] **Step 1: Import SearchOutlined icon**
In `src/shared/ui/AiExplanationCard.tsx`, import `SearchOutlined` from `@ant-design/icons`.

- [ ] **Step 2: Update StepAnalysisRow keywords rendering**
Update the keywords mapping in `StepAnalysisRow`:
```tsx
      {keywords.length > 0 ? (
        <div>
          <Typography.Text strong style={{ fontSize: 12 }}>
            {t('ai.keywords')}
          </Typography.Text>
          <div style={{ marginTop: 4 }}>
            <Space size={[4, 4]} wrap>
              {keywords.map((keyword, index) => (
                <a
                  key={index}
                  href={`https://www.google.com/search?q=${encodeURIComponent(keyword)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: 'none' }}
                >
                  <Tag
                    icon={<SearchOutlined />}
                    color="processing"
                    style={{ cursor: 'pointer' }}
                    title={t('ai.searchGoogle', { keyword })}
                  >
                    {keyword}
                  </Tag>
                </a>
              ))}
            </Space>
          </div>
        </div>
      ) : null}
```

- [ ] **Step 3: Run lint check**
Run: `npm run lint` in `web-grading-system-fe`.
Expected: PASS (Zero errors).

- [ ] **Step 4: Run build check**
Run: `npm run build` in `web-grading-system-fe`.
Expected: PASS (`tsc -b` and `vite build` complete successfully).

- [ ] **Step 5: Commit card component updates**
```bash
git add src/shared/ui/AiExplanationCard.tsx
git commit -m "feat(ai): make learning keywords clickable to search on google"
```
