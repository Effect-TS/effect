---
"effect": patch
---

Fix `Csv.decode` and `Csv.decodeString` dropping the records parsed from an input chunk before a `CsvError` in that chunk.
