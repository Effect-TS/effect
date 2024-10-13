import * as ParseResult from "effect/ParseResult"
import * as S from "effect/Schema"
import { Bench } from "tinybench"

/*
Before
┌─────────┬─────────────────────────────────┬───────────┬────────────────────┬──────────┬─────────┐
│ (index) │ Task Name                       │ ops/sec   │ Average Time (ns)  │ Margin   │ Samples │
├─────────┼─────────────────────────────────┼───────────┼────────────────────┼──────────┼─────────┤
│ 0       │ 'toString'                      │ '617,892' │ 1618.4039663825793 │ '±0.39%' │ 617893  │
│ 1       │ 'toJSON'                        │ '301,728' │ 3314.2333451541776 │ '±0.16%' │ 301729  │
│ 2       │ 'TreeFormatter.formatIssueSync' │ '36,498'  │ 27398.213814076604 │ '±0.18%' │ 36499   │
└─────────┴─────────────────────────────────┴───────────┴────────────────────┴──────────┴─────────┘
After:
*/

const bench = new Bench({ time: 1000 })

const schema = S.Struct({
  a: S.Literal("a"),
  b: S.Array(S.String),
  c: S.Record({ key: S.String, value: S.Number }),
  d: S.NumberFromString,
  e: S.Boolean
})

const result: any = ParseResult.decodeUnknownEither(schema)({ a: "a", b: ["b"], c: { c: "c" }, d: "1", e: true })

// console.log(String(schema.ast))

bench
  .add("toString", function() {
    String(schema.ast)
  })
  .add("toJSON", function() {
    schema.ast.toJSON()
  })
  .add("TreeFormatter.formatIssueSync", function() {
    ParseResult.TreeFormatter.formatIssueSync(result.left)
  })

await bench.run()

console.table(bench.table())
