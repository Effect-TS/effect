---
"effect": patch
---

Fix `AtomRegistry` missing updates through stale nodes, releasing dependencies a stale node still needs, leaking a build that is superseded while it runs, and never recovering an observed node after its rebuild throws.
