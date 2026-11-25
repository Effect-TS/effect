---
"effect": patch
---

Preserve the input offset in `DateTime.setParts` when valid for the updated local time, falling back to compatible disambiguation otherwise. Edits during or moving into a repeated DST hour from the later offset now stay in the second occurrence (e.g. setting `hour: 1` on `03:30 EST` yields `01:30 EST`).
