// @vitest-environment jsdom
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import '../../locales/i18n'
// antd's Space/Descriptions subscribe to breakpoints through matchMedia, which jsdom lacks.
// Other component tests in this repo only use components that skip responsiveObserver.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList
}
import { StepDetailView } from './StepDetailView'
import type { StepDetailModel } from './stepDetail'

function dbSchemaStep(config: Record<string, unknown>): StepDetailModel {
  return {
    order: 0,
    name: 'Schema bảng books',
    description: null,
    stepType: 'DB_SCHEMA_CHECK',
    weight: 1,
    timeoutMs: null,
    config,
  }
}

/**
 * Students used to read raw grader vocabulary here: `TABLE_EXISTS books`,
 * `COLUMN_EXISTS books.id bigint`. Every check must render as a sentence instead.
 * Review: 2026-11-21, user report on the step detail view.
 */
describe('StepDetailView — DB_SCHEMA_CHECK', () => {
  const config = {
    connection: { db_type: 'postgres', database: 'bookstore', password: 'postgres' },
    checks: [
      { kind: 'TABLE_EXISTS', table_name: 'books' },
      { kind: 'COLUMN_EXISTS', table_name: 'books', column_name: 'id', data_type: 'bigint' },
      { kind: 'INDEX_EXISTS', table_name: 'books', index_name: 'idx_books_isbn' },
      { kind: 'PRIMARY_KEY', table_name: 'books', column: 'id' },
    ],
  }

  it('renders each check as a Vietnamese sentence for students', () => {
    const { container } = render(<StepDetailView variant="contract" model={dbSchemaStep(config)} />)
    const text = container.textContent ?? ''

    expect(text).toContain('Bảng «books» phải tồn tại trong CSDL.')
    expect(text).toContain('Bảng «books» phải có cột «id» với kiểu dữ liệu «bigint».')
    expect(text).toContain('Bảng «books» phải có index tên «idx_books_isbn».')
    expect(text).toContain('Bảng «books» phải có khoá chính trên cột «id».')

    // The raw enum and the terse "table.column type" form must be gone.
    expect(text).not.toContain('TABLE_EXISTS')
    expect(text).not.toContain('COLUMN_EXISTS')
    expect(text).not.toContain('books.id bigint')
  })

  it('translates the step type instead of printing the enum', () => {
    const { container } = render(<StepDetailView variant="contract" model={dbSchemaStep(config)} />)
    const text = container.textContent ?? ''
    expect(text).toContain('Kiểm tra cấu trúc CSDL')
    expect(text).not.toContain('DB_SCHEMA_CHECK')
  })

  it('keeps the technical fields for lecturers, with translated labels', () => {
    const { container } = render(<StepDetailView variant="full" model={dbSchemaStep(config)} />)
    const text = container.textContent ?? ''

    expect(text).toContain('Tên bảng')
    expect(text).toContain('Kiểu dữ liệu')
    // Lecturer keeps the connection block (with credentials) that students never get.
    expect(text).toContain('bookstore')
  })

  it('says so when nothing is declared instead of showing an empty list', () => {
    const { container } = render(
      <StepDetailView variant="contract" model={dbSchemaStep({ checks: [] })} />,
    )
    expect(container.textContent).toContain('Chưa khai báo kiểm tra nào')
  })
})

/**
 * Every assertion kind the validator accepts must show its fields. The old
 * per-kind switch rendered only the kind tag for `json_path_equals`,
 * `array_length`, `contains_item`, `greater_than`, `less_than`, `matches_regex`
 * and `any_of`, so a configured assertion looked empty.
 * Review: 2026-11-21, user report.
 */
describe('StepDetailView — HTTP assertions', () => {
  const httpStep = (assertions: unknown[]): StepDetailModel => ({
    order: 0,
    name: 'Tạo sách',
    description: null,
    stepType: 'HTTP_REQUEST',
    weight: 1,
    timeoutMs: null,
    config: { method: 'POST', path: '/books', expected_status: 201, assertions },
  })

  const textOf = (assertions: unknown[]) => {
    const { container } = render(<StepDetailView variant="full" model={httpStep(assertions)} />)
    return container.textContent ?? ''
  }

  it('shows path and expected value for json_path_equals', () => {
    const text = textOf([{ kind: 'json_path_equals', path: '$.title', equals: 'Clean Code' }])
    expect(text).toContain('Giá trị tại đường dẫn bằng')
    expect(text).toContain('$.title')
    expect(text).toContain('Clean Code')
  })

  it('shows both operands for greater_than and matches_regex', () => {
    expect(textOf([{ kind: 'greater_than', path: '$.price', value: 100 }])).toContain('$.price')
    const regex = textOf([{ kind: 'matches_regex', path: '$.isbn', pattern: '^[0-9]{13}$' }])
    expect(regex).toContain('^[0-9]{13}$')
  })

  it('defaults json_path to "must exist" when exists is omitted', () => {
    const text = textOf([{ kind: 'json_path', path: '$.id' }])
    expect(text).toContain('$.id')
    expect(text).toContain('Có')
  })

  it('renders nested assertions of any_of', () => {
    const text = textOf([
      { kind: 'any_of', assertions: [{ kind: 'field_equals', path: '$.state', equals: 'OK' }] },
    ])
    expect(text).toContain('Chỉ cần MỘT trong các điều kiện sau đúng')
    expect(text).toContain('$.state')
  })
})
