import type * as ParseResult from "@effect/schema/ParseResult"
import * as S from "@effect/schema/Schema"
import * as TreeFormatter from "@effect/schema/TreeFormatter"
import type * as Either from "effect/Either"
import { Bench } from "tinybench"

/*
┌─────────┬────────────────────────────────────────┬───────────┬────────────────────┬──────────┬─────────┐
│ (index) │               Task Name                │  ops/sec  │ Average Time (ns)  │  Margin  │ Samples │
├─────────┼────────────────────────────────────────┼───────────┼────────────────────┼──────────┼─────────┤
│    0    │      'decodeUnknownEither(input)'      │ '235,919' │ 4238.734784147302  │ '±0.22%' │ 235920  │
│    1    │ 'TreeFormatter.formatIssueSync(issue)' │ '15,811'  │ 63246.838297989896 │ '±0.21%' │  15812  │
└─────────┴────────────────────────────────────────┴───────────┴────────────────────┴──────────┴─────────┘
*/

const bench = new Bench({ time: 1000 })

const schema = S.Struct({
  a: S.Struct({
    b: S.Struct({
      c: S.NonEmpty
    })
  })
})

const decodeUnknownEither = S.decodeUnknownEither(schema)
const input = { a: { b: { c: "" } } }
const result = decodeUnknownEither(input)
const issue = (result as any as Either.Left<ParseResult.ParseError, unknown>).left.issue

// console.log(issue)

bench
  .add("decodeUnknownEither(input)", function() {
    decodeUnknownEither(input)
  })
  .add("TreeFormatter.formatIssueSync(issue)", function() {
    TreeFormatter.formatIssueSync(issue)
  })

await bench.run()

console.table(bench.table())
