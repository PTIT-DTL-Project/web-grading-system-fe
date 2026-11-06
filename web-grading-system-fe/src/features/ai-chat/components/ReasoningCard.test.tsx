// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ReasoningCard } from './ReasoningCard'

describe('ReasoningCard', () => {
  it('shows the provider text on expansion and hides it on collapse', () => {
    render(<ReasoningCard modelTurn={2} text="Inspecting the assignment" status="COMPLETED" available />)
    const toggle = screen.getByRole('button', { name: /Suy luận lượt 2/i })
    expect(screen.queryByText('Inspecting the assignment')).toBeNull()
    fireEvent.click(toggle)
    expect(screen.getByText('Inspecting the assignment')).toBeTruthy()
    fireEvent.click(toggle)
    expect(screen.queryByText('Inspecting the assignment')).toBeNull()
  })

  it('opens the reasoning while it streams', () => {
    const view = render(<ReasoningCard modelTurn={1} text="Working through it" status="RUNNING" available />)
    expect(screen.getByText('Working through it')).toBeTruthy()
    expect(view.container.querySelector('.reasoning-cursor')).toBeTruthy()
  })

  it('removes the cursor when reasoning finishes', () => {
    const view = render(<ReasoningCard modelTurn={1} text="Working through it" status="RUNNING" available />)
    view.rerender(<ReasoningCard modelTurn={1} text="Working through it" status="COMPLETED" available />)
    expect(view.container.querySelector('.reasoning-cursor')).toBeNull()
  })

  it('does not claim the provider returned no reasoning before streaming finishes', () => {
    render(<ReasoningCard modelTurn={1} text="" status="RUNNING" available={false} />)
    expect(screen.queryByText('Reasoning không được provider trả về')).toBeNull()
    expect(screen.getByText('Đang chờ dữ liệu suy luận...')).toBeTruthy()
  })

  it('reports missing reasoning after streaming finishes', () => {
    const view = render(<ReasoningCard modelTurn={1} text="" status="COMPLETED" available={false} />)
    fireEvent.click(view.container.querySelector('button')!)
    expect(view.container.textContent).toContain('Reasoning không được provider trả về')
  })
})
