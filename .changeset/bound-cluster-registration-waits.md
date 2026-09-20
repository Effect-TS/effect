---
"effect": patch
---

Bound local sends that wait for an unregistered cluster entity type. These sends now fail with an `Entity type ... not registered` defect at the shared runner registration deadline. Once that startup deadline has elapsed, sends to not-yet-registered dynamic entity types fail immediately.
