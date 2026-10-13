---
"effect": patch
---

Pad 64-bit B3 trace ids to 32 hex characters in OTLP spans, links and log records, and in the outgoing `traceparent` header. An OTLP receiver rejected the whole export batch when one span carried a 16-character trace id.
