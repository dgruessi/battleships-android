import { useState, useEffect } from 'react'

function readCellSize(): number {
  if (typeof window === 'undefined') return 30
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue('--cell-size')
    .trim()
  return parseInt(raw, 10) || 30
}

/**
 * Returns the current grid cell size in pixels, re-computing on window resize
 * to match the responsive `--cell-size` CSS custom property.
 */
export function useCellSize(): number {
  const [cellSize, setCellSize] = useState(readCellSize)

  useEffect(() => {
    const handler = () => setCellSize(readCellSize())
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  return cellSize
}
