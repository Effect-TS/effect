---
"effect": patch
---

Fix event log server compaction failing with an argument-limit error on large groups, and stop scanning the whole in-memory journal on replay.
