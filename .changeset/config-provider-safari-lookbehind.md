---
"effect": patch
---

Remove regex lookbehind from ConfigProvider variable expansion to prevent module-loading syntax errors on Safari versions before 16.4, while preserving interpolation and escaping behavior.
