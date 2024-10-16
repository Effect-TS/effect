import * as ParseResult from "effect/ParseResult"
import * as S from "effect/Schema"
import { Bench } from "tinybench"

/*
┌─────────┬────────────────────────────────────────────────────────────┬──────────────┬────────────────────┬──────────┬──────────┐
│ (index) │                         Task Name                          │   ops/sec    │ Average Time (ns)  │  Margin  │ Samples  │
├─────────┼────────────────────────────────────────────────────────────┼──────────────┼────────────────────┼──────────┼──────────┤
│    0    │            'decodeUnknownEither (valid input)'             │ '1,249,635'  │ 800.2333527737999  │ '±0.30%' │ 1249636  │
│    1    │  'decodeUnknownEitherPreserveInputKeyOrder (valid input)'  │  '853,288'   │ 1171.9369854943957 │ '±0.17%' │  853289  │
│    2    │           'decodeUnknownEither (invalid input)'            │ '11,534,459' │ 86.69673906736591  │ '±0.31%' │ 11534460 │
│    3    │ 'decodeUnknownEitherPreserveInputKeyOrder (invalid input)' │ '11,435,077' │ 87.45021734921293  │ '±0.34%' │ 11435078 │
└─────────┴────────────────────────────────────────────────────────────┴──────────────┴────────────────────┴──────────┴──────────┘
*/

const bench = new Bench({ time: 1000 })

const schema = S.Struct({
  a: S.Literal("a"),
  b: S.Array(S.String),
  c: S.Record({ key: S.String, value: S.Number }),
  d: S.NumberFromString,
  e: S.Boolean
})

const validInput = { a: "a", b: ["b"], c: { c: 1 }, d: "1", e: true }

const invalidInput = { b: ["b"], c: { c: 1 }, d: "1", e: true, a: null }

const decodeUnknownEither = ParseResult.decodeUnknownEither(schema)
const decodeUnknownEitherPreserveInputKeyOrder = ParseResult.decodeUnknownEither(schema, { propertyOrder: "original" })

bench
  .add("decodeUnknownEither (valid input)", function() {
    decodeUnknownEither(validInput)
  })
  .add("decodeUnknownEitherPreserveInputKeyOrder (valid input)", function() {
    decodeUnknownEitherPreserveInputKeyOrder(validInput)
  })
  .add("decodeUnknownEither (invalid input)", function() {
    decodeUnknownEither(invalidInput)
  })
  .add("decodeUnknownEitherPreserveInputKeyOrder (invalid input)", function() {
    decodeUnknownEitherPreserveInputKeyOrder(invalidInput)
  })

await bench.run()

console.table(bench.table())
