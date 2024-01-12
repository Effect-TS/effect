import { Bench } from "tinybench"
import type { ParseOptions } from "../src/AST.js"
import * as Schema from "../src/Schema.js"

/*
┌─────────┬─────────────────┬───────────┬────────────────────┬──────────┬─────────┐
│ (index) │    Task Name    │  ops/sec  │ Average Time (ns)  │  Margin  │ Samples │
├─────────┼─────────────────┼───────────┼────────────────────┼──────────┼─────────┤
│    0    │ 'schema (good)' │ '889,946' │ 1123.6626469914704 │ '±1.19%' │ 889947  │
│    1    │ 'schema (bad)'  │ '993,842' │ 1006.1954836705045 │ '±0.63%' │ 993843  │
└─────────┴─────────────────┴───────────┴────────────────────┴──────────┴─────────┘
*/

const bench = new Bench({ time: 1000 })

const schema = Schema.array(Schema.string)

const good = ["a", "b", "c"]

const bad = ["a", 2, "c"]

const parseEither = Schema.parseEither(schema)
const options: ParseOptions = { errors: "all" }

bench
  .add("schema (good)", function() {
    parseEither(good, options)
  })
  .add("schema (bad)", function() {
    parseEither(bad, options)
  })

await bench.run()

console.table(bench.table())
