"use client";

import { highlights, calendarUrl } from "@/config/dashboard";

const tagStyles: Record<string, string> = {
  Active: "bg-green-100 text-green-800",
  "In Review": "bg-amber-100 text-amber-800",
  Paused: "bg-gray-100 text-gray-600",
};

export default function HighlightsPanel() {
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: "#1E6B5E" }}>
          ✨ Current Sprint Focus
        </h2>
        <a
          href={calendarUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs px-3 py-1.5 rounded-full font-semibold text-white transition-opacity hover:opacity-80"
          style={{ backgroundColor: "#1E6B5E" }}
        >
          📅 Open Calendar
        </a>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {highlights.map((h) => (
          <a
            key={h.id}
            href={h.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-4 rounded-xl border bg-white hover:shadow-md transition-shadow group"
            style={{ borderColor: "#1E6B5E33" }}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-semibold text-sm text-slate-800 group-hover:text-teal-700 leading-tight">{h.title}</h3>
              <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${tagStyles[h.tag] ?? "bg-gray-100 text-gray-700"}`}>
                {h.tag}
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">{h.description}</p>
          </a>
        ))}
      </div>
    </section>
  );
}
