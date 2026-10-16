---
"effect": patch
---

Add the unstable `Xml` module to `effect/encoding` for streaming XML 1.0 decoding and encoding over text or UTF-8 bytes. Decoding checks well-formedness, enforces size and depth limits, and never reads external resources or expands DOCTYPE entities. `elements` collects repeated elements, such as feed items, into trees.
