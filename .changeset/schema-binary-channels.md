---
"effect": patch
---

Add `SchemaBinary.encode`, `SchemaBinary.decode`, and `SchemaBinary.duplex` Channel helpers that stream binary frames directly through the schema-derived encoder and parser. Schemas with transformations, including async ones, run one schema pass per chunk on encode and per framed value on decode; encoding and decoding services become channel requirements.
