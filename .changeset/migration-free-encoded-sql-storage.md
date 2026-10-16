---
"effect": minor
---

Expose `SqlMessageStorage.makeEncodedStorage` to construct an encoded SQL message storage driver without running migrations or executing startup SQL. Run `layerMigrations` separately with the same table prefix before using the driver; `makeEncoded` continues to run migrations by default.
