// The cash-offer form posts here. One submit goes two places (Rylan 10/31, "both for now"):
//   1. the old CRM (Railway backend, /api/leads) — the board at /crm, plus the Slack ping
//   2. JV Tek's Meta board (spencers-list.vercel.app/api/meta-inbound), with a key that only
//      lives on the two servers (JVTEK_META_KEY here = META_LEAD_KEY there)
// "Listed with an agent? Yes" is the disqualifier: the old CRM gets it as Dead with a DQ note,
// JV Tek puts it in Disqualified.

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const JVTEK_URL = process.env.JVTEK_META_URL || "";
const JVTEK_KEY = process.env.JVTEK_META_KEY || "";

const FIELDS = [
  "wants_to_sell", "listed_with_agent", "timeline", "repairs", "sell_reason",
  "property_address", "first_name", "last_name", "email", "phone",
  "utm_source", "utm_campaign", "sub_id_1", "sub_id_2", "sub_id_3", "sub_id_4", "sub_id_5",
] as const;

// Facebook ids + the page: JV Tek only (the old CRM's table has no place for them)
const FB_FIELDS = ["fbc", "fbp", "url"] as const;

const DQ_NOTES = "Asking: \nOffered: \nDispo: \nNotes: DQ — listed with an agent (Meta form)";

async function post(url: string, body: object, headers: Record<string, string> = {}) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
  return { ok: r.ok, status: r.status, text: await r.text().catch(() => "") };
}

export async function POST(req: Request) {
  const raw = await req.json().catch(() => null);
  if (!raw || typeof raw !== "object") return Response.json({ error: "bad body" }, { status: 400 });
  // only the form's own fields — a page can't set the stage or notes
  const lead: Record<string, string> = {};
  for (const k of FIELDS) {
    const v = (raw as Record<string, unknown>)[k];
    if (typeof v === "string" && v.trim()) lead[k] = v.trim().slice(0, 500);
  }
  if (!lead.phone && !lead.property_address) return Response.json({ error: "empty lead" }, { status: 400 });
  const fb: Record<string, string> = {};
  for (const k of FB_FIELDS) {
    const v = (raw as Record<string, unknown>)[k];
    if (typeof v === "string" && v.trim()) fb[k] = v.trim().slice(0, 500);
  }
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim();
  const ua = req.headers.get("user-agent") || "";
  if (ip) fb.ip = ip.slice(0, 100);
  if (ua) fb.ua = ua.slice(0, 500);
  const dq = /^y/i.test(lead.listed_with_agent || "");

  let crmId: number | null = null;
  let crmOk = false;
  try {
    const crm = await post(`${API_URL}/api/leads`, dq ? { ...lead, stage: "Dead 🗑️", notes: DQ_NOTES } : lead);
    crmOk = crm.ok;
    // the CRM's reply can carry raw newlines in notes, so don't JSON.parse it — just the id
    const m = crm.text.match(/"id"\s*:\s*(\d+)/);
    if (m) crmId = Number(m[1]);
    if (!crm.ok) console.error("old CRM refused the lead", crm.status, crm.text.slice(0, 200));
  } catch (e) {
    console.error("old CRM unreachable", e);
  }

  let jvOk = false;
  if (JVTEK_URL && JVTEK_KEY) {
    try {
      const jv = await post(JVTEK_URL, { ...lead, ...fb, crm_id: crmId }, { "x-meta-key": JVTEK_KEY });
      jvOk = jv.ok;
      if (!jv.ok) console.error("JV Tek refused the lead", jv.status, jv.text.slice(0, 200));
    } catch (e) {
      console.error("JV Tek unreachable", e);
    }
  } else {
    console.error("JVTEK_META_URL / JVTEK_META_KEY not set — lead not sent to JV Tek");
  }

  if (!crmOk && !jvOk) return Response.json({ error: "could not save" }, { status: 502 });
  return Response.json({ ok: true, dq, crm: crmOk, jvtek: jvOk });
}
