"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import TemplatesDrawer from "./TemplatesDrawer";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const PASSWORD = "rycommerce2024";

const DEFAULT_STAGES = [
  "New Lead",
  "No Answer",
  "Asking Price",
  "Offered",
  "Contract Sent",
  "Contract Signed",
  "Assigned",
  "Closed",
  "Dead",
];

interface CustomStage {
  id: number;
  name: string;
  position: number;
}

const SOURCE_COLORS: Record<string, string> = {
  meta: "#3b82f6",
  sms: "#22c55e",
  ppc: "#f97316",
  propertyleads: "#a855f7",
  motivatedsellers: "#ec4899",
};

interface Lead {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  property_address: string;
  wants_to_sell: string;
  timeline: string;
  repairs: string;
  sell_reason: string;
  stage: string;
  source: string;
  utm_campaign: string;
  utm_source: string;
  sub_id_1: string;
  sub_id_2: string;
  sub_id_3: string;
  sub_id_4: string;
  sub_id_5: string;
  created_at: string;
  last_followed_up: string | null;
  notes: string | null;
  dispo_price: string | number | null;
  offer_price: string | number | null;
}

function parseMoney(v: string | number | null | undefined): number {
  if (v === null || v === undefined || v === "") return 0;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
  return isFinite(n) ? n : 0;
}

function leadSpread(lead: Lead): number {
  const dispo = parseMoney(lead.dispo_price);
  const offer = parseMoney(lead.offer_price);
  if (dispo <= 0 || offer <= 0) return 0;
  return dispo - offer;
}

