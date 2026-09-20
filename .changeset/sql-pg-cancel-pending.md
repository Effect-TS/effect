---
"@effect/sql-pg": patch
---

Give interrupted PostgreSQL queries and streams a short chance to drain before sending a `CancelRequest`. Once sent, retire the session unless the backend reports `57014`, protecting the next statement from an unconfirmed delayed cancel.

PostgreSQL also uses `57014` for `statement_timeout`, so it cannot prove the cancel arrived. A caller holding a retired connection receives a `ConnectionError`; a later pool checkout gets a replacement.
