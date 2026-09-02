---
"effect": patch
---

Fix `Reactivity` query scope cleanup throwing when registered keys or record IDs are repeated. Closing a query now removes its subscription without disrupting other queries registered for the same keys.
