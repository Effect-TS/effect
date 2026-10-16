---
"effect": patch
---

Apply GraphQL resolver batch limits independently per `batchKey`, so interleaved lookups for different tenants do not fragment each tenant's batches. Preserve separate requests for different protocol URLs.
