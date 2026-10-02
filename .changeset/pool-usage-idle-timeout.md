---
"effect": patch
---

Fix `Pool` usage TTL to expire only idle, unreserved excess items, oldest idle first. Measure idle time from the last release to avoid retiring recently used items.
