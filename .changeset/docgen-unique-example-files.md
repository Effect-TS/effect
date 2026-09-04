---
"@effect/docgen": patch
---

Keep examples from distinct module paths in separate temporary files when their hyphen-joined names collide. All colliding examples are now type-checked and, when enabled, executed instead of silently overwriting one another. Previously hidden example type errors can now cause docgen to fail.

All temporary example filenames and compiler diagnostic paths now gain ordinal prefixes. These names are stable for the same ordered input, not stable identifiers across different inputs. Update any tooling that depends on the previous temporary filenames or diagnostic paths; generated documentation page paths are unchanged.
