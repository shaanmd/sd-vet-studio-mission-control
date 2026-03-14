"use client";

import { contacts } from "@/config/dashboard";

export default function ContactsPanel() {
  return (
    <section>
      <h2 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#1E6B5E" }}>
        👥 Contacts
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {contacts.map((c) => (
          <div
            key={c.name}
            className="p-3 rounded-xl border bg-white text-center"
            style={{ borderColor: "#1E6B5E33" }}
          >
            <div className="text-2xl mb-1">{c.emoji}</div>
            <p className="text-sm font-semibold text-slate-800 leading-tight">{c.name}</p>
            <p className="text-xs text-slate-500 mt-0.5">{c.role}</p>
            {c.contact && (
              <p className="text-xs mt-1" style={{ color: "#1E6B5E" }}>{c.contact}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
