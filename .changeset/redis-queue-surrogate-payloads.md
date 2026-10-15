---
"effect": patch
---

Fix Redis PersistedQueue delivery of payloads containing lone UTF-16 surrogates without losing other entries in the batch. Preserve custom-ID cleanup for failed payloads containing these strings, while retaining compatibility with existing queued entries. Normalize unpaired surrogates in offered Redis IDs to match Redis UTF-8 encoding and prevent stalled delivery.
