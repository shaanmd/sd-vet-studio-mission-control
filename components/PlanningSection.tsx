"use client";

import { planning } from "@/config/dashboard";

export default function PlanningSection() {
  const items = [planning.taskManager, planning.projectPrioritiser, planning.calendar];

  return (
    <section>
      <h2 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#1E6B5E" }}>
        📋 Planning
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {items.map((item) => (
          <a
            key={item.label}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center p-4 rounded-xl border-2 bg-white hover:bg-teal-50 hover:border-teal-600 transition-all text-center group"
            style={{ borderColor: "#1E6B5E" }}
          >
            <span className="font-bold text-sm" style={{ color: "#1E6B5E" }}>{item.label}</span>
            <span className="text-xs text-slate-500 mt-1">{item.description}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
