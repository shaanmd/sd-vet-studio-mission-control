'use client'

interface GreetingProps {
  name: string
}

export function Greeting({ name }: GreetingProps) {
  const h = new Date().getHours()
  const g = h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : 'Evening'
  const date = new Date().toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <div>
      <div
        className="font-bold leading-tight"
        style={{
          fontFamily: 'Georgia, serif',
          fontSize: 30,
          fontWeight: 700,
          color: '#1E6B5E',
          letterSpacing: -0.6,
          lineHeight: 1.05,
        }}
      >
        {g}, {name}.
      </div>
      <div className="text-[13px] mt-1.5" style={{ color: '#6B7A82' }}>
        {date}
      </div>
    </div>
  )
}
