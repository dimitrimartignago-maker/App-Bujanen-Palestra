const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

interface Props {
  activeDayIndex: number
  daysWithWorkout: number[]
  onChange: (dayIndex: number) => void
}

export default function DayTabs({ activeDayIndex, daysWithWorkout, onChange }: Props) {
  return (
    <div className="flex gap-1 overflow-x-auto pb-1">
      {DAY_LABELS.map((label, i) => {
        const hasWorkout = daysWithWorkout.includes(i)
        const isActive = activeDayIndex === i
        return (
          <button
            key={i}
            onClick={() => onChange(i)}
            className={`relative flex min-w-[52px] flex-col items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-black text-white'
                : hasWorkout
                ? 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                : 'text-gray-400 hover:bg-gray-50'
            }`}
          >
            {label}
            {hasWorkout && (
              <span
                className={`mt-1 h-1.5 w-1.5 rounded-full ${
                  isActive ? 'bg-white' : 'bg-black'
                }`}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
