---
"effect": patch
---

Fix `Yaml.parse` rejecting flow collections that span multiple lines, such as a JSON-style mapping with its entries and closing bracket on separate lines.
