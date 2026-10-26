---
"effect": patch
---

Add dependency-free `Json5.parse` and `Jsonc.parse` APIs with positioned syntax errors under `effect/encoding`. JSONC accepts one leading BOM, matching the TOML and YAML parsers.
