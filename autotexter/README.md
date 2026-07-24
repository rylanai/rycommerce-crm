# Speed-to-Lead auto-texter

Local macOS automation that texts new Speed-to-Lead leads from **Rylan's real number**
via the Messages app. It is NOT part of the web app and is NOT deployed — it runs on one
Mac only. **It currently runs on the MacBook Air (`camrynoliver`)** and is **OFF (paused)**.

These files are committed here only so both machines share the source/context. The live
copies on the Air are `~/stl_autotext.py`, `~/stl`, and
`~/Library/LaunchAgents/com.rylan.stlautotext.plist`.

## What it does (per new `speedtolead` lead in the PPL tab)
0. **3-minute freshness gate** (`MAX_LEAD_AGE`): a lead only enters the sequence if its CRM
   row is <3 min old the first time the script sees it. Anything older is logged and marked
   done, so a lead a human is already texting can never get the initial reach-out. The gate
   is applied at **registration**, not at send time — an after-hours lead still gets held
   until the 9–5 window opens and then texted.
1. Only **9am–5pm in the lead's local time** (from address state / phone area code).
2. +15s after the lead is added → send Text 1 (reach-out).
3. +5s → send Text 2 ("Is {address} the correct address?"). (steps 2–3 = the "double text")
4. Watch the lead's FIRST reply: if it's a yes-type ("yes/yep/interested/correct/how much/👍",
   never an opt-out word) → send Text 3 ("Ok great, how much are you looking to get for it?")
   and move the card `Asking Price`/`Not Answering 😑` → `Gathering Info ✍️`.
5. After Text 3, if their reply has a price ($150k / 150,000 / …) → write it to the lead's
   notes `Asking:` line.

Sends drive the Messages UI (macOS 26 removed silent AppleScript send): open the pre-filled
`sms:` link, then press Return. Replies are read from `~/Library/Messages/chat.db`.

## Files
- `stl_autotext.py` — the watcher/state machine (polls the CRM API every 10s).
- `stl` — control script → `stl on|off|pause|start|status`.
- `com.rylan.stlautotext.plist` — LaunchAgent (RunAtLoad + KeepAlive, `STL_LIVE=1`).

## On/off
- `~/stl on` / `~/stl off` — flip the flag (backend `/api/settings/autotext`; the CRM's
  PPL "Auto-text" toggle button flips the same flag). Process keeps running.
- `~/stl pause` / `~/stl start` — hard stop/start the launchd process.
- `~/stl status` — process + flag + recent log (`~/stl_autotext.log`).

## To run it on a DIFFERENT Mac (e.g. the Mini) — full migration
Only ONE Mac should run it (it sends from that Mac's Messages / iMessage account).
1. Copy the 3 files to `~/` and `~/Library/LaunchAgents/`.
2. **Edit the plist** — change the two `/Users/camrynoliver/...` paths to that Mac's home
   (e.g. `/Users/rylan369/...`), and edit the same absolute path inside `stl` if needed.
3. Sign Messages into the same Apple ID / phone number; enable iPhone **Text Message
   Forwarding** to that Mac (so it can send SMS to non-iMessage leads).
4. Grant that Mac's Terminal **Accessibility** (to press Return) and **Full Disk Access**
   (to read `chat.db`) in System Settings → Privacy & Security.
5. `launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.rylan.stlautotext.plist`
6. Verify with `~/stl status`, then a `python3 ~/stl_autotext.py --test "+1XXXXXXXXXX"`.
   Make sure the OTHER Mac's copy is stopped first (`~/stl pause`) so it doesn't double-send.
