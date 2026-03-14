"use client";

import { useState } from "react";

interface Item {
  label: string;
  url: string;
  note?: string;
}

interface Category {
  category: string;
  emoji: string;
  items: Item[];
}

interface Props {
  title: string;
  emoji: string;
  categories: Category[];
}

export default function DropdownSection({ title, emoji, categories }: Props) {
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 bg-white font-semibold text-sm transition-all hover:shadow-md"
        style={{ borderColor: "#1E6B5E", color: "#1E6B5E" }}
      >
        <span>{emoji} {title}</span>
        <svg
          className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="mt-2 rounded-xl border bg-white shadow-lg overflow-hidden" style={{ borderColor: "#1E6B5E33" }}>
          <div className="flex">
            {/* Category tabs */}
            <div className="w-40 shrink-0 border-r" style={{ borderColor: "#1E6B5E22", backgroundColor: "#F5F0E8" }}>
              {categories.map((cat) => (
                <button
                  key={cat.category}
                  onClick={() => setActiveCategory(activeCategory === cat.category ? null : cat.category)}
                  className="w-full text-left px-3 py-2.5 text-xs font-semibold transition-colors hover:bg-white"
                  style={{
                    color: activeCategory === cat.category ? "#1E6B5E" : "#2C3E50",
                    backgroundColor: activeCategory === cat.category ? "white" : undefined,
                    borderLeft: activeCategory === cat.category ? "3px solid #1E6B5E" : "3px solid transparent",
                  }}
                >
                  {cat.emoji} {cat.category}
                </button>
              ))}
            </div>

            {/* Items */}
            <div className="flex-1 p-3 min-h-[120px]">
              {activeCategory ? (
                <div className="space-y-1">
                  {categories
                    .find((c) => c.category === activeCategory)
                    ?.items.map((item) => (
                      <div key={item.label}>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                          style={{ color: "#1E6B5E" }}
                        >
                          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          {item.label}
                        </a>
                        {item.note && (
                          <p className="text-xs text-slate-400 pl-7 pb-1">{item.note}</p>
                        )}
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 p-2">Select a category →</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
