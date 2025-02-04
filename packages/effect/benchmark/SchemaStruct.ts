import * as ParseResult from "effect/ParseResult"
import * as S from "effect/Schema"
import { Bench } from "tinybench"

/*
┌─────────┬──────────────────────────────────────────┬──────────────┬───────────────────┬──────────┬──────────┐
│ (index) │ Task Name                                │ ops/sec      │ Average Time (ns) │ Margin   │ Samples  │
├─────────┼──────────────────────────────────────────┼──────────────┼───────────────────┼──────────┼──────────┤
│ 0       │ 'ParseResult.decodeUnknownEither (good)' │ '1,253,290'  │ 797.8996777284824 │ '±0.23%' │ 1253291  │
│ 1       │ 'ParseResult.decodeUnknownEither (bad)'  │ '13,713,888' │ 72.91877607298059 │ '±0.36%' │ 13713890 │
└─────────┴──────────────────────────────────────────┴──────────────┴───────────────────┴──────────┴──────────┘
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
  .add("ParseResult.decodeUnknownEither (good)", function() {
    decodeUnknownEither(good)
  })
  .add("ParseResult.decodeUnknownEither (bad)", function() {
    decodeUnknownEither(bad)
  })

await bench.run()

console.table(bench.table())
