---
"effect": patch
---

Add a `concurrency` option to `Arbitrary.checkEffect` and global check configuration to run independent property evaluations concurrently. Results remain deterministic for deterministic generators and repeatable properties, while shrinking and replay stay sequential. The default concurrency is `1`.
