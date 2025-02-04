import * as ParseResult from "effect/ParseResult"
import * as S from "effect/Schema"
import type { ParseOptions } from "effect/SchemaAST"
import { Bench } from "tinybench"

/*
┌─────────┬──────────────────────────────────────────┬─────────────┬────────────────────┬──────────┬─────────┐
│ (index) │ Task Name                                │ ops/sec     │ Average Time (ns)  │ Margin   │ Samples │
├─────────┼──────────────────────────────────────────┼─────────────┼────────────────────┼──────────┼─────────┤
│ 0       │ 'Schema.decodeUnknownEither (good)'      │ '3,587,107' │ 278.7761790277582  │ '±0.37%' │ 3587108 │
│ 1       │ 'ParseResult.decodeUnknownEither (good)' │ '3,586,893' │ 278.79274046012614 │ '±0.26%' │ 3586894 │
│ 2       │ 'Schema.decodeUnknownEither (bad)'       │ '232,689'   │ 4297.571077399399  │ '±0.10%' │ 232690  │
│ 3       │ 'ParseResult.decodeUnknownEither (bad)'  │ '3,927,039' │ 254.64472936358712 │ '±0.06%' │ 3927040 │
└─────────┴──────────────────────────────────────────┴─────────────┴────────────────────┴──────────┴─────────┘
*/

const bench = new Bench({ time: 1000 })

const schema = S.Tuple(S.String, S.Number)

const good = ["a", 1]

const bad = ["a", "b"]

const schemadecodeUnknownEither = S.decodeUnknownEither(schema)
const parseResultdecodeUnknownEither = ParseResult.decodeUnknownEither(schema)
const options: ParseOptions = { errors: "all" }

bench
  .add("Schema.decodeUnknownEither (good)", function() {
    schemadecodeUnknownEither(good, options)
  })
  .add("ParseResult.decodeUnknownEither (good)", function() {
    parseResultdecodeUnknownEither(good, options)
  })
  .add("Schema.decodeUnknownEither (bad)", function() {
    schemadecodeUnknownEither(bad, options)
  })
  .add("ParseResult.decodeUnknownEither (bad)", function() {
    parseResultdecodeUnknownEither(bad, options)
  })

await bench.run()

console.table(bench.table())
