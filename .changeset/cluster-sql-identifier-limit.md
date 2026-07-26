---
"effect": minor
---

Add opt-in `limitIdentifiers` to `SqlMessageStorage` so long table/index/constraint names can be capped at the Postgres 63-character identifier limit with a stable hash suffix. Default naming is unchanged.
