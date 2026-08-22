---
"effect": patch
---

Speed up SchemaBinary encode and decode paths.

- Success exits with an exact success schema skip the schema pass; failure exits keep it for their cause's error and defect encodings. RPC exit frames are roughly 1.8x faster in both directions.
- `Option`, `Result`, `Exit`, `Cause`, `CauseReason`, `Duration`, `BigDecimal`, `DateTimeUtc`, and `DateTimeZoned` schemas with exact parameters now take the direct path.
- The frame parser decodes complete frames directly from the incoming chunk and only buffers partial tails, removing a copy per feed.
- Output arenas grew from 8 KiB to 64 KiB, amortizing allocation across more frames.
- Row-run intern tables scan linearly up to sixteen values and stop tracking once sixty-four values never repeated, so high-cardinality fields skip map bookkeeping.
- ASCII decoding runs on sixteen-byte blocks, string slots skip the bounded reader window, duplicate record keys scan a list before spilling to a set, and struct decoding verifies required fields with one mask comparison.
