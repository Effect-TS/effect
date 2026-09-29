---
"effect": patch
---

Speed up JIT and AOT Schema decoding of transformations whose source has checks, such as a pattern-checked string decoded to a number. Fix compiled TemplateLiteral validation to enforce oneOf parts and preserve interpreter diagnostics when templates appear in transformation chains.
