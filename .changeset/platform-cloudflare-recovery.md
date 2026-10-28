---
"@effect/platform-cloudflare": patch
---

Fix two recovery gaps in the Cloudflare cluster runtime.

- Concurrent persisted unary requests that share a primary key no longer get an empty reply while the first handler is still running. Duplicates wait for that handler and receive its stored success or typed failure, and the handler runs once.
- A completed child workflow now persists its pending parent wake and retries delivery from an alarm, so a child whose completion notifications all fail no longer strands its suspended parent. A parent's `resume()` persists the pending resume and arms its guard alarm before acknowledging, so an abort after the acknowledgement still recovers.
