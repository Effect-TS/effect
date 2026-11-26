---
"@effect/platform-cloudflare": patch
---

Fix Cloudflare entity request interruption so asks are reliably cancelled even if the interrupt arrives before the request registers, while another request waits on a SQL transaction, or for a deduplicated delayed ask.
