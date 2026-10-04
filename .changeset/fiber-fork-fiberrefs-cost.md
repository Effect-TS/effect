---
"effect": patch
---

Optimize Fiber fork performance by sharing FiberRefs and avoiding redundant Map allocations when refs are unchanged.
