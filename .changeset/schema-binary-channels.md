---
"effect": patch
---

Add `SchemaBinary.encode`, `SchemaBinary.decode`, and `SchemaBinary.duplex` Channel helpers that stream binary frames directly through the schema-derived encoder and parser. Schemas with transformations, including async ones, run the schema pass per value, and encoding or decoding services become channel requirements.
