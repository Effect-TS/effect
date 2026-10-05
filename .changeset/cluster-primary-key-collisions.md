---
"effect": patch
---

Fix cluster request deduplication treating distinct requests as duplicates when an entity type, entity id, or RPC tag contains `/` (for example entity type `Orders/Europe` with id `42` and entity type `Orders` with id `Europe/42`). Such requests now get an escaped storage primary key. All other keys, including `Workflow/<name>` keys, are unchanged. `SqlMessageStorage` still deduplicates against rows stored under the previous key after checking that their entity type, entity id, and tag match.
