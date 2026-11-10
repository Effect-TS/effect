---
"effect": patch
---

Fix `Csv.decode` and `Csv.decodeString` dropping records completed before a `CsvError` in the same input chunk.
