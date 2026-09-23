---
"effect": patch
---

Stop Schema unions rebuilding their runtime-type candidate list on every decode. The list is now built once per union and reused.
