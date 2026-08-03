---
"effect": patch
---

Schema: `make` no longer re-constructs class values that are already valid instances. A field such as `Schema.Array(MyClass)` previously rebuilt every element on construction, allocating a fresh tree and discarding the caller's references; already-valid instances now pass through unchanged. Constructor defaults, checks and failure messages are unaffected for inputs that are not yet instances. Code that relied on `make` returning defensive copies of its class inputs will now observe the original references, closes #6890.
