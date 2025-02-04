import type * as Either from "effect/Either"
import * as ParseResult from "effect/ParseResult"
import * as S from "effect/Schema"
import { Bench } from "tinybench"

/*
┌─────────┬────────────────────────────────────────┬──────────┬───────────────────┬──────────┬─────────┐
│ (index) │ Task Name                              │ ops/sec  │ Average Time (ns) │ Margin   │ Samples │
├─────────┼────────────────────────────────────────┼──────────┼───────────────────┼──────────┼─────────┤
│ 0       │ 'TreeFormatter.formatIssueSync(issue)' │ '27,902' │ 35839.27072357856 │ '±0.29%' │ 27903   │
└─────────┴────────────────────────────────────────┴──────────┴───────────────────┴──────────┴─────────┘
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
  .add("TreeFormatter.formatIssueSync(issue)", function() {
    ParseResult.TreeFormatter.formatIssueSync(issue)
  })

await bench.run()

console.table(bench.table())
