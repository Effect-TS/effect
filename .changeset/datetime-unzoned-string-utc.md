---
"effect": patch
---

Fix `DateTime.makeUnsafe` and related constructors reading some strings without a zone, such as `"2024-1-15"`, in the host's time zone instead of UTC.