function formatMoney(n: number): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(Math.round(n)).toLocaleString()}`;
}

function timeAgo(dateStr: string) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function LeadCard({
  lead,
  index,
  onDelete,
  onFollowUp,
  onUpdateNotes,
  onUpdatePrice,
  firstColumnName,
}: {
  lead: Lead;
  index: number;
  onDelete: (id: number) => void;
  onFollowUp: (id: number) => void;
  onUpdateNotes: (id: number, notes: string) => void;
  onUpdatePrice: (id: number, field: "dispo_price" | "offer_price", value: string) => void;
  firstColumnName: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [addressCopied, setAddressCopied] = useState(false);

  const isDead = lead.stage.toLowerCase().includes("dead");
  const needsFollowUp = !lead.last_followed_up ||
    (new Date().getTime() - new Date(lead.last_followed_up).getTime()) > 15 * 60 * 60 * 1000;

  const copyMessage = (e: React.MouseEvent) => {
    e.stopPropagation();
    const msg = `Is ${lead.property_address} the correct address?`;
    navigator.clipboard.writeText(msg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Draggable draggableId={String(lead.id)} index={index}>
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => setExpanded(!expanded)}
          className={`relative rounded-lg p-3 mb-2 cursor-pointer border ${isDead ? "bg-gray-900 border-gray-800 opacity-50" : "bg-gray-800 border-gray-700 hover:bg-gray-750"}`}
        >
          {(lead.source === "propertyleads" || lead.source === "motivatedsellers") && (
            <div
              className="absolute -top-1 left-3 w-2.5 h-4 shadow-md pointer-events-none"
              style={{
                backgroundColor: lead.source === "propertyleads" ? "#a855f7" : "#f97316",
                clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 70%, 0 100%)",
              }}
              title={lead.source === "propertyleads" ? "PropertyLeads" : "MotivatedSellers"}
            />
          )}
          <div className="flex justify-between items-start mb-1">
            <span className="font-semibold text-white text-sm">
              {lead.first_name} {lead.last_name}
            </span>
            <div className="flex items-center gap-2">
              {lead.stage === firstColumnName && (
                <button
                  onClick={copyMessage}
                  title={copied ? "Copied!" : "Copy message"}
                  className="text-gray-400 hover:text-white cursor-pointer"
                >
                  {copied ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                    </svg>
                  )}
                </button>
              )}
              {!isDead && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (needsFollowUp) {
                      onFollowUp(lead.id);
                    }
                  }}
                  className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer ${
                    needsFollowUp
                      ? "bg-red-500 text-white pulse-red"
                      : "bg-green-500 text-white"
                  }`}
                  title={needsFollowUp ? "Click to mark as followed up" : "Followed up"}
                >
                  {needsFollowUp ? "Follow Up" : "✓"}
                </button>
              )}
            </div>
          </div>
          <p className="text-xs mb-1">
            <a
              href={lead.stage === firstColumnName
                ? `sms:${lead.phone}&body=${encodeURIComponent(`Hello ${lead.first_name}, your information just came through our system saying you are looking to sell your property, ${lead.property_address}. 🙂\n\n-Rylan Patterson`)}`
                : `sms:${lead.phone}`}
              onClick={(e) => e.stopPropagation()}
              className="text-blue-400 hover:text-blue-300 underline"
            >
              {lead.phone}
            </a>
          </p>
          <p
            className={`text-xs mb-1 truncate cursor-pointer ${addressCopied ? "text-green-400" : "text-gray-400 hover:text-gray-300"}`}
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(lead.property_address);
              setAddressCopied(true);
              setTimeout(() => setAddressCopied(false), 2000);
            }}
            title="Click to copy address"
          >
            {addressCopied ? "Copied!" : lead.property_address}
          </p>
          <textarea
            placeholder="Add note..."
            value={lead.notes || ""}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => onUpdateNotes(lead.id, e.target.value)}
            rows={1}
            ref={(el) => {
              if (el) {
                el.style.height = "auto";
                el.style.height = el.scrollHeight + "px";
              }
            }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = el.scrollHeight + "px";
            }}
            className="w-full bg-gray-900/40 text-gray-300 text-xs outline-none border border-gray-700 focus:border-gray-500 rounded-md px-2 py-1.5 placeholder-gray-600 resize-none overflow-hidden mb-1 leading-snug"
          />
          <div className="flex justify-between items-center">
            <span className="text-green-400 text-xs font-semibold">
              {leadSpread(lead) > 0 ? `Value: ${formatMoney(leadSpread(lead))}` : ""}
            </span>
            <span className="text-gray-500 text-xs">
              {timeAgo(lead.created_at)}
            </span>
          </div>

          {expanded && (
            <div className="mt-3 pt-3 border-t border-gray-700 text-xs text-gray-300 space-y-1">
              <div
                className="flex gap-2 mb-2"
                onClick={(e) => e.stopPropagation()}
              >
                <label className="flex-1">
                  <span className="text-gray-500 block mb-0.5">Dispo Price</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="0"
                    value={lead.dispo_price ?? ""}
                    onChange={(e) => onUpdatePrice(lead.id, "dispo_price", e.target.value)}
                    className="w-full bg-gray-900/40 border border-gray-700 focus:border-gray-500 rounded-md px-2 py-1 text-white outline-none"
                  />
                </label>
                <label className="flex-1">
                  <span className="text-gray-500 block mb-0.5">Contract Price</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="0"
                    value={lead.offer_price ?? ""}
                    onChange={(e) => onUpdatePrice(lead.id, "offer_price", e.target.value)}
                    className="w-full bg-gray-900/40 border border-gray-700 focus:border-gray-500 rounded-md px-2 py-1 text-white outline-none"
                  />
                </label>
              </div>
              <p>
                <span className="text-gray-500">Email:</span> {lead.email}
              </p>
              <p>
                <span className="text-gray-500">Wants to Sell:</span>{" "}
                {lead.wants_to_sell}
              </p>
              <p>
                <span className="text-gray-500">Timeline:</span>{" "}
                {lead.timeline}
              </p>
              <p>
                <span className="text-gray-500">Repairs:</span> {lead.repairs}
              </p>
              <p>
                <span className="text-gray-500">Sell Reason:</span>{" "}
                {lead.sell_reason}
              </p>
              <p>
                <span className="text-gray-500">Source:</span>{" "}
                {lead.source?.toUpperCase()}
              </p>
              {lead.utm_campaign && (
                <p>
                  <span className="text-gray-500">UTM Campaign:</span>{" "}
                  {lead.utm_campaign}
                </p>
              )}
              {lead.utm_source && (
                <p>
                  <span className="text-gray-500">UTM Source:</span>{" "}
                  {lead.utm_source}
                </p>
              )}
              {lead.sub_id_1 && (
                <p>
                  <span className="text-gray-500">Sub ID 1:</span>{" "}
                  {lead.sub_id_1}
                </p>
              )}
              {lead.sub_id_2 && (
                <p>
                  <span className="text-gray-500">Sub ID 2:</span>{" "}
                  {lead.sub_id_2}
                </p>
              )}
              {lead.sub_id_3 && (
                <p>
                  <span className="text-gray-500">Sub ID 3:</span>{" "}
                  {lead.sub_id_3}
                </p>
              )}
              {lead.sub_id_4 && (
                <p>
                  <span className="text-gray-500">Sub ID 4:</span>{" "}
                  {lead.sub_id_4}
                </p>
              )}
              {lead.sub_id_5 && (
                <p>
                  <span className="text-gray-500">Sub ID 5:</span>{" "}
                  {lead.sub_id_5}
                </p>
              )}
              <p>
                <span className="text-gray-500">Created:</span>{" "}
                {new Date(lead.created_at).toLocaleString()}
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Delete ${lead.first_name} ${lead.last_name}?`)) {
                    onDelete(lead.id);
                  }
                }}
                className="mt-2 w-full py-1.5 rounded bg-red-600 hover:bg-red-700 text-white text-xs font-semibold cursor-pointer"
              >
                Delete Lead
              </button>
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}

export default function CRMPage() {
  const [authenticated, setAuthenticated] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("crm_auth") === "true";
    }
    return false;
  });
  const [passwordInput, setPasswordInput] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [sourceFilter, setSourceFilterState] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("crm_source_filter") || "ALL";
    }
    return "ALL";
  });
  const setSourceFilter = (v: string) => {
    setSourceFilterState(v);
    if (typeof window !== "undefined") {
      localStorage.setItem("crm_source_filter", v);
    }
  };
  const [chipOrder, setChipOrder] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("crm_chip_order");
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
    }
    return ["ALL", "META", "SMS", "PPC", "PPL"];
  });
  const [customStages, setCustomStages] = useState<CustomStage[]>([]);
  const [columnOrder, setColumnOrder] = useState<string[] | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!scrollRef.current) return;
      const container = scrollRef.current;
      const rect = container.getBoundingClientRect();
      const edgeZone = 100;

      if (e.clientX > rect.right - edgeZone) {
        if (!scrollInterval.current) {
          scrollInterval.current = setInterval(() => {
            container.scrollLeft += 12;
          }, 16);
        }
      } else if (e.clientX < rect.left + edgeZone) {
        if (!scrollInterval.current) {
          scrollInterval.current = setInterval(() => {
            container.scrollLeft -= 12;
          }, 16);
        }
      } else {
        if (scrollInterval.current) {
          clearInterval(scrollInterval.current);
          scrollInterval.current = null;
        }
      }
    };

    const handleMouseUp = () => {
      if (scrollInterval.current) {
        clearInterval(scrollInterval.current);
        scrollInterval.current = null;
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      if (scrollInterval.current) clearInterval(scrollInterval.current);
    };
  }, []);

  const defaultWithCustom = [...DEFAULT_STAGES, ...customStages.map((s) => s.name)];
  const globalStages = columnOrder ? columnOrder : defaultWithCustom;

  const [tabStages, setTabStages] = useState<Record<string, string[]>>(() => {
    if (typeof window === "undefined") return {};
    // Bust any tab-column lists saved before the server-data wait fix.
    if (localStorage.getItem("crm_columns_version") !== "v2") {
      for (const tab of ["META", "SMS", "PPC", "PPL"]) {
        localStorage.removeItem(`crm_columns_${tab}`);
      }
      localStorage.setItem("crm_columns_version", "v2");
      return {};
    }
    const out: Record<string, string[]> = {};
    for (const tab of ["META", "SMS", "PPC", "PPL"]) {
      const raw = localStorage.getItem(`crm_columns_${tab}`);
      if (raw) {
        try { out[tab] = JSON.parse(raw); } catch {}
      }
    }
    return out;
  });

  // Snapshot only after the server's real column_order has loaded — otherwise
  // we'd seed tabs with bare DEFAULT_STAGES while the fetch is still in flight.
  useEffect(() => {
    if (columnOrder === null) return;
    if (!globalStages || globalStages.length === 0) return;
    setTabStages((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const tab of ["META", "SMS", "PPC", "PPL"]) {
        if (!next[tab]) {
          next[tab] = [...globalStages];
          if (typeof window !== "undefined") {
            localStorage.setItem(`crm_columns_${tab}`, JSON.stringify(next[tab]));
          }
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [columnOrder, globalStages]);

  const saveTabStages = (tab: string, list: string[]) => {
    setTabStages((prev) => ({ ...prev, [tab]: list }));
    if (typeof window !== "undefined") {
      localStorage.setItem(`crm_columns_${tab}`, JSON.stringify(list));
    }
  };

  const allStages =
    sourceFilter === "ALL" ? globalStages : (tabStages[sourceFilter] || globalStages);
  const firstColumnName = allStages[0] || "New Lead";

  // Tracks fields the user is actively editing per lead; preserve these across
  // polls so the 10s refresh doesn't wipe in-progress typing.
  const pendingEditsRef = useRef<Record<number, Partial<Lead>>>({});

  const fetchLeads = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/leads`);
      const data: Lead[] = await res.json();
      const pending = pendingEditsRef.current;
      const merged = data.map((l) =>
        pending[l.id] ? { ...l, ...pending[l.id] } : l
      );
      setLeads(merged);
    } catch (err) {
      console.error("Error fetching leads:", err);
    }
  }, []);

  const fetchStages = useCallback(async () => {
    try {
      const [stagesRes, orderRes] = await Promise.all([
        fetch(`${API_URL}/api/stages`),
        fetch(`${API_URL}/api/settings/column-order`),
      ]);
      const stagesData = await stagesRes.json();
      const orderData = await orderRes.json();
      setCustomStages(stagesData);
      if (orderData.order) {
        setColumnOrder(orderData.order);
      }
    } catch (err) {
      console.error("Error fetching stages:", err);
    }
  }, []);

  const saveColumnOrder = async (newOrder: string[]) => {
    setColumnOrder(newOrder);
    try {
      await fetch(`${API_URL}/api/settings/column-order`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: newOrder }),
      });
    } catch (err) {
      console.error("Error saving column order:", err);
    }
  };

  const addCustomStage = async () => {
    const name = prompt("Enter column name:");
    if (!name || name.trim() === "") return;
    const trimmed = name.trim();
    if (allStages.includes(trimmed)) {
      alert("A column with that name already exists.");
      return;
    }
    try {
      // Always create the stage globally (backend) so a lead's stage value is
      // valid regardless of which tab created the column.
      const isKnown =
        DEFAULT_STAGES.includes(trimmed) ||
        customStages.some((s) => s.name === trimmed);
      if (!isKnown) {
        const res = await fetch(`${API_URL}/api/stages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: trimmed, position: customStages.length }),
        });
        const newStage = await res.json();
        setCustomStages((prev) => [...prev, newStage]);
      }

      if (sourceFilter === "ALL") {
        // ALL tab: append to global column order so every tab sees it as a known stage
        const newOrder = [...globalStages, trimmed];
        saveColumnOrder(newOrder);
      } else {
        // Non-ALL tab: only add to this tab's list. Also append to ALL's order
        // so the column shows on the master view (otherwise leads in this stage
        // would be invisible on ALL).
        saveTabStages(sourceFilter, [...allStages, trimmed]);
        if (!globalStages.includes(trimmed)) {
          saveColumnOrder([...globalStages, trimmed]);
        }
      }
    } catch (err) {
      console.error("Error adding stage:", err);
    }
  };

  const deleteCustomStage = async (stage: CustomStage) => {
    const stageLeads = leads.filter((l) => l.stage === stage.name);
    if (stageLeads.length > 0) {
      alert("Move all leads out of this column before deleting it.");
      return;
    }
    if (!confirm(`Delete column "${stage.name}"?`)) return;
    try {
      await fetch(`${API_URL}/api/stages/${stage.id}`, { method: "DELETE" });
      setCustomStages((prev) => prev.filter((s) => s.id !== stage.id));
    } catch (err) {
      console.error("Error deleting stage:", err);
    }
  };

  const renameColumn = async (oldName: string) => {
    const newName = prompt("Rename column:", oldName);
    if (!newName || newName.trim() === "" || newName.trim() === oldName) return;
    if (allStages.includes(newName.trim())) {
      alert("A column with that name already exists.");
      return;
    }
    const trimmed = newName.trim();

    // Update leads in this column to the new name
    const leadsInColumn = leads.filter((l) => l.stage === oldName);
    setLeads((prev) =>
      prev.map((l) => (l.stage === oldName ? { ...l, stage: trimmed } : l))
    );

    // Update global column order and every per-tab list so the renamed column
    // stays visible everywhere it was before.
    saveColumnOrder(globalStages.map((s) => (s === oldName ? trimmed : s)));
    for (const [t, list] of Object.entries(tabStages)) {
      if (list.includes(oldName)) {
        saveTabStages(t, list.map((s) => (s === oldName ? trimmed : s)));
      }
    }

    // Update custom stage if it is one
    const custom = customStages.find((s) => s.name === oldName);
    if (custom) {
      setCustomStages((prev) =>
        prev.map((s) => (s.name === oldName ? { ...s, name: trimmed } : s))
      );
      try {
        await fetch(`${API_URL}/api/stages/${custom.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: trimmed }),
        });
      } catch (err) {
        console.error("Error renaming custom stage:", err);
      }
    }

    // Update all leads in this column
    for (const lead of leadsInColumn) {
      try {
        await fetch(`${API_URL}/api/leads/${lead.id}/stage`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stage: trimmed }),
        });
      } catch (err) {
        console.error("Error updating lead stage:", err);
      }
    }
  };

  useEffect(() => {
    if (authenticated) {
      fetchLeads();
      fetchStages();
      const interval = setInterval(fetchLeads, 10000);
      return () => clearInterval(interval);
    }
  }, [authenticated, fetchLeads, fetchStages]);

  const notesTimerRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  const handleUpdateNotes = (id: number, notes: string) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, notes } : l))
    );
    pendingEditsRef.current[id] = {
      ...(pendingEditsRef.current[id] || {}),
      notes,
    };
    if (notesTimerRef.current[id]) clearTimeout(notesTimerRef.current[id]);
    notesTimerRef.current[id] = setTimeout(async () => {
      try {
        await fetch(`${API_URL}/api/leads/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes }),
        });
      } catch (err) {
        console.error("Error updating notes:", err);
      } finally {
        if (pendingEditsRef.current[id]) {
          delete pendingEditsRef.current[id].notes;
          if (Object.keys(pendingEditsRef.current[id]).length === 0) {
            delete pendingEditsRef.current[id];
          }
        }
      }
    }, 500);
  };

  const priceTimerRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const handleUpdatePrice = (
    id: number,
    field: "dispo_price" | "offer_price",
    value: string
  ) => {
    const stored = value === "" ? null : value;
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, [field]: stored } : l))
    );
    pendingEditsRef.current[id] = {
      ...(pendingEditsRef.current[id] || {}),
      [field]: stored,
    };
    const key = `${id}:${field}`;
    if (priceTimerRef.current[key]) clearTimeout(priceTimerRef.current[key]);
    priceTimerRef.current[key] = setTimeout(async () => {
      try {
        await fetch(`${API_URL}/api/leads/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [field]: stored }),
        });
      } catch (err) {
        console.error("Error updating price:", err);
      } finally {
        if (pendingEditsRef.current[id]) {
          delete pendingEditsRef.current[id][field];
          if (Object.keys(pendingEditsRef.current[id]).length === 0) {
            delete pendingEditsRef.current[id];
          }
        }
      }
    }, 500);
  };

  const handleFollowUp = async (id: number) => {
    const now = new Date().toISOString();
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, last_followed_up: now } : l))
    );
    try {
      await fetch(`${API_URL}/api/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ last_followed_up: now }),
      });
    } catch (err) {
      console.error("Error updating follow-up:", err);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === PASSWORD) {
      setAuthenticated(true);
      localStorage.setItem("crm_auth", "true");
    } else {
      alert("Incorrect password");
    }
  };

  const CHIP_SOURCES: Record<string, string[]> = {
    ALL: [],
    META: ["meta"],
    SMS: ["sms"],
    PPC: ["ppc"],
    PPL: ["propertyleads", "motivatedsellers"],
  };

  const filteredLeads =
    sourceFilter === "ALL"
      ? leads
      : leads.filter((l) => {
          const sources = CHIP_SOURCES[sourceFilter] || [sourceFilter.toLowerCase()];
          return sources.includes((l.source || "").toLowerCase());
        });

  const getLeadsByStage = (stage: string) =>
    filteredLeads.filter((l) => l.stage === stage);

  const handleDelete = async (id: number) => {
    setLeads((prev) => prev.filter((l) => l.id !== id));
    try {
      await fetch(`${API_URL}/api/leads/${id}`, { method: "DELETE" });
    } catch (err) {
      console.error("Error deleting lead:", err);
      fetchLeads();
    }
  };

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    // Chip reorder
    if (result.type === "CHIP") {
      const newOrder = [...chipOrder];
      const [moved] = newOrder.splice(result.source.index, 1);
      newOrder.splice(result.destination.index, 0, moved);
      setChipOrder(newOrder);
      if (typeof window !== "undefined") {
        localStorage.setItem("crm_chip_order", JSON.stringify(newOrder));
      }
      return;
    }

    // Column reorder
    if (result.type === "COLUMN") {
      const newOrder = [...allStages];
      const [moved] = newOrder.splice(result.source.index, 1);
      newOrder.splice(result.destination.index, 0, moved);
      if (sourceFilter === "ALL") {
        saveColumnOrder(newOrder);
      } else {
        saveTabStages(sourceFilter, newOrder);
      }
      return;
    }

    // Card move between columns
    const leadId = parseInt(result.draggableId);
    const newStage = result.destination.droppableId;

    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, stage: newStage } : l))
    );

    try {
      await fetch(`${API_URL}/api/leads/${leadId}/stage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStage }),
      });
    } catch (err) {
      console.error("Error updating stage:", err);
      fetchLeads();
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <form
          onSubmit={handleLogin}
          className="bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-sm"
        >
          <h2 className="text-white text-xl font-bold mb-6 text-center">
            crmEscrow
          </h2>
          <input
            type="password"
            placeholder="Enter password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            className="w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 mb-4 outline-none"
          />
          <button
            type="submit"
            className="w-full p-3 rounded-lg bg-blue-600 text-white font-bold cursor-pointer hover:bg-blue-700"
          >
            Login
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Top Bar */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-white text-xl font-bold">crmEscrow</h1>
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="chips" type="CHIP" direction="horizontal">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="flex items-center gap-2"
              >
                {chipOrder.map((value, index) => (
                  <Draggable key={value} draggableId={`chip-${value}`} index={index}>
                    {(dragProvided, dragSnapshot) => (
                      <div
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        {...dragProvided.dragHandleProps}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          if (!dragSnapshot.isDragging) setSourceFilter(value);
                        }}
                        className={`px-4 py-1.5 rounded-lg text-sm font-semibold cursor-grab active:cursor-grabbing transition-colors select-none ${
                          sourceFilter === value
                            ? "bg-blue-600 text-white"
                            : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        } ${dragSnapshot.isDragging ? "opacity-80 shadow-lg" : ""}`}
                      >
                        {value}
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setTemplatesOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm font-semibold cursor-pointer"
            title="Open message templates"
          >
            Templates
          </button>
          <span className="text-gray-400 text-sm">
            {filteredLeads.length} total
          </span>
          {(() => {
            const pipelineValue = filteredLeads.reduce((sum, l) => sum + leadSpread(l), 0);
            return pipelineValue > 0 ? (
              <span className="text-green-400 text-sm font-semibold">
                Value: {formatMoney(pipelineValue)}
              </span>
            ) : null;
          })()}
          <span className="text-gray-500 text-sm">|</span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-gray-700 text-gray-300 text-sm rounded-lg px-2 py-1 border border-gray-600 outline-none"
            />
            <span className="text-gray-400 text-sm">
              {filteredLeads.filter((l) => {
                const created = new Date(l.created_at);
                const selected = new Date(selectedDate + "T00:00:00");
                return created.toDateString() === selected.toDateString();
              }).length} leads
            </span>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div ref={scrollRef} className="flex-1 overflow-x-auto p-4">
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="board" type="COLUMN" direction="horizontal">
            {(boardProvided) => (
              <div
                ref={boardProvided.innerRef}
                {...boardProvided.droppableProps}
                className="flex gap-3 min-w-max"
              >
                {allStages.map((stage, colIndex) => {
                  const stageLeads = getLeadsByStage(stage);
                  const isCustom = customStages.some((s) => s.name === stage);
                  return (
                    <Draggable key={stage} draggableId={`col-${stage}`} index={colIndex}>
                      {(colProvided) => (
                        <div
                          ref={colProvided.innerRef}
                          {...colProvided.draggableProps}
                          className="w-72 bg-gray-800 rounded-xl flex flex-col max-h-[calc(100vh-140px)]"
                        >
                          <div
                            {...colProvided.dragHandleProps}
                            className="px-3 py-3 border-b border-gray-700 flex justify-between items-center cursor-grab"
                          >
                            <h3
                              className="text-white text-sm font-semibold cursor-pointer"
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                renameColumn(stage);
                              }}
                              title="Double-click to rename"
                            >
                              {stage}
                            </h3>
                            <div className="flex items-center gap-2">
                              {(() => {
                                const colValue = stageLeads.reduce((sum, l) => sum + leadSpread(l), 0);
                                return colValue > 0 ? (
                                  <span className="text-green-400 text-xs font-semibold">
                                    {formatMoney(colValue)}
                                  </span>
                                ) : null;
                              })()}
                              <span className="bg-gray-700 text-gray-300 text-xs px-2 py-0.5 rounded-full">
                                {stageLeads.length}
                              </span>
                              <button
                                onClick={() => {
                                  const stageLeadsCount = getLeadsByStage(stage).length;
                                  if (stageLeadsCount > 0) {
                                    alert("Move all leads out of this column before deleting it.");
                                    return;
                                  }
                                  if (sourceFilter !== "ALL") {
                                    if (!confirm(`Hide column "${stage}" from ${sourceFilter}? (Other tabs keep it.)`)) return;
                                    saveTabStages(sourceFilter, allStages.filter((s) => s !== stage));
                                    return;
                                  }
                                  if (!confirm(`Delete column "${stage}"? (This removes it everywhere.)`)) return;
                                  const custom = customStages.find((s) => s.name === stage);
                                  if (custom) {
                                    deleteCustomStage(custom);
                                  }
                                  const newOrder = globalStages.filter((s) => s !== stage);
                                  saveColumnOrder(newOrder);
                                  // Also remove from every per-tab list so it doesn't reappear
                                  for (const t of Object.keys(tabStages)) {
                                    saveTabStages(t, tabStages[t].filter((s) => s !== stage));
                                  }
                                }}
                                className="text-gray-500 hover:text-red-400 cursor-pointer text-xs"
                                title="Delete column"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                          <Droppable droppableId={stage} type="CARD">
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                className="flex-1 overflow-y-auto p-2 min-h-[100px]"
                              >
                                {stageLeads.map((lead, index) => (
                                  <LeadCard
                                    key={lead.id}
                                    lead={lead}
                                    index={index}
                                    onDelete={handleDelete}
                                    onFollowUp={handleFollowUp}
                                    onUpdateNotes={handleUpdateNotes}
                                    onUpdatePrice={handleUpdatePrice}
                                    firstColumnName={firstColumnName}
                                  />
                                ))}
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {boardProvided.placeholder}
                <button
                  onClick={addCustomStage}
                  className="w-72 min-h-[100px] bg-gray-800 rounded-xl flex items-center justify-center cursor-pointer hover:bg-gray-750 border-2 border-dashed border-gray-700 hover:border-gray-500 flex-shrink-0"
                >
                  <span className="text-gray-500 text-2xl">+</span>
                </button>
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      {/* Footer */}
      <div className="bg-gray-800 border-t border-gray-700 px-6 py-3 text-center">
        <p className="text-gray-500 text-sm">&copy; 2025 Ry Commerce LLC</p>
      </div>

      <TemplatesDrawer open={templatesOpen} onClose={() => setTemplatesOpen(false)} />
    </div>
  );
}
