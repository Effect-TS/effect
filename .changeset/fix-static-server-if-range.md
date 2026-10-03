---
"effect": patch
---

Honor If-Range in HttpStaticServer, returning the full file when the entity-tag is stale or weak instead of serving a partial response. Reject date validators because filesystem metadata cannot establish their strength.
