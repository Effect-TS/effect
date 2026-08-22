---
"effect": patch
---

Speed up SchemaBinary encode and decode paths.

- The frame parser decodes complete frames directly from the incoming chunk and only buffers partial tails, removing a copy per feed.
- Output arenas grew from 8 KiB to 64 KiB, amortizing allocation across more frames.
- Row-run intern tables scan linearly and stop tracking values that never repeat, so high-cardinality fields skip map bookkeeping.
- String-typed slots decode without the bounded reader window.
- `Option`, `Result`, `Exit`, `Cause`, `CauseReason`, `Duration`, `BigDecimal`, `DateTimeUtc`, and `DateTimeZoned` schemas with exact parameters now take the direct path, skipping the redundant schema pass.
