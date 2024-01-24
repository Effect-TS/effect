import type { ParseOptions } from "@effect/schema/AST"
import * as ParseResult from "@effect/schema/ParseResult"
import * as S from "@effect/schema/Schema"
import { Bench } from "tinybench"

/*
┌─────────┬──────────────────────────────────┬─────────────┬────────────────────┬──────────┬─────────┐
│ (index) │            Task Name             │   ops/sec   │ Average Time (ns)  │  Margin  │ Samples │
├─────────┼──────────────────────────────────┼─────────────┼────────────────────┼──────────┼─────────┤
│    0    │   'Schema.parseEither (good)'    │  '863,704'  │ 1157.802917983792  │ '±0.71%' │ 863705  │
│    1    │ 'ParseResult.parseEither (good)' │  '887,219'  │ 1127.1170610904383 │ '±0.90%' │ 887220  │
│    2    │    'Schema.parseEither (bad)'    │  '62,121'   │ 16097.515895336655 │ '±0.70%' │  62122  │
│    3    │ 'ParseResult.parseEither (bad)'  │ '1,083,674' │ 922.7863489293627  │ '±0.85%' │ 1083763 │
└─────────┴──────────────────────────────────┴─────────────┴────────────────────┴──────────┴─────────┘
*/

const bench = new Bench({ time: 1000 })

const schema = S.array(S.string)

const good = ["a", "b", "c"]

const bad = ["a", 2, "c"]

const schemaParseEither = S.parseEither(schema)
const parseResultParseEither = ParseResult.parseEither(schema)
const options: ParseOptions = { errors: "all" }

bench
  .add("Schema.parseEither (good)", function() {
    schemaParseEither(good, options)
  })
  .add("ParseResult.parseEither (good)", function() {
    parseResultParseEither(good, options)
  })
  .add("Schema.parseEither (bad)", function() {
    schemaParseEither(bad, options)
  })
  .add("ParseResult.parseEither (bad)", function() {
    parseResultParseEither(bad, options)
  })

await bench.run()

console.table(bench.table())
