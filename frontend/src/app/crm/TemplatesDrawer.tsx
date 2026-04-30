"use client";

import { useEffect, useMemo, useState } from "react";

interface Template {
  id: string;
  title: string;
  body: string;
}

const DEFAULTS: Template[] = [
  { id: "t1", title: "Text 3 — Asking price", body: "Ok great, how much are you looking to get for it?" },
  { id: "t2", title: "Text 4 — Major repairs", body: "Got it, does the roof, air conditioning unit, or hot water heater need to be replaced?" },
  { id: "t3", title: "Text 5 — Close date", body: "Sounds good, do you have a date that you are looking to close by?" },
  { id: "t4", title: "Text 6 — Confirm specs", body: "Ok and I have it as a 2 bed 1 bath, 912 Sqft. Is that correct?" },
  { id: "t5", title: "Asking for photos", body: "Sounds good, do you have photos of the interior? No worries if not, will just make everything more efficient" },
  { id: "t6", title: "Confirming access — Part 1", body: "Got them thank you. How easily will our team (photographer, contractor, agent, appraiser, etc.) be able to access the property throughout closing?" },
  { id: "t7", title: "Confirming access — Part 2", body: "Will we be able to put a lockbox on so that we don't have to bug you every time one of our team members needs access?" },
  { id: "t8", title: "Confirming access — Part 3", body: "For context I would just contact you to confirm beforehand to make sure the date/time works with you" },
  { id: "t9", title: "Cash offer", body: "Sounds good, my number actually came back right there at $94,000. That’s cash, as-is (you don’t need to make any repairs), and we pay all of the closing costs. Which means the title company will send you a check/wire transfer for the full $94,000 minus whatever is owed on the property" },
  { id: "t10", title: "Novation offer — pitch", body: "Hey so I ran all of the scenarios, asked all of my buddies who also invest in Mansfield, and the highest maximum offer kept coming back too low at $132,000. I do have a process though that’s recently become very popular with all of the sellers I work with in Mansfield. I assume it’s because there’s still no work on your end and you end up with a lot more money. I ran all of the numbers for this too and it actually came back right at $178,000 net to you. Do you want to hear how the process works? It’s just as simple and there’s still no work or fees on your end 👍" },
  { id: "t11", title: "Novation offer — explanation", body: "So it’s called a novation I still handle everything, me and my local team just put it up on the mls. You get a lot more money and the only difference is it might just take 10-15 days longer for you to get the cash. You still don’t need to make any repairs, we cover all commissions, we pay all closing costs, and we will even pay for a moving company to help you move if needed. Which means the title company will send you a check/wire transfer for the full $178,000 minus whatever is owed on the property." },
];

const STORAGE_KEY = "crm_templates_v1";

function loadTemplates(): Template[] {
  if (typeof window === "undefined") return DEFAULTS;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return DEFAULTS;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  return DEFAULTS;
}

function saveTemplates(list: Template[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export default function TemplatesDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Template | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    setTemplates(loadTemplates());
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter(
      (t) => t.title.toLowerCase().includes(q) || t.body.toLowerCase().includes(q)
    );
  }, [templates, query]);

  const persist = (list: Template[]) => {
    setTemplates(list);
    saveTemplates(list);
  };

  const copyTemplate = (t: Template) => {
    navigator.clipboard.writeText(t.body);
    setCopiedId(t.id);
    setTimeout(() => setCopiedId((id) => (id === t.id ? null : id)), 1400);
  };

  const startNew = () => {
    setEditing({ id: `t-${Date.now()}`, title: "", body: "" });
  };

  const saveEditing = () => {
    if (!editing) return;
    const title = editing.title.trim();
    const body = editing.body.trim();
    if (!title || !body) return;
    const exists = templates.some((t) => t.id === editing.id);
    const next = exists
      ? templates.map((t) => (t.id === editing.id ? { ...editing, title, body } : t))
      : [...templates, { ...editing, title, body }];
    persist(next);
    setEditing(null);
  };

  const deleteTemplate = (id: string) => {
    if (!confirm("Delete this template?")) return;
    persist(templates.filter((t) => t.id !== id));
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/50" onClick={onClose} />
      <div className="w-full max-w-md bg-gray-900 border-l border-gray-700 flex flex-col">
        <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-white font-bold">Templates</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={startNew}
              className="text-xs px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold cursor-pointer"
            >
              + New
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white cursor-pointer text-xl leading-none"
              title="Close"
            >
              ×
            </button>
          </div>
        </div>

        {!editing && (
          <div className="px-4 py-3 border-b border-gray-700">
            <input
              type="text"
              placeholder="Search templates…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-gray-800 text-white text-sm rounded px-3 py-2 outline-none border border-gray-700 focus:border-gray-500 placeholder-gray-500"
            />
          </div>
        )}

        {editing ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Title</label>
              <input
                type="text"
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                className="w-full bg-gray-800 text-white text-sm rounded px-3 py-2 outline-none border border-gray-700 focus:border-gray-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Message</label>
              <textarea
                value={editing.body}
                onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                rows={10}
                className="w-full bg-gray-800 text-white text-sm rounded px-3 py-2 outline-none border border-gray-700 focus:border-gray-500 resize-y"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={saveEditing}
                className="flex-1 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold cursor-pointer"
              >
                Save
              </button>
              <button
                onClick={() => setEditing(null)}
                className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white text-sm cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filtered.length === 0 && (
              <p className="text-gray-500 text-sm text-center mt-8">No templates match.</p>
            )}
            {filtered.map((t) => (
              <div
                key={t.id}
                className={`group rounded-lg border p-3 cursor-pointer transition-colors ${
                  copiedId === t.id
                    ? "border-green-500 bg-green-500/10"
                    : "border-gray-700 bg-gray-800 hover:bg-gray-750 hover:border-gray-600"
                }`}
                onClick={() => copyTemplate(t)}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="text-white text-sm font-semibold">{t.title}</span>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditing(t);
                      }}
                      className="text-gray-400 hover:text-white text-xs cursor-pointer"
                      title="Edit"
                    >
                      ✎
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTemplate(t.id);
                      }}
                      className="text-gray-400 hover:text-red-400 text-xs cursor-pointer"
                      title="Delete"
                    >
                      🗑
                    </button>
                  </div>
                </div>
                <p className="text-gray-400 text-xs whitespace-pre-wrap line-clamp-3">{t.body}</p>
                {copiedId === t.id && (
                  <p className="text-green-400 text-xs mt-2 font-semibold">Copied!</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
