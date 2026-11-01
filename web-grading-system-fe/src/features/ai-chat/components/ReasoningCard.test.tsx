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
    render(<ReasoningCard modelTurn={1} text="Working through it" status="RUNNING" available />)
    expect(screen.getByText('Working through it')).toBeTruthy()
  })
})
