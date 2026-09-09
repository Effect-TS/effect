---
"effect": patch
---

Record attempt count, retry reason, and elapsed timing on `Effect.Transaction` as `TransactionMeta` so transaction bodies can observe retries and conflicts.
