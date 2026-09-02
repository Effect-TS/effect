---
"effect": patch
---

Fix JSON Schema export for definition names containing percent signs so local references remain resolvable after round trips and alias deduplication, while preserving JSON Pointer escaping.
