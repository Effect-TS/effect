---
"@effect/workflow": patch
---

Fix awaiting child workflows from inside activities so parallel activity fan-out can start all children before waiting for completion.
