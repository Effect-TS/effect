---
"effect": patch
---

`Effect.Transaction` now stores attempt metadata, analogous to `Schedule.CurrentMetadata`. Yield it inside a transaction body to read `attempt`, `retryReason`, and the same timing fields as a schedule (`start`, `now`, `elapsed`, `elapsedSincePrevious`).
