---
"effect": patch
---

Fix IndexedDB event journal uploads resending entries the remote has not echoed back. Upload progress is now checkpointed by insertion order, so entries imported later with older ids are still forwarded. Existing databases upgrade automatically; entries the remote has not confirmed may be uploaded once more after the upgrade.
