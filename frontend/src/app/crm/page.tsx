"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";

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
}: {
  lead: Lead;
  index: number;
  onDelete: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [addressCopied, setAddressCopied] = useState(false);
  const srcColor = SOURCE_COLORS[lead.source?.toLowerCase()] || "#6b7280";

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
          className="bg-gray-800 rounded-lg p-3 mb-2 cursor-pointer hover:bg-gray-750 border border-gray-700"
        >
          <div className="flex justify-between items-start mb-1">
            <span className="font-semibold text-white text-sm">
              {lead.first_name} {lead.last_name}
            </span>
            <div className="flex items-center gap-2">
              {lead.stage === "New Lead" && (
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
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: srcColor }}
                title={lead.source?.toUpperCase()}
              />
            </div>
          </div>
          <p className="text-xs mb-1">
            <a
              href={lead.stage === "New Lead"
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
          <div className="flex justify-between items-center">
            <span className="text-gray-500 text-xs">{lead.timeline}</span>
            <span className="text-gray-500 text-xs">
              {timeAgo(lead.created_at)}
            </span>
          </div>

          {expanded && (
            <div className="mt-3 pt-3 border-t border-gray-700 text-xs text-gray-300 space-y-1">
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
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [customStages, setCustomStages] = useState<CustomStage[]>([]);
  const [columnOrder, setColumnOrder] = useState<string[] | null>(null);

  const defaultWithCustom = [...DEFAULT_STAGES, ...customStages.map((s) => s.name)];
  const allStages = columnOrder
    ? [...columnOrder, ...defaultWithCustom.filter((s) => !columnOrder.includes(s))]
    : defaultWithCustom;

  const fetchLeads = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/leads`);
      const data = await res.json();
      setLeads(data);
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
    if (allStages.includes(name.trim())) {
      alert("A column with that name already exists.");
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/stages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), position: customStages.length }),
      });
      const newStage = await res.json();
      setCustomStages((prev) => [...prev, newStage]);
      const newOrder = [...allStages, name.trim()];
      saveColumnOrder(newOrder);
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

    // Update column order
    const newOrder = allStages.map((s) => (s === oldName ? trimmed : s));
    saveColumnOrder(newOrder);

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

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === PASSWORD) {
      setAuthenticated(true);
      localStorage.setItem("crm_auth", "true");
    } else {
      alert("Incorrect password");
    }
  };

  const filteredLeads =
    sourceFilter === "ALL"
      ? leads
      : leads.filter(
          (l) => l.source?.toLowerCase() === sourceFilter.toLowerCase()
        );

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

    // Column reorder
    if (result.type === "COLUMN") {
      const newOrder = [...allStages];
      const [moved] = newOrder.splice(result.source.index, 1);
      newOrder.splice(result.destination.index, 0, moved);
      saveColumnOrder(newOrder);
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
        <div className="flex items-center gap-2">
          {["ALL", "META", "SMS", "PPC"].map((src) => (
            <button
              key={src}
              onClick={() => setSourceFilter(src)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold cursor-pointer transition-colors ${
                sourceFilter === src
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              {src}
            </button>
          ))}
        </div>
        <span className="text-gray-400 text-sm">
          {filteredLeads.length} lead{filteredLeads.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-4">
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
                                  if (!confirm(`Delete column "${stage}"?`)) return;
                                  const custom = customStages.find((s) => s.name === stage);
                                  if (custom) {
                                    deleteCustomStage(custom);
                                  }
                                  const newOrder = allStages.filter((s) => s !== stage);
                                  saveColumnOrder(newOrder);
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
    </div>
  );
}
