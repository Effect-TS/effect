---
"effect": patch
---

Preserve leading U+FEFF characters in SchemaBinary string values when decoding, including dictionary-backed streams in both default and fingerprint modes. Strings beginning with a byte order mark now round-trip without losing content.
