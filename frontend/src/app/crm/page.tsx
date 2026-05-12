"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
  DragUpdate,
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
  value: string | number | null;
  deal_type: "W" | "N" | null;
}

function parseMoney(v: string | number | null | undefined): number {
  if (v === null || v === undefined || v === "") return 0;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
  return isFinite(n) ? n : 0;
}

// Ordered: longer names first so "Contract Signed" matches before "Contract".
const STAGE_WEIGHTS: Array<[string, number]> = [
  ["contract signed", 0.5],
  ["contract sent", 0.25],
  ["assigned", 0.5],
  ["closed", 1],
];

function rawLeadValue(lead: Lead): number {
  // Prefer the live spread when both prices are filled in — that way editing
  // dispo/contract immediately moves the value. Fall back to the manual value
  // if the user only entered the bottom-of-card amount directly.
  const dispo = parseMoney(lead.dispo_price);
  const offer = parseMoney(lead.offer_price);
  if (dispo > 0 && offer > 0) return dispo - offer;
  return parseMoney(lead.value);
}

function stageWeight(stage: string): number {
  const s = (stage || "").toLowerCase();
  for (const [needle, weight] of STAGE_WEIGHTS) {
    if (s.includes(needle)) return weight;
  }
  return 0;
}

function leadValue(lead: Lead): number {
  return rawLeadValue(lead) * stageWeight(lead.stage);
}

function showsValue(stage: string): boolean {
  return stageWeight(stage) > 0;
}

type StageAccent = "amber" | "sky" | "emerald" | "rose";

function stageAccent(stage: string): StageAccent | null {
  const s = (stage || "").toLowerCase();
  if (s.includes("dead") || s.includes("refund")) return "rose";
  if (s.includes("assigned") || s.includes("closed")) return "emerald";
  if (s.includes("contract")) return "sky";
  if (
    s.includes("new lead") ||
    s.includes("answer") ||
    s.includes("asking") ||
    s.includes("gathering") ||
    s.includes("offer")
  ) {
    return "amber";
  }
  return null;
}

const STAGE_ACCENT_STYLES: Record<StageAccent, {
  header: string;
  count: string;
  rule: string;
  dot: string;
  shadow: string;
}> = {
  amber: {
    header: "bg-gradient-to-b from-amber-400/15 via-amber-400/5 to-transparent",
    count: "bg-amber-400/15 text-amber-200 ring-1 ring-amber-400/30",
    rule: "bg-gradient-to-r from-transparent via-amber-400/40 to-transparent",
    dot: "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.7)]",
    shadow: "shadow-[0_0_40px_-15px_rgba(251,191,36,0.35)]",
  },
  sky: {
    header: "bg-gradient-to-b from-sky-400/15 via-sky-400/5 to-transparent",
    count: "bg-sky-400/15 text-sky-200 ring-1 ring-sky-400/30",
    rule: "bg-gradient-to-r from-transparent via-sky-400/40 to-transparent",
    dot: "bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.7)]",
    shadow: "shadow-[0_0_40px_-15px_rgba(56,189,248,0.35)]",
  },
  emerald: {
    header: "bg-gradient-to-b from-emerald-400/15 via-emerald-400/5 to-transparent",
    count: "bg-emerald-400/15 text-emerald-200 ring-1 ring-emerald-400/30",
    rule: "bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent",
    dot: "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)]",
    shadow: "shadow-[0_0_40px_-15px_rgba(52,211,153,0.35)]",
  },
  rose: {
    header: "bg-gradient-to-b from-rose-500/15 via-rose-500/5 to-transparent",
    count: "bg-rose-500/15 text-rose-200 ring-1 ring-rose-500/30",
    rule: "bg-gradient-to-r from-transparent via-rose-500/40 to-transparent",
    dot: "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.7)]",
    shadow: "shadow-[0_0_40px_-15px_rgba(244,63,94,0.35)]",
  },
};

