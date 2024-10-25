import type * as ParseResult from "@effect/schema/ParseResult"
import * as S from "@effect/schema/Schema"
import * as TreeFormatter from "@effect/schema/TreeFormatter"
import type * as Either from "effect/Either"
import { Bench } from "tinybench"

/*
┌─────────┬────────────────────────────────────────┬───────────┬───────────────────┬──────────┬─────────┐
│ (index) │               Task Name                │  ops/sec  │ Average Time (ns) │  Margin  │ Samples │
├─────────┼────────────────────────────────────────┼───────────┼───────────────────┼──────────┼─────────┤
│    0    │      'decodeUnknownEither(input)'      │ '237,016' │ 4219.109046468101 │ '±0.20%' │ 237017  │
│    1    │ 'TreeFormatter.formatIssueSync(issue)' │ '16,676'  │ 59965.88636461105 │ '±0.18%' │  16677  │
└─────────┴────────────────────────────────────────┴───────────┴───────────────────┴──────────┴─────────┘
*/

const bench = new Bench({ time: 1000 })

const schema = S.Struct({
  a: S.Struct({
    b: S.Struct({
      c: S.NonEmptyString
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
