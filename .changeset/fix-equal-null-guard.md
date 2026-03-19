---
"effect": patch
---

Fix `Equal.equals` crash when comparing `null` values inside `structuralRegion`. Added null guard before `Object.getPrototypeOf` calls to prevent `TypeError: Cannot convert undefined or null to object`.
