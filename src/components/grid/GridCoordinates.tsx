import { COL_LABELS, ROW_LABELS } from '@/constants/grid'
import './GridCoordinates.css'

interface GridCoordinatesProps {
  position: 'top' | 'left'
}

export default function GridCoordinates({ position }: GridCoordinatesProps) {
  const labels = position === 'top' ? COL_LABELS : ROW_LABELS
  return (
    <div className={`grid-coords grid-coords-${position}`}>
      {labels.map((label) => (
        <span key={label} className="coord-label">
          {label}
        </span>
      ))}
    </div>
  )
}
