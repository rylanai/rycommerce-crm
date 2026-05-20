"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";

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
  { id: "t12", title: "No response to majors", body: "No worries if so, just need to know what major repairs are needed" },
  { id: "t13", title: "No response to asking price", body: "Hi do you know how much you need to get for the property?" },
  { id: "t14", title: "No response to message 1-2", body: "Hi are you still looking to sell your property? 9631 S Cicero Ave; Oak Lawn; IL; 60453" },
  { id: "t15", title: "No response to closing time", body: "Hi did you know when you are looking to close and finalize the sale?\nWe can work on your timeline" },
  { id: "t16", title: "No response to photos", body: "Hi do you happen to have photos of the property? No worries if not" },
  { id: "t17", title: "No response to access", body: "Hi would our team be able to access the property throughout closing? We would confirm the date and time with you beforehand" },
  { id: "t18", title: "No response after sent contract", body: "Hi just wanted to follow up. Are you still looking to sell? Is there anything I can do to help?\n\nOr\n\nIf you want to sell feel free to reach out, we are good to go on our end 👍" },
  { id: "t19", title: "No response to novation offer", body: "If there’s a price somewhere around there that would make it work for you let me know and I can try to get my brother in law on board" },
  { id: "t20", title: "Asking price way too high — Novation offer", body: "So with the year that it was built, the repair cost, and it backing up to the road right there that does put us more in that range of where 3741 Er Smyth Dr, Mims, FL 32754 sold for which was $430,000.\n\nHowever, the good news is that yours is larger and has that extra 1.5 bath, so that would put you at around $470,000 if you sold on the market with a realtor. Then obviously with the realtor commissions, title fees, and repair costs for the roof you’re looking at probably a 12% hit on that sales price which leaves you with $414,000 net cash.\n\nSo then with the all cash route we’re looking at even lower than that unfortunately. I talked with all of my buddies who also invest in Mims and the highest maximum offer kept coming back too low at $401,000, so that wouldn’t work either.\n\nI do however have a process that’s recently become very popular with all of the sellers I work with in Mims. I assume it’s because there’s still no work on your end and you end up with a lot more money. I ran all of the numbers for this too and it actually came back right at $422,000 net cash to you. Do you want to hear how the process works? It’s just as simple as cash and there’s still no work, fees, or repairs on your end 👍" },
];

const STORAGE_KEY = "crm_templates_v1";
const MIGRATION_KEY = "crm_templates_migrated_to_db";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function readLocalTemplates(): Template[] | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {}
  return null;
}

async function fetchTemplatesFromServer(): Promise<Template[]> {
  const res = await fetch(`${API_URL}/api/templates`);
  if (!res.ok) throw new Error("Failed to fetch templates");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

async function pushTemplatesToServer(list: Template[]): Promise<void> {
  await fetch(`${API_URL}/api/templates`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(list),
  });
}

// Load order: server first. If server is empty, seed from localStorage (one-time
// migration) or DEFAULTS. Always end with templates persisted server-side.
async function loadTemplatesAsync(): Promise<Template[]> {
  try {
    const server = await fetchTemplatesFromServer();
    if (server.length > 0) {
      if (typeof window !== "undefined") localStorage.setItem(MIGRATION_KEY, "1");
      return server;
    }
    const local = readLocalTemplates();
    const seed = local && local.length > 0 ? local : DEFAULTS;
    await pushTemplatesToServer(seed);
    if (typeof window !== "undefined") localStorage.setItem(MIGRATION_KEY, "1");
    return seed;
  } catch {
    return readLocalTemplates() || DEFAULTS;
  }
}

