---
"effect": patch
---

Fix the data-last `Sink.catchCause` overload to type the resulting sink with the handler's error type instead of the original error type, matching the data-first overload and runtime behavior.
