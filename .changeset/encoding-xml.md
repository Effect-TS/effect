---
"effect": patch
---

Add the unstable `Xml` module to `effect/encoding` for streaming XML decoding and encoding over text or UTF-8 bytes. Decoding checks well-formedness, enforces size and depth limits and never expands entities declared in a DOCTYPE. `elements` collects repeated elements, such as feed items, into trees.
