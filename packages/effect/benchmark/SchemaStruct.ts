import * as ParseResult from "effect/ParseResult"
import * as S from "effect/Schema"
import { Bench } from "tinybench"

/*
┌─────────┬──────────────────────────────┬──────────────┬───────────────────┬──────────┬──────────┐
│ (index) │          Task Name           │   ops/sec    │ Average Time (ns) │  Margin  │ Samples  │
├─────────┼──────────────────────────────┼──────────────┼───────────────────┼──────────┼──────────┤
│    0    │ 'decodeUnknownEither (good)' │ '1,264,842'  │ 790.612353027686  │ '±0.36%' │ 1264843  │
│    1    │ 'decodeUnknownEither (bad)'  │ '14,080,309' │ 71.02116622111869 │ '±0.22%' │ 14080310 │
└─────────┴──────────────────────────────┴──────────────┴───────────────────┴──────────┴──────────┘
*/

const bench = new Bench({ time: 1000 })

const schema = S.Struct({
  a: S.Literal("a"),
  b: S.Array(S.String),
  c: S.Record({ key: S.String, value: S.Number }),
  d: S.NumberFromString,
  e: S.Boolean
})

const good = { a: "a", b: ["b"], c: { c: 1 }, d: "1", e: true }

const bad = { b: ["b"], c: { c: 1 }, d: "1", e: true, a: null }

const decodeUnknownEither = ParseResult.decodeUnknownEither(schema)

// console.log(decodeUnknownEither(good))
// console.log(decodeUnknownEither(bad))

bench
  .add("decodeUnknownEither (good)", function() {
    decodeUnknownEither(good)
  })
  .add("decodeUnknownEither (bad)", function() {
    decodeUnknownEither(bad)
  })

await bench.run()

console.table(bench.table())
