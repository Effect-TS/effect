---
"effect": patch
---

Preserve the input offset in `DateTime.setParts` when it remains valid for the updated local time, falling back to compatible disambiguation otherwise.

This fixes edits during the second occurrence of a repeated DST hour shifting back an hour. Note that editing into a repeated hour from a time using the later offset (for example, setting `hour: 1` on `03:30 EST`) now lands on the second occurrence instead of the first.
