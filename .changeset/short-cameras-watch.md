---
"@effect/workflow": patch
---

Fix workflow suspension handling so mixed failures preserve non-interrupt causes and DurableDeferred.into isolates inner suspension state.
