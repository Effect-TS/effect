---
"effect": patch
---

Serialize `Result.Success` under `success` instead of `value` in `toJSON`, `JSON.stringify` and Node inspection output, matching its `success` property. Code that reads `value` from a serialized `Result` should read `success`.
