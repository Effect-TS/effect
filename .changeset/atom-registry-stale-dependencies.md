---
"effect": patch
---

Fix `AtomRegistry` missing updates through stale nodes, releasing dependencies a stale node still needs, and leaking a build that is superseded while it runs.
