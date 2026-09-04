---
"effect": patch
---

Fix `Effect.all` error and service inference for unions of records with different keys. The returned effect now includes errors and required services from every record branch, while preserving a single outer effect and the branch-specific success shapes. Result mode still captures typed failures in `Result` values and retains service requirements; discarding results still retains the applicable error and service channels.

Callers that previously relied on omitted channels must provide the required services before running the effect and handle or propagate the inferred errors. Update return-type annotations that incorrectly declared the effect service-free or infallible. Runtime behavior is unchanged.
