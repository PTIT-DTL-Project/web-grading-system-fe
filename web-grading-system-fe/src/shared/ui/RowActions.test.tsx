// @vitest-environment jsdom
import { App } from 'antd'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '../../locales/i18n'
import { RowActions } from './RowActions'

// antd's Dropdown/Space subscribe to breakpoints and resize through APIs jsdom lacks.
if (typeof window !== 'undefined') {
  if (!window.matchMedia) {
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
  if (!('ResizeObserver' in window)) {
    class StubResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    ;(window as unknown as { ResizeObserver: unknown }).ResizeObserver = StubResizeObserver
  }
}

// vitest globals are off in this repo, so testing-library cannot register its cleanup.
afterEach(cleanup)

function renderActions(ui: React.ReactElement) {
  return render(<App>{ui}</App>)
}

const openMenu = () => fireEvent.click(screen.getByRole('button', { name: 'Thao tác' }))

describe('RowActions', () => {
  it('keeps the actions behind the "..." trigger and runs a plain one', async () => {
    const onEdit = vi.fn()
    renderActions(
      <RowActions actions={[{ key: 'edit', label: 'Chỉnh sửa', onClick: onEdit }]} />,
    )

    expect(screen.queryByText('Chỉnh sửa')).toBeNull()
    openMenu()

    const item = await screen.findByText('Chỉnh sửa')
    fireEvent.click(item)
    expect(onEdit).toHaveBeenCalledTimes(1)
  })

  it('drops hidden actions from the menu', async () => {
    renderActions(
      <RowActions
        actions={[
          { key: 'a', label: 'Hành động A', onClick: vi.fn() },
          { key: 'b', label: 'Hành động B', hidden: true, onClick: vi.fn() },
        ]}
      />,
    )
    openMenu()

    expect(await screen.findByText('Hành động A')).toBeTruthy()
    expect(screen.queryByText('Hành động B')).toBeNull()
  })

  it('confirms a destructive action before running it', async () => {
    const onDelete = vi.fn()
    renderActions(
      <RowActions
        actions={[
          {
            key: 'delete',
            label: 'Xóa',
            danger: true,
            confirmTitle: 'Bạn có chắc chắn muốn xóa?',
            onClick: onDelete,
          },
        ]}
      />,
    )
    openMenu()

    fireEvent.click(await screen.findByText('Xóa'))
    const dialog = await screen.findByRole('dialog')
    // antd renders the confirm title twice (modal title + confirm content).
    expect(within(dialog).getAllByText('Bạn có chắc chắn muốn xóa?').length).toBeGreaterThan(0)
    expect(onDelete).not.toHaveBeenCalled()

    fireEvent.click(within(dialog).getByRole('button', { name: /^Xóa$/ }))
    await waitFor(() => expect(onDelete).toHaveBeenCalledTimes(1))
  })

  it('renders no trigger when every action is hidden', () => {
    renderActions(
      <RowActions actions={[{ key: 'a', label: 'A', hidden: true, onClick: vi.fn() }]} />,
    )
    expect(screen.queryByRole('button', { name: 'Thao tác' })).toBeNull()
  })
})
