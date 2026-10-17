---
"effect": patch
---

Decode eventlog entries faster by building `Entry`, `RemoteEntry` and `WriteEntriesUnencrypted` instances from already validated fields. The wire format is unchanged.
