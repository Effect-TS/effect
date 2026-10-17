---
"effect": patch
---

Fix IndexedDB event journal uploads to resume without rescanning or resending successful batches, while still forwarding entries imported with older IDs. Existing databases upgrade automatically; entries not confirmed by a remote may be uploaded once again after the upgrade.
