#!/usr/bin/env python3
"""
Speed-to-Lead auto-texter + keyword auto-responder (macOS Messages, real number).

Sequence per NEW speedtolead lead in the PPL tab:
  1. wait 15s after the lead is added, then send TEXT1 (reach-out)
  2. wait 5s, then send TEXT2 ("Is <address> the correct address?")   <- the "double text"
  3. watch for the lead's FIRST reply (directly after the double text):
       - if it's an affirmative ("yes/yep/interested/correct/..."): send TEXT3
         AND move the card Asking Price / Not Answering -> Gathering Info ✍️
       - any other first reply (or an opt-out word): do nothing, hand to a human
  4. after TEXT3, if the lead's reply contains a price ($ amount / 150k / 150,000),
     auto-write it to the lead's notes "Asking:" line.
The responder fires ONLY on that first reply, once, and never on opt-out/negative words.

macOS 26 removed silent AppleScript sending, so sends drive the UI: open the pre-filled
sms: link then press Return. Needs Accessibility (send) + Full Disk Access (read replies).

SAFE: DRY-RUN unless STL_LIVE=1. First run baselines existing speedtolead leads as done
so it never blasts the backlog. A lead may only ENTER the sequence if its CRM row is less
than MAX_LEAD_AGE (3 min) old when we first see it, so a pre-existing lead that a human is
already texting can never get the initial reach-out.
  Dry:   python3 ~/stl_autotext.py       Live: STL_LIVE=1 python3 ~/stl_autotext.py
  Test:  python3 ~/stl_autotext.py --test "+16028481208"
"""
import json, os, re, struct, subprocess, sqlite3, sys, time, urllib.parse, urllib.request
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

API_BASE     = "https://backend-production-da82.up.railway.app"
LEADS_URL    = f"{API_BASE}/api/leads"
SOURCE       = "speedtolead"
DELAY_FIRST  = 15          # seconds after lead added -> TEXT1
DELAY_SECOND = 5           # seconds after TEXT1 -> TEXT2
POLL_SECONDS = 10
MAX_LEAD_AGE = 180         # a lead may only ENTER the sequence if its CRM row is <3 min old
REPLY_TIMEOUT_H = 48       # stop watching a lead for a reply after this long
MOVE_TO      = "Gathering Info ✍️"
MOVE_FROM    = {"Asking Price", "Not Answering 😑"}
WINDOW_START = 9           # only send the reach-out double text between these hours...
WINDOW_END   = 17          # ...in the LEAD's local time (9am–5pm)
DEFAULT_TZ   = "America/New_York"   # fallback when state/area code is unknown
CHAT_DB      = os.path.expanduser("~/Library/Messages/chat.db")
STATE_FILE   = os.path.expanduser("~/.stl_autotext_state.json")
LOG_FILE     = os.path.expanduser("~/stl_autotext.log")
LIVE         = os.environ.get("STL_LIVE") == "1"

TEXT1 = ("Hello {first_name}, your information just came through our system saying you are "
         "looking to sell your property, {property_address}. \U0001f642\n\n-Rylan Patterson")
TEXT2 = "Is {property_address} the correct address?"
TEXT3 = "Ok great, how much are you looking to get for it?"

AFFIRM_WORDS = {"yes","yea","yeah","yeh","yep","yup","ya","yah","ye","yee","sure","ok","okay",
                "k","kk","alright","aight","mhm","mmhm","uhhuh","indeed","correct","interested",
                "definitely","absolutely","exactly","yessir","fasho","facts","please"}
AFFIRM_PHRASES = ["yes sir","yes please","yes i am","yes i do","sure thing","sure am","uh huh",
                  "for sure","of course","i am","i would","id like","go ahead","tell me more",
                  "how much","whats the offer","what can you offer","thats correct",
                  "that is correct","thats right","yep thats me","thats the one","you got it",
                  "thats it","that is right"]
