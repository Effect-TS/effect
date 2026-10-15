---
"effect": patch
---

Fix SQL event journals reporting incoming remote entries as conflicts. Remote writes now report only previously stored newer entries and atomically persist entries and remote sequences after all callbacks succeed, allowing failed writes to be retried.
