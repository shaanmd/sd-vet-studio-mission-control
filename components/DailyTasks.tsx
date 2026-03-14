"use client";

import { dailyTasks } from "@/config/dashboard";

const tagColors: Record<string, string> = {
  Strategy: "bg-purple-100 text-purple-800",
  Content: "bg-blue-100 text-blue-800",
  Networking: "bg-green-100 text-green-800",
  Build: "bg-amber-100 text-amber-800",
  Ops: "bg-red-100 text-red-800",
  Maintenance: "bg-slate-100 text-slate-700",
};

function PersonTasks({ person }: { person: typeof dailyTasks.deb }) {
  const isTeal = person.color === "teal";
  return (
    <div className="flex-1 rounded-2xl border-2 overflow-hidden" style={{ borderColor: isTeal ? "#1E6B5E" : "#D4A853" }}>
      <div
        className="px-5 py-4 flex items-center gap-3"
        style={{ backgroundColor: isTeal ? "#1E6B5E" : "#D4A853" }}
      >
        <span className="text-2xl">{person.emoji}</span>
        <div>
          <h3 className="font-bold text-white text-lg leading-tight">{person.name}</h3>
          <p className="text-white/80 text-xs">{person.role}</p>
        </div>
      </div>
      <div className="p-4 bg-white space-y-3">
        {person.tasks.map((t, i) => (
          <div key={t.id} className="flex gap-3">
            <div
              className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold mt-0.5"
              style={{ backgroundColor: isTeal ? "#1E6B5E" : "#D4A853" }}
            >
              {i + 1}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-sm text-slate-800">{t.task}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tagColors[t.tag] ?? "bg-gray-100 text-gray-700"}`}>
                  {t.tag}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{t.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DailyTasks() {
  return (
    <section>
      <h2 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#1E6B5E" }}>
        ✅ Today&apos;s Top 3
      </h2>
      <div className="flex gap-4 flex-col sm:flex-row">
        <PersonTasks person={dailyTasks.deb} />
        <PersonTasks person={dailyTasks.shaan} />
      </div>
    </section>
  );
}
