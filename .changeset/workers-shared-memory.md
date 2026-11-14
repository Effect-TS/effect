---
"effect": patch
---

Add `effect/workers/SharedMemory`: allocate or share typed arrays in `SharedArrayBuffer` memory, and describe them in worker message schemas (such as RPC payloads) so workers read and write the caller's memory instead of a copy.
