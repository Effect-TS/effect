---
"effect": patch
---

Fix `Stream.mapEffect` with `concurrency` hanging forever when the mapping function throws synchronously. The function was called outside the forked fiber, so the throw escaped before a fiber existed to fail. It now runs inside the fork and becomes a defect, as it already did on the sequential path. `Stream.tap`, `Stream.tapBoth`, `Stream.bindEffect`, `Stream.partitionEffect` and `Channel.tap` share the fix.
