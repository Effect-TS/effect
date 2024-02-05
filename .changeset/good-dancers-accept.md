---
"@effect/cli": minor
---

make array types in cli more permissive

This change removes NonEmpty\* arrays as input parameters, and removes use of ReadonlyArray as a return type (prefering Array instead).

This allows more interop with the existing js ecosystem.
