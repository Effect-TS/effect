---
"effect": patch
---

Schema: `standardSchemaV1` now returns all errors by default and supports custom options.

The `standardSchemaV1` now returns **all validation errors** by default (`ParseOptions = { errors: "all" }`). Additionally, it now accepts an optional `overrideOptions` parameter, allowing you to customize the default parsing behavior as needed.
