import * as ParseResult from "effect/ParseResult"
import * as S from "effect/Schema"
import { Bench } from "tinybench"

/*
┌─────────┬────────────────────────────────────────────────────────────┬──────────────┬────────────────────┬──────────┬──────────┐
│ (index) │ Task Name                                                  │ ops/sec      │ Average Time (ns)  │ Margin   │ Samples  │
├─────────┼────────────────────────────────────────────────────────────┼──────────────┼────────────────────┼──────────┼──────────┤
│ 0       │ 'decodeUnknownEither (valid input)'                        │ '1,286,800'  │ 777.1212922589341  │ '±0.29%' │ 1286801  │
│ 1       │ 'decodeUnknownEitherPreserveInputKeyOrder (valid input)'   │ '843,338'    │ 1185.7631901288776 │ '±0.18%' │ 843339   │
│ 2       │ 'decodeUnknownEither (invalid input)'                      │ '13,934,307' │ 71.76531493346903  │ '±0.31%' │ 13934308 │
│ 3       │ 'decodeUnknownEitherPreserveInputKeyOrder (invalid input)' │ '13,450,784' │ 74.3451049138201   │ '±0.56%' │ 13450785 │
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
  .add("ParseResult.decodeUnknownEither (valid input)", function() {
    decodeUnknownEither(validInput)
  })
  .add("ParseResult.decodeUnknownEitherPreserveInputKeyOrder (valid input)", function() {
    decodeUnknownEitherPreserveInputKeyOrder(validInput)
  })
  .add("ParseResult.decodeUnknownEither (invalid input)", function() {
    decodeUnknownEither(invalidInput)
  })
  .add("ParseResult.decodeUnknownEitherPreserveInputKeyOrder (invalid input)", function() {
    decodeUnknownEitherPreserveInputKeyOrder(invalidInput)
  })

await bench.run()

console.table(bench.table())
