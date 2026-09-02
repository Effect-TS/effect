---
"effect": patch
---

Convert scalar null values to the string "null" when constructing UrlParams, including iterable entries and nested records, instead of throwing.
