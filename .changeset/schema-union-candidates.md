---
"effect": patch
---

Reuse frozen candidate lists for Schema unions without literal members, avoiding a per-decode allocation and candidate-list rebuild.