GUARD_WORDS = {"no","stop","unsubscribe","remove","sold","dnc","wrong","scam","spam"}
GUARD_PHRASES = ["not interested","wrong number","who is this","whos this","who dis","who are you",
                 "who r u","take me off","already sold","not selling","no thanks","leave me alone",
                 "do not","dont contact","remove me","stop texting","not looking","new number"]
EMOJI_AFFIRM = ["\U0001f44d","\U0001f44c","✅","\U0001f64c"]  # 👍 👌 ✅ 🙌


def log(msg):
    line = f"{datetime.now():%Y-%m-%d %H:%M:%S} {msg}"
    print(line, flush=True)
    try:
        with open(LOG_FILE, "a") as f: f.write(line + "\n")
    except Exception: pass


def norm_phone(raw):
    d = re.sub(r"\D", "", raw or "")
    if len(d) == 10: return "+1" + d
    if len(d) == 11 and d.startswith("1"): return "+" + d
    if raw and raw.strip().startswith("+"): return raw.strip()
    return None


# ── Lead local-time (for the 9–5 send window) ──────────────────────────────
STATE_TZ = {}
for _tz, _states in {
    "America/New_York": "CT DC DE FL GA IN KY MA MD ME MI NC NH NJ NY OH PA RI SC VA VT WV",
    "America/Chicago":  "AL AR IA IL KS LA MN MO MS ND NE OK SD TN TX WI",
    "America/Denver":   "CO ID MT NM UT WY",
    "America/Phoenix":  "AZ",
    "America/Los_Angeles": "CA NV OR WA",
    "America/Anchorage": "AK",
    "Pacific/Honolulu":  "HI",
}.items():
    for _s in _states.split(): STATE_TZ[_s] = _tz

AREACODE_TZ = {}
for _tz, _codes in {
    "America/New_York": "202 203 207 212 215 216 219x 220 223 234 239 240 252 260 267 272 276 283 301 302 304 305 315 317 321 326 330 332 336 339 347 351 352 363 380 386 401 404 407 410 412 413 419 434 440 443 445 463 470 475 478 484 508 513 516 518 540 551 561 567 570 571 574 582 585 586 603 606 607 610 614 616 617 626 631 640 646 656 667 678 680 681 689 703 704 706 716 717 718 724 727 732 734 740 743 754 757 762 765 770 772 774 781 786 802 803 804 810 813 814 826 828 835 838 839 843 845 847y 848 854 857 859 862 863 864 878 904 906 908 910 912 914 917 919 929 930 934 937 938y 941 943 947 948 954 959 973 978 980 984 989",
    "America/Chicago":  "205 210 214 217 218 224 225 228 251 254 256 262 270 281 308 309 312 314 316 318 319 320 327 331 334 337 346 361 364 402 405 409 414 417 430 447 464 469 479 501 502x 504 507 512 515 531 534 539 557 563 572 573 580 601 605 608 612 615 618 620 629 630 636 641 651 659 660 662 682 701 708 712 713 715 726 730 731 737 763 769 773 779 785 806 815 816 817 830 847 850 870 872 901 903 913 918 920 931 936 940 945 952 956 972 979 985",
    "America/Denver":   "303 307 385 406 435 505 575 719 720 915 970 983 986",
    "America/Phoenix":  "480 520 602 623 928",
    "America/Los_Angeles": "206 209 213 253 279 310 323 341 350 360 408 415 424 425 442 458 503 509 510 530 541 559 562 564 619 626 628 650 657 661 669 702 707 714 725 747 760 775 805 818 820 831 840 858 909 916 925 949 951 971",
    "America/Anchorage": "907",
    "Pacific/Honolulu":  "808",
}.items():
    for _c in _codes.split(): AREACODE_TZ[_c.rstrip("xy")] = _tz  # x/y = trimmed dup markers, ignore


