---
"effect": patch
---

Fix `RequestResolver.persisted` to propagate and persist resolver failures and defects for incomplete requests without overwriting results from already completed requests. Thrown resolver callbacks now follow the same persistence path as effect defects.
