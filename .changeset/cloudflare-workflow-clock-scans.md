---
"@effect/platform-cloudflare": patch
---

Avoid redundant clock scans and alarm writes when replaying `DurableClock.sleep` in Cloudflare workflows.
