import { useState, useLayoutEffect, type RefObject } from 'react'

function readCellSizeFrom(el: Element | null): number {
  if (!el || typeof window === 'undefined') return 30
  const raw = getComputedStyle(el).getPropertyValue('--cell-size').trim()
  return parseInt(raw, 10) || 30
}

/**
 * Returns the grid cell size in pixels for the given container, matching the
 * effective `--cell-size` after inheritance (e.g. `.battle-phase` / `.placement-phase`
 * overrides). Must be the same subtree as `.grid-cells` so sprites align with the grid.
 */
export function useCellSize(gridCellsRef: RefObject<HTMLElement | null>): number {
  const [cellSize, setCellSize] = useState(30)

  useLayoutEffect(() => {
    const el = gridCellsRef.current
    if (!el) return

    const update = () => setCellSize(readCellSizeFrom(el))

    /** iOS often applies new media queries one frame after orientationchange */
    const updateAfterOrientation = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(update)
      })
    }

    update()
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', updateAfterOrientation)

    const vv = window.visualViewport
    vv?.addEventListener('resize', update)

    let ro: ResizeObserver | undefined
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(update)
      ro.observe(el)
    }

    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', updateAfterOrientation)
      vv?.removeEventListener('resize', update)
      ro?.disconnect()
    }
  }, [gridCellsRef])

  return cellSize
}
