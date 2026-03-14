import HighlightsPanel from "@/components/HighlightsPanel";
import DailyTasks from "@/components/DailyTasks";
import PlanningSection from "@/components/PlanningSection";
import ProjectsSection from "@/components/ProjectsSection";
import DropdownSection from "@/components/DropdownSection";
import ContactsPanel from "@/components/ContactsPanel";
import { resources, brand, admin } from "@/config/dashboard";

export default function Home() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F5F0E8" }}>
      {/* Header */}
      <header className="border-b" style={{ backgroundColor: "#1E6B5E", borderColor: "#1E6B5E" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-lg">🐾</div>
            <div>
              <h1 className="text-white font-bold text-lg leading-tight">SD VetStudio</h1>
              <p className="text-white/70 text-xs">Mission Control</p>
            </div>
          </div>
          <div className="text-white/60 text-xs hidden sm:block">
            {new Date().toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Highlights */}
        <HighlightsPanel />

        {/* Divider */}
        <hr style={{ borderColor: "#1E6B5E22" }} />

        {/* Daily Tasks */}
        <DailyTasks />

        {/* Divider */}
        <hr style={{ borderColor: "#1E6B5E22" }} />

        {/* Planning */}
        <PlanningSection />

        {/* Dropdowns row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ProjectsSection />
          <DropdownSection title="Resources" emoji="📚" categories={resources} />
          <DropdownSection title="Brand" emoji="🎨" categories={brand} />
          <DropdownSection title="Admin" emoji="🔧" categories={admin} />
        </div>

        {/* Divider */}
        <hr style={{ borderColor: "#1E6B5E22" }} />

        {/* Contacts */}
        <ContactsPanel />

      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-4 sm:px-6 py-4 mt-2">
        <p className="text-xs text-center" style={{ color: "#1E6B5E99" }}>
          SD VetStudio Mission Control · v1.0 · Update{" "}
          <code className="font-mono bg-white/60 px-1 rounded">config/dashboard.ts</code>{" "}
          to edit content — no coding required.
        </p>
      </footer>
    </div>
  );
}
