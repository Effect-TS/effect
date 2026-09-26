---
"effect": patch
---

Stop entity managers from retaining every completed request id when `MessageStorage` is disabled. The ids were only cleared by the storage read loop, which never runs without storage, so memory grew with every request for the lifetime of the runner. Without storage, a request redelivered with the id of an already completed request, such as a transport retry after a lost reply, now runs again instead of failing with `AlreadyProcessingMessage`.
