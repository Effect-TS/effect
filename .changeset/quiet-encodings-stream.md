---
"effect": minor
---

Add CharacterEncoding with Unicode and table-driven legacy character codecs,
typed conversion errors, and incremental encode/decode/transcode Effect streams.
Mapping data is derived from iconv-lite; no runtime dependency is added.
Import explicit codecs from effect/encoding/* for selective bundles, or opt into
the complete effect/encoding/All registry. Custom registries support runtime
labels without importing unrelated encodings.
