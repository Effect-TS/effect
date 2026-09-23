---
"effect": patch
---

Reuse frozen runtime-type fallback candidate lists for Schema unions, including tagged unions with literal members. Fallback paths no longer rebuild the same list on each decode.
