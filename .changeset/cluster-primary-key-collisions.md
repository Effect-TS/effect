---
"effect": patch
---

Fix cluster request primary key collisions when entity types, entity IDs, or RPC tags contain slashes. `SqlMessageStorage` keeps deduplicating against rows stored under previous keys, and only treats such a row as the same request when its entity type, entity ID, and tag match.

Upgrade note: the keys of requests whose entity type, entity ID, or tag contains a slash (or whose entity type is `Workflow`) change. While runners on older versions are still running, these requests can be stored twice. Custom `MessageStorage` drivers receive the new keys and need their own handling for rows stored under the old ones.
