# Design Spec: Google Search Redirection for AI Learning Keywords

## 1. Overview
In the AI explanation card (`AiExplanationCard.tsx`), each step analysis presents learning keywords (`learningKeywords`). Currently, these keywords are rendered as plain Ant Design `<Tag>` components. This specification details updating these tags so that clicking on a keyword opens Google Search in a new tab (`target="_blank"`, `rel="noopener noreferrer"`) with the keyword as the search query.

## 2. Requirements & Behavior
- **Target Component:** `StepAnalysisRow` inside `src/shared/ui/AiExplanationCard.tsx`.
- **Search URL Format:** `https://www.google.com/search?q=${encodeURIComponent(keyword)}`.
- **Opening Behavior:** Opens in a new tab with `target="_blank"` and `rel="noopener noreferrer"` for security and isolation.
- **Visual Design:**
  - Semantic HTML anchor `<a>` tag wrapping `<Tag>` or embedded within it with `text-decoration: none`.
  - Add search icon `SearchOutlined` to the `<Tag>`.
  - Add cursor pointer styling and `color="processing"` (or subtle primary tint) to indicate interactivity.
  - Add tooltip / `title` attribute for user clarity (e.g. "Tìm kiếm [keyword] trên Google").
- **Localization (i18n):**
  - Add `searchGoogle` key to `vi.json` and `en.json`.
  - `vi.json`: `"searchGoogle": "Tìm kiếm \"{{keyword}}\" trên Google"`
  - `en.json`: `"searchGoogle": "Search \"{{keyword}}\" on Google"`
- **Verification:**
  - Run `npm run i18n:check` to ensure no translation keys are missing.
  - Run `npm run lint` and `npm run build` (which includes `tsc -b`) to verify TypeScript and linting pass with zero errors.

## 3. Architecture & Code Changes
- File: `web-grading-system-fe/src/shared/ui/AiExplanationCard.tsx`
  - Import `SearchOutlined` from `@ant-design/icons`.
  - Update `keywords.map`:
    ```tsx
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
    ```
- File: `web-grading-system-fe/src/locales/vi.json`
  - Under `"ai"`: add `"searchGoogle": "Tìm kiếm \"{{keyword}}\" trên Google"`.
- File: `web-grading-system-fe/src/locales/en.json`
  - Under `"ai"`: add `"searchGoogle": "Search \"{{keyword}}\" on Google"`.

## 4. Risks & Mitigations
- Special characters in keywords: Handled safely using `encodeURIComponent(keyword)`.
- Security: `rel="noopener noreferrer"` prevents tab-nabbing / reverse-tabnabbing vulnerabilities.
- Broken layout: `Space` wrap is already in place with `size={[4, 4]}` and `textDecoration: 'none'` ensures tags look identical to standard AntD tags with the added search icon.
