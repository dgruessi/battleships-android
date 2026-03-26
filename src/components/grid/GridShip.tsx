import { CSSProperties } from 'react'
import { Orientation } from '@/constants/game'
import { PlacedShip } from '@/models/types'
import carrierImg    from '@/assets/images/Carrier_length_5.png'
import battleshipImg from '@/assets/images/destroyer_length_4.png'
import cruiserImg    from '@/assets/images/destroyer_length_3.png'
import submarineImg  from '@/assets/images/submarine_length_3.png'
import destroyerImg  from '@/assets/images/Patrol_length_2.png'

const SHIP_IMAGES: Record<string, string> = {
  carrier:    carrierImg,
  battleship: battleshipImg,
  cruiser:    cruiserImg,
  submarine:  submarineImg,
  destroyer:  destroyerImg,
}

interface GridShipProps {
  ship: PlacedShip
  /** Pixel size of one grid cell (from useCellSize hook) */
  cellSize: number
  /** Gap between grid cells in pixels — matches CSS gap on .grid-cells */
  gap?: number
}

export default function GridShip({ ship, cellSize, gap = 1 }: GridShipProps) {
  const { definition, origin, orientation } = ship
  const src = SHIP_IMAGES[definition.id]
  if (!src) return null

  const size = definition.size
  const isVertical = orientation === Orientation.VERTICAL
  const stride = cellSize + gap

  if (!isVertical) {
    const w = size * cellSize + (size - 1) * gap
    const wrapperStyle: CSSProperties = {
      position: 'absolute',
      left: origin.col * stride,
      top: origin.row * stride,
      width: w,
      height: cellSize,
      pointerEvents: 'none',
      zIndex: 1,
      overflow: 'hidden',
    }
    return (
      <div style={wrapperStyle}>
        <img
          src={src}
          draggable="false"
          style={{ width: '100%', height: '100%', objectFit: 'fill', display: 'block' }}
        />
      </div>
    )
  }

  // Vertical ship — outer wrapper covers the column of cells, inner rotated 90° CW
  const outerW = cellSize
  const outerH = size * cellSize + (size - 1) * gap
  const innerW = outerH   // after rotation, innerW becomes the height
  const innerH = outerW   // after rotation, innerH becomes the width

  const innerLeft = (outerW - innerW) / 2   // negative for size > 1
  const innerTop  = (outerH - innerH) / 2   // positive for size > 1

  const outerStyle: CSSProperties = {
    position: 'absolute',
    left: origin.col * stride,
    top: origin.row * stride,
    width: outerW,
    height: outerH,
    pointerEvents: 'none',
    zIndex: 1,
    overflow: 'hidden',
  }

  const innerStyle: CSSProperties = {
    position: 'absolute',
    left: innerLeft,
    top: innerTop,
    width: innerW,
    height: innerH,
    transform: 'rotate(90deg)',
    transformOrigin: 'center',
    overflow: 'hidden',
  }

  return (
    <div style={outerStyle}>
      <div style={innerStyle}>
        <img
          src={src}
          draggable="false"
          style={{ width: '100%', height: '100%', objectFit: 'fill', display: 'block' }}
        />
      </div>
    </div>
  )
}
