export default function Home() {
  const today = new Date().toLocaleDateString("en-NZ", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: "#F5F0E8" }}>
      <div className="md:hidden mb-1">
        <p className="text-xs uppercase tracking-wider text-[#2C3E50]">SD VetStudio</p>
      </div>
      <div className="flex items-baseline justify-between mb-4">
        <h1 className="text-2xl font-bold text-[#2C3E50]">
          <span className="hidden md:inline">Home</span>
          <span className="md:hidden">Mission Control</span>
        </h1>
        <p className="text-xs text-[#8899a6]">{today}</p>
      </div>
      <div className="bg-white rounded-xl p-8 shadow-sm text-center space-y-2">
        <p className="text-4xl">🐾</p>
        <p className="text-lg font-semibold text-[#2C3E50]">Welcome to Mission Control!</p>
        <p className="text-sm text-[#8899a6]">Your second brain is being built.</p>
      </div>
    </div>
  )
}
