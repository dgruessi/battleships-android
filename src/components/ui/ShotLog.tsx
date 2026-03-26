import { ShotRecord } from '@/models/types'
import { toAlgebraic } from '@/utils/coordinates'
import './ShotLog.css'

interface ShotLogProps {
  shotLog: ShotRecord[]
}

export default function ShotLog({ shotLog }: ShotLogProps) {
  const recent = [...shotLog].reverse().slice(0, 6)

  return (
    <div className="shot-log" data-testid="shot-log">
      {recent.map((record, i) => (
        <div key={i} className={`shot-record result-${record.result.toLowerCase()}`}>
          <span className="shot-by">{record.by === 'PLAYER' ? 'YOU' : 'FOE'}</span>
          <span className="shot-coord">{toAlgebraic(record.coord)}</span>
          <span className="shot-result">{record.result}</span>
          {record.result === 'SUNK' && record.shipId && (
            <span className="shot-shipname">{record.shipId.toUpperCase()}</span>
          )}
        </div>
      ))}
    </div>
  )
}
