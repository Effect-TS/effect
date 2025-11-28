---
"@effect/cluster": patch
---

add TestRunner & SingleRunner modules

- `TestRunner` allows you to run a in-memory cluster for testing purposes.

- `SingleRunner` allows you to run a single node cluster simple deployment
  scenarios.
  - Message storage is backed by a SQL database
  - Multiple nodes are not supported
