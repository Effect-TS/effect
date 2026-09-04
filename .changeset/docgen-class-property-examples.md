---
"@effect/docgen": patch
---

Include parsed class property examples in documentation example type checking and, when enabled, execution. Previously these examples appeared in the documentation but were omitted from validation, so existing property examples with type errors can now cause docgen to fail. Property examples follow the same description, multiple-example, and `skip-type-checking` rules as other examples.
