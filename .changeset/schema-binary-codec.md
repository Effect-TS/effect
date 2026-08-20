---
"effect": minor
---

Add `SchemaBinary`, a compact Schema-derived codec with streaming frame parsing and stable field ids. Encoded bytes are arena-backed views; copy them when independent ownership is required.
