import * as ParseResult from "effect/ParseResult"
import * as S from "effect/Schema"
import type { ParseOptions } from "effect/SchemaAST"
import { Bench } from "tinybench"

/*
┌─────────┬──────────────────────────────────────────┬─────────────┬───────────────────┬──────────┬─────────┐
│ (index) │ Task Name                                │ ops/sec     │ Average Time (ns) │ Margin   │ Samples │
├─────────┼──────────────────────────────────────────┼─────────────┼───────────────────┼──────────┼─────────┤
│ 0       │ 'Schema.decodeUnknownEither (good)'      │ '3,390,518' │ 294.9401324693781 │ '±0.32%' │ 3390519 │
│ 1       │ 'ParseResult.decodeUnknownEither (good)' │ '3,388,065' │ 295.1536946952488 │ '±0.27%' │ 3388087 │
│ 2       │ 'Schema.decodeUnknownEither (bad)'       │ '228,525'   │ 4375.873939945003 │ '±0.13%' │ 228526  │
│ 3       │ 'ParseResult.decodeUnknownEither (bad)'  │ '3,236,794' │ 308.9476420349623 │ '±0.30%' │ 3236795 │
└─────────┴──────────────────────────────────────────┴─────────────┴───────────────────┴──────────┴─────────┘
*/

const bench = new Bench({ time: 1000 })

const schema = S.Array(S.String)

const good = ["a", "b", "c"]

const bad = ["a", 2, "c"]

const schemaDecodeUnknownEither = S.decodeUnknownEither(schema)
const parseResultDecodeUnknownEither = ParseResult.decodeUnknownEither(schema)
const options: ParseOptions = { errors: "all" }

bench
  .add("Schema.decodeUnknownEither (good)", function() {
    schemaDecodeUnknownEither(good, options)
  })
  .add("ParseResult.decodeUnknownEither (good)", function() {
    parseResultDecodeUnknownEither(good, options)
  })
  .add("Schema.decodeUnknownEither (bad)", function() {
    schemaDecodeUnknownEither(bad, options)
  })
  .add("ParseResult.decodeUnknownEither (bad)", function() {
    parseResultDecodeUnknownEither(bad, options)
  })

await bench.run()

console.table(bench.table())
