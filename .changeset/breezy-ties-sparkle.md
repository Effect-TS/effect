---
"effect": patch
---

Allow `toString` Method to Be Overridden in Schema Classes, closes #4577.

Previously, attempting to override the `toString` method in schema classes caused a `TypeError` in the browser because the property was set as **read-only** (`writable: false`). This fix makes `toString` **writable**, allowing developers to override it when needed.
