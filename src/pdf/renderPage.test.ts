import { describe, expect, it, vi } from 'vitest'
import { renderPageToCanvas } from '@/pdf/renderPage'
import type { PDFPageProxy, PageViewport, RenderTask } from '@/pdf/pdfjs'

function fakeViewport(width: number, height: number): PageViewport {
  return { width, height } as PageViewport
}

function fakePage(renderTask: RenderTask): PDFPageProxy {
  return { render: vi.fn<() => RenderTask>().mockReturnValue(renderTask) } as unknown as PDFPageProxy
}

describe('renderPageToCanvas', () => {
  it('returns the RenderTask synchronously, without being itself awaitable', () => {
    const task = { promise: Promise.resolve(), cancel: vi.fn<() => void>() } as unknown as RenderTask
    const page = fakePage(task)
    const canvas = document.createElement('canvas')

    const result = renderPageToCanvas(page, canvas, fakeViewport(100, 200))

    expect(result).toBe(task)
    expect(result).not.toHaveProperty('then')
  })

  it('sets canvas pixel dimensions from the viewport', () => {
    const task = { promise: Promise.resolve(), cancel: vi.fn<() => void>() } as unknown as RenderTask
    const page = fakePage(task)
    const canvas = document.createElement('canvas')

    renderPageToCanvas(page, canvas, fakeViewport(321, 654))

    expect(canvas.width).toBe(321)
    expect(canvas.height).toBe(654)
  })

  it('calls page.render once with the canvas and viewport', () => {
    const task = { promise: Promise.resolve(), cancel: vi.fn<() => void>() } as unknown as RenderTask
    const page = fakePage(task)
    const canvas = document.createElement('canvas')
    const viewport = fakeViewport(50, 75)

    renderPageToCanvas(page, canvas, viewport)

    expect(page.render).toHaveBeenCalledTimes(1)
    expect(page.render).toHaveBeenCalledWith({ canvas, viewport })
  })
})
