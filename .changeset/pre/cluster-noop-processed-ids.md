---
"effect": patch
---

Avoid retaining completed request ids when `MessageStorage` is disabled. Without storage, redelivering a completed request id now runs the request again instead of failing with `AlreadyProcessingMessage`.
