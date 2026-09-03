---
"effect": patch
---

Include client middleware errors in `AtomRpc` mutation, unary-query, and stream-query error types, matching failures these operations already return at runtime. Consumers handling these results may need to account for the newly visible error variants. This typing correction does not add serialization or hydration support for client-only middleware errors.
