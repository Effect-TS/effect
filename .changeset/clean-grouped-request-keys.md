---
"effect": patch
---

Stop grouped RequestResolvers from retaining batch keys for the lifetime of the resolver. Equal keys are now matched by the pending batch map, so a key is dropped as soon as its batch stops pending, including after interruption.
