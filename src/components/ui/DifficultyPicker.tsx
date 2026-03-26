import { DifficultyLevel } from '@/constants/game'
import { cn } from '@/utils/cn'
import './DifficultyPicker.css'

const LEVELS = [
  { level: DifficultyLevel.EASY, label: 'Easy', desc: 'Random shots' },
  { level: DifficultyLevel.MEDIUM, label: 'Medium', desc: 'Hunt & target' },
  { level: DifficultyLevel.HARD, label: 'Hard', desc: 'Probability AI' },
]

interface DifficultyPickerProps {
  value: DifficultyLevel
  onChange: (d: DifficultyLevel) => void
}

export default function DifficultyPicker({ value, onChange }: DifficultyPickerProps) {
  return (
    <div className="difficulty-picker" data-testid="difficulty-picker">
      <span className="difficulty-title">DIFFICULTY</span>
      <div className="difficulty-options">
        {LEVELS.map(({ level, label, desc }) => (
          <button
            key={level}
            type="button"
            className={cn('difficulty-btn', value === level && 'active')}
            onClick={() => onChange(level)}
            aria-pressed={value === level}
          >
            <span className="difficulty-label">{label}</span>
            <span className="difficulty-desc">{desc}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