function formatMoney(n: number): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(Math.round(n)).toLocaleString()}`;
}

function isDimStage(stage: string): boolean {
  const s = (stage || "").toLowerCase();
  return s.includes("dead") || s.includes("refund");
}

function isClosedStage(stage: string): boolean {
  return (stage || "").toLowerCase().includes("closed");
}

function AnimatedNumber({ value, format }: { value: number; format?: (n: number) => string }) {
  const [display, setDisplay] = useState(value);
  const [bump, setBump] = useState(0);
  const fromRef = useRef(value);
  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) return;
    setBump((b) => b + 1);
    const dur = 450;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = from + (to - from) * eased;
      setDisplay(next);
      if (t < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  const out = format ? format(display) : Math.round(display).toLocaleString();
  return (
    <span key={bump} className="number-bump tabular-nums">
      {out}
    </span>
  );
}

interface ConfettiSpec {
  id: number;
  x: number;
  y: number;
}

function ConfettiBurst({ x, y, onDone }: { x: number; y: number; onDone: () => void }) {
  const particles = useMemo(() => {
    const colors = [
      "#a855f7", "#6366f1", "#22c55e", "#facc15",
      "#38bdf8", "#ec4899", "#f97316", "#34d399",
    ];
    return Array.from({ length: 48 }, (_, i) => {
      const angle = (Math.PI * 2 * (i / 48)) + (Math.random() * 0.6 - 0.3);
      const distance = 220 + Math.random() * 220;
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance * 0.6 + 380 + Math.random() * 200;
      const up = -200 - Math.random() * 220;
      const size = 6 + Math.random() * 8;
      const rot = (Math.random() - 0.5) * 1080;
      const isCircle = i % 3 === 0;
      return {
        color: colors[i % colors.length],
        size,
        rot,
        dx,
        dy,
        up,
        isCircle,
        delay: Math.random() * 80,
      };
    });
  }, []);
  useEffect(() => {
    const t = setTimeout(onDone, 1700);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="fixed inset-0 pointer-events-none z-[60]">
      {particles.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: x,
            top: y,
            width: p.size,
            height: p.size * (p.isCircle ? 1 : 0.55),
            background: p.color,
            borderRadius: p.isCircle ? "50%" : "2px",
            animationDelay: `${p.delay}ms`,
            ["--dx" as string]: `${p.dx}px`,
            ["--dy" as string]: `${p.dy}px`,
            ["--up" as string]: `${p.up}px`,
            ["--rot" as string]: `${p.rot}deg`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
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
  onUpdateDealType,
  onUpdateStage,
  stages,
  firstColumnName,
}: {
  lead: Lead;
  index: number;
  onDelete: (id: number) => void;
  onFollowUp: (id: number) => void;
  onUpdateNotes: (id: number, notes: string) => void;
  onUpdatePrice: (id: number, field: "dispo_price" | "offer_price" | "value", value: string) => void;
  onUpdateDealType: (id: number, dealType: "W" | "N" | null) => void;
  onUpdateStage: (id: number, newStage: string) => void;
  stages: string[];
  firstColumnName: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [addressCopied, setAddressCopied] = useState(false);
  const [editingValue, setEditingValue] = useState(false);
  const [poweringDown, setPoweringDown] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);

  const stageLower = lead.stage.toLowerCase();
  const isDead = stageLower.includes("dead");
  const isRefunded = stageLower.includes("refund");
  const isDimmed = isDead || isRefunded;

  const prevStageRef = useRef(lead.stage);
  useEffect(() => {
    const prev = prevStageRef.current;
    if (prev !== lead.stage) {
      if (!isDimStage(prev) && isDimStage(lead.stage)) {
        setPoweringDown(true);
        const t = setTimeout(() => setPoweringDown(false), 1500);
        prevStageRef.current = lead.stage;
        return () => clearTimeout(t);
      }
      prevStageRef.current = lead.stage;
    }
  }, [lead.stage]);
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
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => setExpanded(!expanded)}
          className={`relative rounded-xl p-3 mb-2 cursor-pointer border [transition:background-color_150ms,border-color_150ms,box-shadow_150ms] ${
            poweringDown
              ? "bg-gradient-to-b from-slate-800 to-slate-900 border-white/10 power-down"
              : isDimmed
              ? "bg-slate-950 border-white/5 opacity-50"
              : "bg-gradient-to-b from-slate-800 to-slate-900 border-white/10 hover:border-white/20 shadow-sm hover:shadow-lg hover:shadow-black/30"
          } ${snapshot.isDragging ? "ring-1 ring-indigo-400/50 shadow-2xl shadow-indigo-900/40" : ""}`}
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
            <span className="font-semibold text-white text-sm flex items-center gap-1.5">
              {lead.first_name} {lead.last_name}
              {lead.deal_type === "W" && (
                <span
                  className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-white text-black text-[10px] font-bold"
                  title="Wholesale"
                >
                  W
                </span>
              )}
              {lead.deal_type === "N" && (
                <span
                  className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-black text-white text-[10px] font-bold"
                  title="Novation"
                >
                  N
                </span>
              )}
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
              {!isDimmed && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (needsFollowUp) {
                      onFollowUp(lead.id);
                    }
                  }}
                  className={`flex-shrink-0 inline-flex items-center justify-center rounded-full text-[10px] font-bold cursor-pointer ${
                    needsFollowUp
                      ? "px-2 py-0.5 bg-red-500 text-white pulse-red"
                      : "w-5 h-5 bg-emerald-500 text-white shadow-[0_0_10px_rgba(52,211,153,0.5)]"
                  }`}
                  title={needsFollowUp ? "Click to mark as followed up" : "Followed up"}
                >
                  {needsFollowUp ? (
                    "Follow Up"
                  ) : (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12.5l4.5 4.5L20 6" />
                    </svg>
                  )}
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
            {showsValue(lead.stage) ? (
              <div
                className="flex items-center gap-1 text-green-400 text-xs font-semibold"
                onClick={(e) => e.stopPropagation()}
              >
                {editingValue ? (
                  <>
                    <span>$</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="1000"
                      placeholder="0"
                      autoFocus
                      value={lead.value ?? ""}
                      onChange={(e) => onUpdatePrice(lead.id, "value", e.target.value)}
                      onBlur={() => setEditingValue(false)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === "Escape") {
                          (e.target as HTMLInputElement).blur();
                        }
                      }}
                      className="w-20 bg-transparent border-b border-gray-700 focus:border-green-500 outline-none text-green-400 placeholder-gray-600"
                    />
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditingValue(true)}
                    className="cursor-text hover:text-green-300"
                    title="Click to edit deal value"
                  >
                    +{leadValue(lead) > 0 ? formatMoney(leadValue(lead)) : "$0"}
                  </button>
                )}
              </div>
            ) : (
              <span />
            )}
            <span className="text-gray-500 text-xs">
              {timeAgo(lead.created_at)}
            </span>
          </div>

          {expanded && (
            <div className="mt-3 pt-3 border-t border-gray-700 text-xs text-gray-300 space-y-1">
              <div
                className="flex items-center gap-2 mb-2"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="text-gray-500">Stage:</span>
                <select
                  value={lead.stage}
                  onChange={(e) => {
                    const next = e.target.value;
                    if (next && next !== lead.stage) onUpdateStage(lead.id, next);
                  }}
                  className="flex-1 bg-slate-900 border border-white/10 hover:border-white/20 focus:border-indigo-400 text-white text-xs rounded-md px-2 py-1.5 outline-none cursor-pointer [color-scheme:dark]"
                >
                  {!stages.includes(lead.stage) && (
                    <option value={lead.stage}>{lead.stage}</option>
                  )}
                  {stages.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div
                className="flex items-center gap-2 mb-2"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="text-gray-500">Deal Type:</span>
                {(["W", "N"] as const).map((t) => {
                  const active = lead.deal_type === t;
                  const activeClass =
                    t === "W"
                      ? "bg-white text-black"
                      : "bg-black text-white border border-gray-600";
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => onUpdateDealType(lead.id, active ? null : t)}
                      className={`w-6 h-6 rounded-full text-[11px] font-bold cursor-pointer ${
                        active
                          ? activeClass
                          : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      }`}
                      title={t === "W" ? "Wholesale" : "Novation"}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
              <div
                className="flex gap-2 mb-2"
                onClick={(e) => e.stopPropagation()}
              >
                <label className="flex-1">
                  <span className="text-gray-500 block mb-0.5">Dispo Price</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="1000"
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
                    step="1000"
                    placeholder="0"
                    value={lead.offer_price ?? ""}
                    onChange={(e) => onUpdatePrice(lead.id, "offer_price", e.target.value)}
                    className="w-full bg-gray-900/40 border border-gray-700 focus:border-gray-500 rounded-md px-2 py-1 text-white outline-none"
                  />
                </label>
              </div>
              <p>
                <span className="text-gray-500">Email:</span>{" "}
                {lead.email ? (
                  <span
                    className={`cursor-pointer ${emailCopied ? "text-green-400" : "hover:text-white"}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(lead.email);
                      setEmailCopied(true);
                      setTimeout(() => setEmailCopied(false), 2000);
                    }}
                    title="Click to copy email"
                  >
                    {emailCopied ? "Copied!" : lead.email}
                  </span>
                ) : (
                  ""
                )}
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
    return ["ALL", "META", "SMS", "PPC", "PPL", "LUXURY"];
  });
  const [customStages, setCustomStages] = useState<CustomStage[]>([]);
  const [columnOrder, setColumnOrder] = useState<string[] | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [confetti, setConfetti] = useState<ConfettiSpec[]>([]);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const draggingRef = useRef(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  const fireConfetti = useCallback((x: number, y: number) => {
    setConfetti((prev) => [...prev, { id: Date.now() + Math.random(), x, y }]);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // While a card is being dragged, hello-pangea-dnd handles its own
      // auto-scroll. Mutating scrollLeft from here desyncs Pangea's drop-
      // target geometry and causes drops onto the wrong column.
      if (draggingRef.current) {
        if (scrollInterval.current) {
          clearInterval(scrollInterval.current);
          scrollInterval.current = null;
        }
        return;
      }
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
      for (const tab of ["META", "SMS", "PPC", "PPL", "LUXURY"]) {
        localStorage.removeItem(`crm_columns_${tab}`);
      }
      localStorage.setItem("crm_columns_version", "v2");
      return {};
    }
    const out: Record<string, string[]> = {};
    for (const tab of ["META", "SMS", "PPC", "PPL", "LUXURY"]) {
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
      for (const tab of ["META", "SMS", "PPC", "PPL", "LUXURY"]) {
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

  // One-time migration: make sure any global stage with "refund" in its name
  // is present in every per-tab list so PPL/etc. get the refund columns back
  // even if they were previously hidden from those tabs.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (columnOrder === null) return;
    if (!globalStages || globalStages.length === 0) return;
    if (localStorage.getItem("crm_refund_migration_v1") === "done") return;
    const refundStages = globalStages.filter((s) =>
      s.toLowerCase().includes("refund")
    );
    if (refundStages.length === 0) {
      localStorage.setItem("crm_refund_migration_v1", "done");
      return;
    }
    setTabStages((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const tab of ["META", "SMS", "PPC", "PPL", "LUXURY"]) {
        const list = next[tab] || [...globalStages];
        const missing = refundStages.filter((s) => !list.includes(s));
        if (missing.length > 0) {
          next[tab] = [...list, ...missing];
          localStorage.setItem(`crm_columns_${tab}`, JSON.stringify(next[tab]));
          changed = true;
        }
      }
      return changed ? next : prev;
    });
    localStorage.setItem("crm_refund_migration_v1", "done");
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

  const handleUpdateDealType = async (id: number, dealType: "W" | "N" | null) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, deal_type: dealType } : l))
    );
    pendingEditsRef.current[id] = {
      ...(pendingEditsRef.current[id] || {}),
      deal_type: dealType,
    };
    try {
      await fetch(`${API_URL}/api/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deal_type: dealType }),
      });
    } catch (err) {
      console.error("Error updating deal_type:", err);
    } finally {
      if (pendingEditsRef.current[id]) {
        delete pendingEditsRef.current[id].deal_type;
        if (Object.keys(pendingEditsRef.current[id]).length === 0) {
          delete pendingEditsRef.current[id];
        }
      }
    }
  };

  const priceTimerRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const handleUpdatePrice = (
    id: number,
    field: "dispo_price" | "offer_price" | "value",
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
    LUXURY: ["luxury"],
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

  const handleUpdateStage = async (id: number, newStage: string) => {
    const lead = leads.find((l) => l.id === id);
    if (!lead || lead.stage === newStage) return;
    if (isClosedStage(newStage) && !isClosedStage(lead.stage)) {
      fireConfetti(lastMouseRef.current.x, lastMouseRef.current.y);
    }
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, stage: newStage } : l))
    );
    try {
      await fetch(`${API_URL}/api/leads/${id}/stage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStage }),
      });
    } catch (err) {
      console.error("Error updating stage:", err);
      fetchLeads();
    }
  };

  const onDragStart = () => {
    draggingRef.current = true;
    if (scrollInterval.current) {
      clearInterval(scrollInterval.current);
      scrollInterval.current = null;
    }
  };

  const onDragUpdate = (update: DragUpdate) => {
    if (update.type === "CARD") {
      setDragOverStage(update.destination?.droppableId ?? null);
    }
  };

  const onDragEnd = async (result: DropResult) => {
    draggingRef.current = false;
    setDragOverStage(null);
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
    const movedLead = leads.find((l) => l.id === leadId);
    if (movedLead && movedLead.stage !== newStage && isClosedStage(newStage)) {
      fireConfetti(lastMouseRef.current.x, lastMouseRef.current.y);
    }

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
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-gray-950 to-slate-900 flex items-center justify-center px-4 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-40">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-indigo-600/20 blur-3xl" />
          <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-violet-600/20 blur-3xl" />
        </div>
        <form
          onSubmit={handleLogin}
          className="relative bg-slate-900/70 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-2xl w-full max-w-sm ring-1 ring-white/5"
        >
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="inline-block w-2 h-2 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 shadow-[0_0_12px_rgba(139,92,246,0.7)]" />
            <h2 className="text-white text-xl font-bold tracking-tight">crmEscrow</h2>
          </div>
          <p className="text-gray-500 text-xs text-center mb-6">Enter your password to continue</p>
          <input
            type="password"
            placeholder="Password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            className="w-full p-3 rounded-xl bg-white/5 text-white border border-white/10 mb-3 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 transition placeholder-gray-600"
          />
          <button
            type="submit"
            className="w-full p-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold cursor-pointer shadow-lg shadow-indigo-900/40 transition-all"
          >
            Login
          </button>
        </form>
      </div>
    );
  }

  const refundedCount = filteredLeads.filter((l) => {
    const s = (l.stage || "").toLowerCase();
    return s.includes("refund") && !s.includes("request");
  }).length;
  const naAdjustedExcluded = filteredLeads.filter((l) => {
    const s = (l.stage || "").toLowerCase();
    return s.includes("no answer") || s.includes("refund");
  }).length;
  const adjustedCount = filteredLeads.length - refundedCount;
  const naAdjustedCount = filteredLeads.length - naAdjustedExcluded;
  const wCount = filteredLeads.filter((l) => l.deal_type === "W").length;
  const nCount = filteredLeads.filter((l) => l.deal_type === "N").length;
  const pipelineValue = filteredLeads.reduce((sum, l) => sum + leadValue(l), 0);
  const dayCount = filteredLeads.filter((l) => {
    const created = new Date(l.created_at);
    const selected = new Date(selectedDate + "T00:00:00");
    return created.toDateString() === selected.toDateString();
  }).length;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-950 via-gray-950 to-slate-900 text-gray-100">
      {/* Top Bar */}
      <div className="sticky top-0 z-30 backdrop-blur-xl bg-slate-950/70 border-b border-white/5 supports-[backdrop-filter]:bg-slate-950/60">
        <div className="px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          {/* Left cluster: hamburger + brand + active filter */}
          <div className="flex items-center gap-3" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className={`relative h-9 w-9 inline-flex items-center justify-center rounded-lg border transition-all cursor-pointer ${
                menuOpen
                  ? "bg-white/10 border-white/20 text-white"
                  : "bg-white/5 border-white/10 text-gray-300 hover:text-white hover:bg-white/10"
              }`}
              title="Sources"
              aria-label="Toggle source menu"
              aria-expanded={menuOpen}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {menuOpen ? (
                  <>
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </>
                ) : (
                  <>
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </>
                )}
              </svg>
            </button>
            <h1 className="select-none" title="crmEscrow" style={{ fontFamily: "var(--font-display), system-ui, sans-serif" }}>
              <span className="text-[19px] leading-none font-bold tracking-[-0.04em]">
                <span className="text-white">crm</span>
                <span className="bg-gradient-to-r from-indigo-300 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent">Escrow</span>
              </span>
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-gray-300 px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
              {sourceFilter}
            </span>

            {/* Hamburger dropdown panel */}
            {menuOpen && (
              <div className="absolute left-4 top-14 z-40 w-64 rounded-2xl border border-white/10 bg-slate-900/95 backdrop-blur-xl shadow-2xl shadow-black/50 ring-1 ring-white/5">
                <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Sources</span>
                  <span className="text-[10px] text-gray-500">drag to reorder</span>
                </div>
                <div className="p-2">
                  <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="chips" type="CHIP">
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className="flex flex-col gap-1"
                        >
                          {chipOrder.map((value, index) => (
                            <Draggable key={value} draggableId={`chip-${value}`} index={index}>
                              {(dragProvided, dragSnapshot) => {
                                const active = sourceFilter === value;
                                return (
                                  <div
                                    ref={dragProvided.innerRef}
                                    {...dragProvided.draggableProps}
                                    {...dragProvided.dragHandleProps}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => {
                                      if (!dragSnapshot.isDragging) {
                                        setSourceFilter(value);
                                        setMenuOpen(false);
                                      }
                                    }}
                                    className={`group flex items-center justify-between px-3 py-2 rounded-xl text-sm font-semibold cursor-grab active:cursor-grabbing select-none transition-all ${
                                      active
                                        ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-900/40"
                                        : "text-gray-300 hover:text-white hover:bg-white/5"
                                    } ${dragSnapshot.isDragging ? "opacity-90 ring-1 ring-white/20 shadow-2xl" : ""}`}
                                  >
                                    <span className="flex items-center gap-2">
                                      <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-white" : "bg-gray-500 group-hover:bg-gray-300"}`} />
                                      {value}
                                    </span>
                                    <svg
                                      width="12"
                                      height="12"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      className={`opacity-0 ${active ? "opacity-100" : "group-hover:opacity-50"} transition-opacity`}
                                    >
                                      <circle cx="9" cy="6" r="1" />
                                      <circle cx="15" cy="6" r="1" />
                                      <circle cx="9" cy="12" r="1" />
                                      <circle cx="15" cy="12" r="1" />
                                      <circle cx="9" cy="18" r="1" />
                                      <circle cx="15" cy="18" r="1" />
                                    </svg>
                                  </div>
                                );
                              }}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                </div>
              </div>
            )}
          </div>

          {/* Right cluster: stats + actions */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-gray-300" title="Total leads">
                <span className="font-semibold text-white"><AnimatedNumber value={filteredLeads.length} /></span>
                <span className="text-gray-500 ml-1">total</span>
              </span>
              <span
                className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-gray-300"
                title="Total minus refunded (excludes refund requested)"
              >
                <span className="font-semibold text-white"><AnimatedNumber value={adjustedCount} /></span>
                <span className="text-gray-500 ml-1">adjusted</span>
              </span>
              <span
                className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-gray-300"
                title="Total minus no answer + refund requested + refunded"
              >
                <span className="font-semibold text-white"><AnimatedNumber value={naAdjustedCount} /></span>
                <span className="text-gray-500 ml-1">NA adj</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-1 rounded-full bg-white text-black text-xs font-bold tabular-nums" title="Wholesale">
                W:<AnimatedNumber value={wCount} />
              </span>
              <span className="px-2 py-1 rounded-full bg-black text-white text-xs font-bold tabular-nums" title="Novation">
                N:<AnimatedNumber value={nCount} />
              </span>
            </div>
            {pipelineValue > 0 && (
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                <AnimatedNumber value={pipelineValue} format={formatMoney} />
              </span>
            )}
            <span className="hidden sm:block w-px h-6 bg-white/10" />
            <button
              onClick={() => setTemplatesOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-gray-200 text-xs font-semibold cursor-pointer transition-colors"
              title="Open message templates"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="9" y1="13" x2="15" y2="13" />
                <line x1="9" y1="17" x2="13" y2="17" />
              </svg>
              Templates
            </button>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-white/5 border border-white/10 hover:border-white/20 text-gray-200 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-indigo-400 transition-colors [color-scheme:dark]"
              />
              <span className="px-2 py-1 rounded-full bg-white/5 border border-white/10 text-gray-300 text-xs">
                <span className="font-semibold text-white"><AnimatedNumber value={dayCount} /></span>
                <span className="text-gray-500 ml-1">today</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div ref={scrollRef} className="flex-1 overflow-x-auto p-5 board-scroll">
        <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd} onDragUpdate={onDragUpdate}>
          <Droppable droppableId="board" type="COLUMN" direction="horizontal">
            {(boardProvided) => (
              <div
                ref={boardProvided.innerRef}
                {...boardProvided.droppableProps}
                className="flex gap-4 min-w-max"
              >
                {allStages.map((stage, colIndex) => {
                  const stageLeads = getLeadsByStage(stage);
                  const colValue = stageLeads.reduce((sum, l) => sum + leadValue(l), 0);
                  const accent = stageAccent(stage);
                  const accentStyle = accent ? STAGE_ACCENT_STYLES[accent] : null;
                  return (
                    <Draggable key={stage} draggableId={`col-${stage}`} index={colIndex}>
                      {(colProvided, colSnapshot) => (
                        <div
                          ref={colProvided.innerRef}
                          {...colProvided.draggableProps}
                          className={`group/col w-72 rounded-2xl flex flex-col max-h-[calc(100vh-140px)] border [transition:background-color_150ms,border-color_150ms,box-shadow_150ms] ${
                            colSnapshot.isDragging
                              ? "bg-slate-900 border-white/20 shadow-2xl shadow-black/50"
                              : dragOverStage === stage
                              ? "bg-slate-900/90 border-indigo-400/40 pulse-ring"
                              : `bg-slate-900/80 border-white/5 shadow-lg shadow-black/20${accent ? " " + STAGE_ACCENT_STYLES[accent].shadow : ""}`
                          }`}
                        >
                          <div
                            {...colProvided.dragHandleProps}
                            className={`relative px-4 py-3 border-b border-white/5 flex justify-between items-center cursor-grab rounded-t-2xl ${
                              accentStyle ? accentStyle.header : "bg-gradient-to-b from-white/[0.04] to-transparent"
                            }`}
                          >
                            {accentStyle && (
                              <span className={`pointer-events-none absolute left-0 right-0 -bottom-px h-px ${accentStyle.rule}`} />
                            )}
                            <h3
                              className="text-white text-sm font-semibold tracking-tight cursor-pointer truncate flex items-center gap-2"
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                renameColumn(stage);
                              }}
                              title="Double-click to rename"
                            >
                              {accentStyle && (
                                <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${accentStyle.dot}`} />
                              )}
                              <span className="truncate">{stage}</span>
                            </h3>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {colValue > 0 && (
                                <span className="text-emerald-300 text-[11px] font-semibold tabular-nums">
                                  {formatMoney(colValue)}
                                </span>
                              )}
                              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full min-w-[22px] text-center tabular-nums ${
                                accentStyle ? accentStyle.count : "bg-white/10 text-gray-200"
                              }`}>
                                <AnimatedNumber value={stageLeads.length} />
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
                                  for (const t of Object.keys(tabStages)) {
                                    saveTabStages(t, tabStages[t].filter((s) => s !== stage));
                                  }
                                }}
                                className="text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-md w-5 h-5 inline-flex items-center justify-center cursor-pointer text-xs opacity-0 group-hover/col:opacity-100 transition-opacity"
                                title="Delete column"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                          <Droppable droppableId={stage} type="CARD">
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                className={`flex-1 overflow-y-auto p-2 min-h-[100px] transition-colors rounded-b-2xl ${
                                  snapshot.isDraggingOver ? "bg-indigo-500/5" : ""
                                }`}
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
                                    onUpdateDealType={handleUpdateDealType}
                                    onUpdateStage={handleUpdateStage}
                                    stages={allStages}
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
                  className="w-72 min-h-[100px] rounded-2xl flex flex-col items-center justify-center gap-1 cursor-pointer text-gray-500 hover:text-gray-200 bg-white/[0.02] hover:bg-white/[0.05] border-2 border-dashed border-white/10 hover:border-white/30 transition-all flex-shrink-0"
                >
                  <span className="text-2xl leading-none">+</span>
                  <span className="text-[11px] font-semibold uppercase tracking-wider">Add column</span>
                </button>
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      {/* Footer */}
      <div className="border-t border-white/5 bg-slate-950/40 backdrop-blur-sm px-6 py-2 text-center">
        <p className="text-gray-600 text-[11px] tracking-wide">&copy; 2025 Ry Commerce LLC</p>
      </div>

      <TemplatesDrawer open={templatesOpen} onClose={() => setTemplatesOpen(false)} />

      {confetti.map((c) => (
        <ConfettiBurst
          key={c.id}
          x={c.x}
          y={c.y}
          onDone={() => setConfetti((prev) => prev.filter((p) => p.id !== c.id))}
        />
      ))}
    </div>
  );
}
