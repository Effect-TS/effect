---
"@effect/schema": patch
---

Fix constructor type inference for classes with all optional fields, closes #

This fix addresses an issue where TypeScript incorrectly inferred the constructor parameter type as an empty object {} when all class fields were optional. Now, the constructor properly recognizes arguments as objects with optional fields (e.g., { abc?: number, xyz?: number }).
