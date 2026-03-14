"use client";

import { useState } from "react";
import { projects } from "@/config/dashboard";

const statusStyles: Record<string, string> = {
  Active: "bg-green-100 text-green-800",
  Paused: "bg-gray-100 text-gray-500",
  Review: "bg-amber-100 text-amber-800",
};

export default function ProjectsSection() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 bg-white font-semibold text-sm transition-all hover:shadow-md"
        style={{ borderColor: "#1E6B5E", color: "#1E6B5E" }}
      >
        <span>🚀 Projects</span>
        <svg
          className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="mt-2 rounded-xl border bg-white shadow-lg p-3" style={{ borderColor: "#1E6B5E33" }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {projects.map((p) => (
              <a
                key={p.name}
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors group border"
                style={{ borderColor: "#1E6B5E22" }}
              >
                <span className="text-xl">{p.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-teal-700">{p.name}</p>
                </div>
                <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${statusStyles[p.status] ?? "bg-gray-100 text-gray-700"}`}>
                  {p.status}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
