---
"effect": patch
---

`Toolkit.handle` now requires tool handler services on the outer Effect as well as the returned Stream. If a parameter decoder needs a service, provide it when running the outer `handle` Effect, not only when consuming the Stream.
