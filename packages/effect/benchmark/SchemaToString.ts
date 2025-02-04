import * as ParseResult from "effect/ParseResult"
import * as S from "effect/Schema"
import { Bench } from "tinybench"

/*
┌─────────┬─────────────────────────────────┬───────────┬────────────────────┬──────────┬─────────┐
│ (index) │ Task Name                       │ ops/sec   │ Average Time (ns)  │ Margin   │ Samples │
├─────────┼─────────────────────────────────┼───────────┼────────────────────┼──────────┼─────────┤
│ 0       │ 'toString'                      │ '282,142' │ 3544.30530263047   │ '±1.79%' │ 282143  │
│ 1       │ 'toJSON'                        │ '319,008' │ 3134.714130322425  │ '±0.45%' │ 319009  │
│ 2       │ 'TreeFormatter.formatIssueSync' │ '35,271'  │ 28351.291506011636 │ '±0.18%' │ 35272   │
└─────────┴─────────────────────────────────┴───────────┴────────────────────┴──────────┴─────────┘
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