def lead_tz(lead):
    # 1) state from the property address (most reliable — it's the property location)
    addr = (lead.get("property_address") or "").upper()
    m = re.search(r",\s*([A-Z]{2})\b", addr) or re.search(r"\b([A-Z]{2})\s+\d{5}", addr)
    if m and m.group(1) in STATE_TZ:
        return STATE_TZ[m.group(1)]
    # 2) phone area code
    p = norm_phone(lead.get("phone"))
    if p and len(p) >= 5:
        return AREACODE_TZ.get(p[2:5], DEFAULT_TZ)
    return DEFAULT_TZ


def in_send_window(tzname):
    try:
        h = datetime.now(ZoneInfo(tzname)).hour
    except Exception:
        h = datetime.now().hour
    return WINDOW_START <= h < WINDOW_END


def normalize(text):
    t = re.sub(r"[^a-z0-9\s]", " ", (text or "").lower())
    return re.sub(r"\s+", " ", t).strip()


def is_affirmative(raw):
    t = normalize(raw)
    words = set(t.split())
    if words & GUARD_WORDS: return False
    if any(p in t for p in GUARD_PHRASES): return False
    if any(e in (raw or "") for e in EMOJI_AFFIRM): return True
    if re.fullmatch(r"y+e+a*h*s*", t.replace(" ", "")): return True   # yes / yeah / yesss / yea
    if words & AFFIRM_WORDS: return True
    if any(p in t for p in AFFIRM_PHRASES): return True
    return False


