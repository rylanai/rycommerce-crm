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

const STAGES = [
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
  const srcColor = SOURCE_COLORS[lead.source?.toLowerCase()] || "#6b7280";

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
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1"
              style={{ backgroundColor: srcColor }}
              title={lead.source?.toUpperCase()}
            />
          </div>
          <p className="text-gray-400 text-xs mb-1">{lead.phone}</p>
          <p className="text-gray-400 text-xs mb-1 truncate">
            {lead.property_address}
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
                className="mt-3 w-full py-1.5 rounded bg-red-600 hover:bg-red-700 text-white text-xs font-semibold cursor-pointer"
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
  const [authenticated, setAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [sourceFilter, setSourceFilter] = useState("ALL");

  const fetchLeads = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/leads`);
      const data = await res.json();
      setLeads(data);
    } catch (err) {
      console.error("Error fetching leads:", err);
    }
  }, []);

  useEffect(() => {
    if (authenticated) {
      fetchLeads();
      const interval = setInterval(fetchLeads, 10000);
      return () => clearInterval(interval);
    }
  }, [authenticated, fetchLeads]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === PASSWORD) {
      setAuthenticated(true);
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
            Ry Commerce CRM
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
        <h1 className="text-white text-xl font-bold">Ry Commerce CRM</h1>
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
          <div className="flex gap-3 min-w-max">
            {STAGES.map((stage) => {
              const stageLeads = getLeadsByStage(stage);
              return (
                <div
                  key={stage}
                  className="w-72 bg-gray-800 rounded-xl flex flex-col max-h-[calc(100vh-140px)]"
                >
                  <div className="px-3 py-3 border-b border-gray-700 flex justify-between items-center">
                    <h3 className="text-white text-sm font-semibold">
                      {stage}
                    </h3>
                    <span className="bg-gray-700 text-gray-300 text-xs px-2 py-0.5 rounded-full">
                      {stageLeads.length}
                    </span>
                  </div>
                  <Droppable droppableId={stage}>
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
              );
            })}
          </div>
        </DragDropContext>
      </div>

      {/* Footer */}
      <div className="bg-gray-800 border-t border-gray-700 px-6 py-3 text-center">
        <p className="text-gray-500 text-sm">&copy; 2025 Ry Commerce LLC</p>
      </div>
    </div>
  );
}
