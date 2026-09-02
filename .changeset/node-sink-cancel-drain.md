---
"@effect/platform-node-shared": patch
---

Fix NodeSink writable adapters submitting more writes after interruption while waiting for backpressure to clear. Interrupted sinks now remove the pending drain listener without cancelling writes already submitted to the writable.
