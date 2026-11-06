import { describe, expect, it, vi } from 'vitest'
import { subscribeRunEvents } from './ai'

vi.mock('../../auth/keycloak', () => ({ refreshSession: async () => ({ accessToken: 'test-token' }) }))

describe('run SSE', () => {
  it('parses a split versioned event with its sequence and authorization', async () => {
    const body = 'id:7\nevent:reasoning.delta\ndata:{"version":1,"runId":"r1","sequence":7,"type":"reasoning.delta","modelTurn":1,"itemId":"i1","timestamp":"now","data":{"text":"hello"}}\n\n'
    const encoded = new TextEncoder().encode(body)
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoded.slice(0, 13))
        controller.enqueue(encoded.slice(13, 59))
        controller.enqueue(encoded.slice(59))
        controller.close()
      },
    })
    const fetchMock = vi.fn().mockResolvedValue(new Response(stream, { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const received = await new Promise<string>((resolve, reject) => {
      subscribeRunEvents('r1', 6, event => resolve(String(event.data.text)), error => reject(error.type))
    })
    expect(received).toBe('hello')
    expect(fetchMock.mock.calls[0][0]).toContain('afterSequence=6')
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer test-token')
    vi.unstubAllGlobals()
  })
})
