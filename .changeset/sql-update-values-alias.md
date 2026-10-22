---
"effect": patch
---

Escape the `sql.updateValues` alias as an identifier, without applying name transforms. Pass a bare alias rather than pre-quoted SQL, and quote mixed-case PostgreSQL aliases where they are referenced. Custom `onRecordUpdate` compiler hooks now receive the alias already escaped.
