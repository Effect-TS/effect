---
"effect": patch
---

Skip malformed ndjson lines and non-object JSON-RPC messages so later requests still decode. Handle non-string notification methods without throwing.
