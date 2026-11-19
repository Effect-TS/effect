---
"effect": minor
---

Add an opt-in `formats: "apply"` option to `SchemaRepresentation.fromJsonSchemaDocument`. Format keywords stay annotations by default; with the option, `uuid`, `ipv4`, `ipv6` and `json-pointer` are enforced using validators that already ship with Effect. Other standard formats remain annotation-only until exact validators are available.
