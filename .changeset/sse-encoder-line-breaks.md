---
"effect": patch
---

Fix the `Sse` encoder splitting event data only on `\n`. A `\r` or `\r\n` in the data now starts a new `data:` line, so a lone `\r` no longer cuts off the rest of the event for parsers and `EventSource`.