def send_sms(phone, body):
    subprocess.run(["open", f"sms:{phone}&body={urllib.parse.quote(body)}"], check=True)
    time.sleep(2.5)
    r = subprocess.run(["osascript", "-e",
        'tell application "Messages" to activate\ndelay 0.4\n'
        'tell application "System Events" to keystroke return\n'], capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(r.stderr.strip() or "osascript failed")


def _decode(text, ab):
    if text: return text
    if ab:
        try:
            i = ab.index(b"NSString") + len(b"NSString") + 5
            ln = ab[i]
            if ln == 0x81: ln = struct.unpack("<H", ab[i+1:i+3])[0]; i += 3
            else: i += 1
            return ab[i:i+ln].decode("utf-8", "replace")
        except Exception:
            return ""
    return ""


def replies_after(phone, since_epoch, limit=30):
    """Decoded inbound texts from `phone` strictly after since_epoch (unix), oldest first."""
    last10 = re.sub(r"\D", "", phone)[-10:]
    apple_since = int((since_epoch - 978307200) * 1_000_000_000)
    con = sqlite3.connect(f"file:{CHAT_DB}?mode=ro", uri=True)
    try:
        rows = con.execute(
            "SELECT m.text, m.attributedBody FROM message m JOIN handle h ON m.handle_id=h.ROWID "
            "WHERE m.is_from_me=0 AND h.id LIKE ? AND m.date > ? ORDER BY m.date ASC LIMIT ?",
            ("%" + last10, apple_since, limit)).fetchall()
    finally:
        con.close()
    return [_decode(t, ab) for (t, ab) in rows]


_PRICE_RES = [
    re.compile(r"\$\s?\d[\d,]*(?:\.\d+)?\s?(?:k|K|m|M|mil|million)?"),   # $150,000 / $150k / $1.2m
    re.compile(r"\b\d[\d,]*\.?\d*\s?(?:k|K|m|M|mil|million|grand)\b"),   # 150k / 1.2 million
    re.compile(r"\b\d{1,3}(?:,\d{3})+\b"),                              # 150,000
    re.compile(r"\b\d{4,6}\b"),                                        # 150000 (bare; capped to avoid phone #s)
]
def extract_price(text):
    for rx in _PRICE_RES:
        m = rx.search(text or "")
        if m: return m.group(0).strip()
    return None


def set_asking(lead_id, current_notes, amount):
    notes = current_notes or "Asking: \nOffered: \nDispo: \nNotes: "
    if re.search(r"(?im)^Asking:.*$", notes):
        notes = re.sub(r"(?im)^Asking:.*$", f"Asking: {amount}", notes, count=1)
    else:
        notes = f"Asking: {amount}\n" + notes
    req = urllib.request.Request(f"{API_BASE}/api/leads/{lead_id}", method="PATCH",
        data=json.dumps({"notes": notes}).encode(), headers={"Content-Type": "application/json"})
    urllib.request.urlopen(req, timeout=20).read()


def parse_created(s):
    try:
        return datetime.fromisoformat((s or "").replace("Z", "+00:00")).timestamp()
    except Exception:
        return time.time()


def move_stage(lead_id, stage):
    req = urllib.request.Request(f"{API_BASE}/api/leads/{lead_id}/stage", method="PATCH",
        data=json.dumps({"stage": stage}).encode(), headers={"Content-Type": "application/json"})
    urllib.request.urlopen(req, timeout=20).read()


def fetch_leads():
    req = urllib.request.Request(LEADS_URL, headers={"User-Agent": "stl-autotext"})
    with urllib.request.urlopen(req, timeout=30) as r:
        data = json.loads(r.read().decode(), strict=False)
    return data if isinstance(data, list) else data.get("leads", data)


_last_enabled = True
def autotext_enabled():
    """Read the on/off flag set by the CRM PPL toggle. Fail-safe to last known value."""
    global _last_enabled
    try:
        req = urllib.request.Request(f"{API_BASE}/api/settings/autotext", headers={"User-Agent": "stl"})
        with urllib.request.urlopen(req, timeout=15) as r:
            _last_enabled = json.loads(r.read().decode()).get("enabled", True) is not False
    except Exception:
        pass
    return _last_enabled


def load_state():
    try:
        with open(STATE_FILE) as f:
            s = json.load(f)
            if "leads" in s: return {int(k): v for k, v in s["leads"].items()}
    except Exception: pass
    return None


def save_state(leads):
    with open(STATE_FILE + ".tmp", "w") as f:
        json.dump({"leads": {str(k): v for k, v in leads.items()}}, f)
    os.replace(STATE_FILE + ".tmp", STATE_FILE)


def do_double_text(lead, dry):
    t1 = TEXT1.format(first_name=lead.get("first_name",""), property_address=lead.get("property_address",""))
    t2 = TEXT2.format(property_address=lead.get("property_address",""))
    phone = norm_phone(lead.get("phone"))
    if dry:
        log(f"[DRY] double-text -> {phone}: T1={t1[:40]!r} … T2={t2!r}")
        return
    send_sms(phone, t1)
    time.sleep(DELAY_SECOND)
    send_sms(phone, t2)


def main():
    if len(sys.argv) >= 3 and sys.argv[1] == "--test":
        send_sms(sys.argv[2], "Test from the auto-texter. If you got this, it works. \U0001f642")
        log(f"TEST send fired to {sys.argv[2]}")
        return

    log(f"START mode={'LIVE' if LIVE else 'DRY-RUN'} source={SOURCE}")
    state = load_state()
    if state is None:
        try: leads = fetch_leads()
        except Exception as e: log(f"baseline fetch failed: {e}"); leads = []
        state = {l["id"]: {"status": "done", "phone": norm_phone(l.get("phone")),
                           "created": parse_created(l.get("created_at")), "double_sent": None}
                 for l in leads if (l.get("source") or "") == SOURCE}
        save_state(state)
        log(f"BASELINED {len(state)} existing '{SOURCE}' leads as done")

    while True:
        try:
            enabled = autotext_enabled()
            leads = fetch_leads()
            by_id = {l["id"]: l for l in leads}
            # register new eligible leads (marked done/skipped if the toggle is OFF, or if the
            # lead is already older than MAX_LEAD_AGE — an existing lead that only just showed
            # up to us is one a human may already be texting, so it never enters the sequence)
            for l in leads:
                if (l.get("source") or "") == SOURCE and l["id"] not in state:
                    created = parse_created(l.get("created_at"))
                    age = time.time() - created
                    stale = age > MAX_LEAD_AGE
                    state[l["id"]] = {"status": "pending" if (enabled and not stale) else "done",
                                      "phone": norm_phone(l.get("phone")),
                                      "created": created, "double_sent": None}
                    reason = ("" if enabled else "  [SKIPPED — auto-text OFF]") or ""
                    if stale:
                        reason = f"  [SKIPPED — {int(age//60)}m{int(age%60)}s old, >{MAX_LEAD_AGE//60}m limit]"
                    log(f"NEW lead #{l['id']} {l.get('first_name','')} {norm_phone(l.get('phone'))}" + reason)
                    save_state(state)
            if not enabled:
                time.sleep(POLL_SECONDS); continue   # toggle OFF: hold everything, no sends
            now = time.time()
            for lid, s in list(state.items()):
                if s["status"] == "done":
                    continue
                lead = by_id.get(lid)
                if not lead or not s.get("phone"):
                    s["status"] = "done"; save_state(state); continue

                if s["status"] == "pending":
                    tz = lead_tz(lead)
                    if not in_send_window(tz):
                        if not s.get("deferred_logged"):
                            log(f"#{lid} outside 9–5 ({tz}) — holding reach-out until window opens")
                            s["deferred_logged"] = True; save_state(state)
                        continue
                    wait = s["created"] + DELAY_FIRST - now
                    if wait > 0:
                        if wait <= POLL_SECONDS + 2: time.sleep(wait)
                        else: continue
                    try:
                        do_double_text(lead, dry=not LIVE)
                        s["double_sent"] = time.time(); s["status"] = "awaiting_reply"
                        log(f"DOUBLE-TEXT sent #{lid}")
                    except Exception as e:
                        log(f"double-text FAILED #{lid}: {e} (will retry)")
                    save_state(state)

                elif s["status"] == "awaiting_reply":
                    if now > s["double_sent"] + REPLY_TIMEOUT_H * 3600:
                        s["status"] = "done"; save_state(state); log(f"no reply, closing #{lid}"); continue
                    try:
                        reps = replies_after(s["phone"], s["double_sent"])
                    except Exception as e:
                        log(f"reply-read error #{lid}: {e}"); reps = []
                    if not reps:
                        continue
                    reply = reps[0]  # ONLY the first reply directly after the double text
                    if is_affirmative(reply):
                        if not LIVE:
                            log(f"[DRY] affirmative on #{lid} -> would send T3 + move to '{MOVE_TO}'")
                            s["t3_sent"] = time.time(); s["status"] = "awaiting_price"
                        else:
                            try:
                                send_sms(s["phone"], TEXT3)
                                if (lead.get("stage") or "") in MOVE_FROM:
                                    move_stage(lid, MOVE_TO)
                                log(f"RESPONDED #{lid}: affirmative -> T3 sent + moved to Gathering Info")
                                s["t3_sent"] = time.time(); s["status"] = "awaiting_price"
                            except Exception as e:
                                log(f"respond FAILED #{lid}: {e} (will retry)")
                                continue
                    else:
                        log(f"#{lid} first reply not affirmative -> handing to human")
                        s["status"] = "done"
                    save_state(state)

                elif s["status"] == "awaiting_price":
                    if now > s["t3_sent"] + REPLY_TIMEOUT_H * 3600:
                        s["status"] = "done"; save_state(state); continue
                    try:
                        reps = replies_after(s["phone"], s["t3_sent"])
                    except Exception as e:
                        log(f"price-read error #{lid}: {e}"); reps = []
                    price = next((p for p in (extract_price(r) for r in reps) if p), None)
                    if price:
                        if not LIVE:
                            log(f"[DRY] price on #{lid}: {price!r} -> would write to notes Asking:")
                        else:
                            try:
                                set_asking(lid, lead.get("notes"), price)
                                log(f"PRICE #{lid}: {price!r} -> notes Asking:")
                            except Exception as e:
                                log(f"notes update FAILED #{lid}: {e} (will retry)")
                                continue
                        s["status"] = "done"
                        save_state(state)
        except Exception as e:
            log(f"loop error: {e}")
        time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    main()
