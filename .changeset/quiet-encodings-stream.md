---
"effect": minor
---

Add CharacterEncoding with Unicode and table-driven legacy character codecs,
typed conversion errors, and incremental encode/decode/transcode Effect streams.
Mapping data is derived from iconv-lite; no runtime dependency is added.
Import explicit codecs from effect/encoding/* for selective bundles; mapping
runtime encoding labels to codecs is left to the application.
