---
"effect": patch
---

Add `effect/dataframe`: typed, columnar data frames on top of `effect/arrow`. `DataFrame` is the immutable table value; `Query` describes filters, derived columns, sorts, groups, aggregates, joins, window functions (`Expr.over`, cumulative, shift, rank, rolling), pivots, unpivots and list explosion lazily, with column names and types checked at compile time, and runs as an `Effect` after an optimiser rewrites the plan (predicate, slice and projection pushdown, top-k). Columns can hold numbers, strings, booleans, dates, timestamps, durations, decimals, lists and structs. Queries are plain data (`Plan`, with Schema codecs to and from JSON), read named tables from a `Catalog` service (frames, effects or streams of batches, processed batch by batch), and run on an `Engine`: in memory, or on a database through `Sql.layer` and `effect/sql`. Results follow Polars semantics and are checked against a Polars-generated gold corpus.
