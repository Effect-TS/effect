---
"effect": patch
---

Fix IndexedDB event journal upload checkpoints so successful uploads do not resend earlier entries or rescan the whole journal. Use a read-only transaction when collecting entries to upload.
