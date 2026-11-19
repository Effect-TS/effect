---
"effect": minor
---

Enforce standard JSON Schema `format` keywords when importing draft 2020-12 documents through `SchemaRepresentation.fromJsonSchemaDocument`. Previously `format` was kept as an annotation only, so values such as `broken-timestamp` with `format: "date-time"` decoded successfully. The importer now adds checks for date-time, date, time, duration, email, hostname, IPv4, IPv6, URI, UUID, JSON pointers and regular expressions. Unknown formats remain annotation-only.
