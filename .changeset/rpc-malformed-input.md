---
"effect": patch
---

Keep RPC connections usable after malformed input. The ndjson parser now skips a line that is not valid JSON instead of retaining it and failing on every later chunk, and the JSON-RPC decoder ignores values that are not objects and no longer throws on a non-string `method`, so other messages in the same chunk are still delivered.
