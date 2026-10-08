---
"effect": patch
---

Serialize SchemaError as a compact message and flattened issue paths in JSON logs and Node inspection, without dumping schema AST nodes. Convert symbol path segments to strings while preserving the original issue and Cause.pretty output.