export default function TemplatesDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Template | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    loadTemplatesAsync().then(setTemplates);
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
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }
    pushTemplatesToServer(list).catch((err) =>
      console.error("Failed to sync templates to server:", err)
    );
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

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    if (result.source.index === result.destination.index) return;
    const next = [...templates];
    const [moved] = next.splice(result.source.index, 1);
    next.splice(result.destination.index, 0, moved);
    persist(next);
  };

  const reorderable = query.trim() === "";

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-md bg-slate-950/95 backdrop-blur-xl border-l border-white/10 flex flex-col shadow-2xl">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.7)]" />
            <h2 className="text-white font-bold tracking-tight">Templates</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={startNew}
              className="text-xs px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold cursor-pointer shadow-lg shadow-indigo-900/30 transition"
            >
              + New
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 cursor-pointer text-lg leading-none transition-colors"
              title="Close"
            >
              ×
            </button>
          </div>
        </div>

        {!editing && (
          <div className="px-5 py-3 border-b border-white/5">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search templates…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-white/5 text-white text-sm rounded-xl pl-9 pr-3 py-2.5 outline-none border border-white/10 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 placeholder-gray-500 transition"
              />
            </div>
          </div>
        )}

        {editing ? (
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            <div>
              <label className="text-xs uppercase tracking-wider text-gray-500 mb-1.5 block">Title</label>
              <input
                type="text"
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                className="w-full bg-white/5 text-white text-sm rounded-xl px-3 py-2.5 outline-none border border-white/10 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 transition"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-gray-500 mb-1.5 block">Message</label>
              <textarea
                value={editing.body}
                onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                rows={10}
                className="w-full bg-white/5 text-white text-sm rounded-xl px-3 py-2.5 outline-none border border-white/10 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 resize-y transition"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={saveEditing}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold cursor-pointer shadow-lg shadow-indigo-900/30 transition"
              >
                Save
              </button>
              <button
                onClick={() => setEditing(null)}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm cursor-pointer transition"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-3">
            {filtered.length === 0 && (
              <p className="text-gray-500 text-sm text-center mt-8">No templates match.</p>
            )}
            {!reorderable && (
              <p className="text-gray-500 text-[11px] text-center mb-2 italic">Clear search to reorder</p>
            )}
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="templates" isDropDisabled={!reorderable}>
                {(dropProvided) => (
                  <div
                    ref={dropProvided.innerRef}
                    {...dropProvided.droppableProps}
                    className="space-y-2"
                  >
                    {filtered.map((t, index) => (
                      <Draggable
                        key={t.id}
                        draggableId={t.id}
                        index={index}
                        isDragDisabled={!reorderable}
                      >
                        {(dragProvided, dragSnapshot) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            className={`group rounded-xl border p-3 cursor-pointer [transition:background-color_150ms,border-color_150ms,box-shadow_150ms] ${
                              dragSnapshot.isDragging
                                ? "bg-slate-800 border-indigo-400/50 ring-1 ring-indigo-400/50 shadow-2xl shadow-indigo-900/40"
                                : copiedId === t.id
                                ? "border-emerald-400/50 bg-emerald-500/10 ring-1 ring-emerald-400/30"
                                : "border-white/5 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/15"
                            }`}
                            onClick={() => {
                              if (!dragSnapshot.isDragging) copyTemplate(t);
                            }}
                          >
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <div className="flex items-start gap-2 flex-1 min-w-0">
                                {reorderable && (
                                  <button
                                    {...dragProvided.dragHandleProps}
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-gray-500 hover:text-gray-200 cursor-grab active:cursor-grabbing flex-shrink-0 mt-0.5"
                                    title="Drag to reorder"
                                    aria-label="Drag to reorder"
                                  >
                                    <svg width="12" height="14" viewBox="0 0 24 24" fill="currentColor">
                                      <circle cx="9" cy="6" r="1.5" />
                                      <circle cx="15" cy="6" r="1.5" />
                                      <circle cx="9" cy="12" r="1.5" />
                                      <circle cx="15" cy="12" r="1.5" />
                                      <circle cx="9" cy="18" r="1.5" />
                                      <circle cx="15" cy="18" r="1.5" />
                                    </svg>
                                  </button>
                                )}
                                <span className="text-white text-sm font-semibold tracking-tight truncate">{t.title}</span>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditing(t);
                                  }}
                                  className="w-6 h-6 inline-flex items-center justify-center rounded text-gray-400 hover:text-white hover:bg-white/10 text-xs cursor-pointer"
                                  title="Edit"
                                >
                                  ✎
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteTemplate(t.id);
                                  }}
                                  className="w-6 h-6 inline-flex items-center justify-center rounded text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 text-xs cursor-pointer"
                                  title="Delete"
                                >
                                  🗑
                                </button>
                              </div>
                            </div>
                            <p className="text-gray-400 text-xs whitespace-pre-wrap line-clamp-3 leading-relaxed">{t.body}</p>
                            {copiedId === t.id && (
                              <p className="text-emerald-400 text-xs mt-2 font-semibold flex items-center gap-1">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M20 6L9 17l-5-5" />
                                </svg>
                                Copied
                              </p>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {dropProvided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>
        )}
      </div>
    </div>
  );
}
