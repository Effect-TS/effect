import type { ParseOptions } from "@effect/schema/AST"
import * as ParseResult from "@effect/schema/ParseResult"
import * as S from "@effect/schema/Schema"
import * as RA from "effect/ReadonlyArray"
import { Bench } from "tinybench"
import { z } from "zod"

/*
n = 100
┌─────────┬──────────────────────────────────┬─────────────┬────────────────────┬──────────┬─────────┐
│ (index) │            Task Name             │   ops/sec   │ Average Time (ns)  │  Margin  │ Samples │
├─────────┼──────────────────────────────────┼─────────────┼────────────────────┼──────────┼─────────┤
│    0    │   'Schema.parseEither (good)'    │  '796,781'  │ 1255.049692662554  │ '±0.90%' │ 796782  │
│    1    │ 'ParseResult.parseEither (good)' │  '819,880'  │ 1219.6899489081034 │ '±0.53%' │ 819881  │
│    2    │           'zod (good)'           │  '977,435'  │ 1023.085625264674  │ '±0.63%' │ 977436  │
│    3    │    'Schema.parseEither (bad)'    │  '51,885'   │ 19273.13498642323  │ '±0.31%' │  51886  │
│    4    │ 'ParseResult.parseEither (bad)'  │  '477,900'  │ 2092.4839034973484 │ '±0.87%' │ 477901  │
│    5    │           'zod (bad)'            │ '1,000,658' │ 999.3415233430841  │ '±0.56%' │ 1000659 │
└─────────┴──────────────────────────────────┴─────────────┴────────────────────┴──────────┴─────────┘
*/

const bench = new Bench({ time: 1000 })

const n = 100
const members = RA.makeBy(n, (i) =>
  S.struct({
    kind: S.literal(i),
    a: S.string,
    b: S.number,
    c: S.boolean
  }))
const schema = S.union(...members)

const x = RA.makeBy(n, (i) =>
  z.object({
    kind: z.literal(i),
    a: z.string(),
    b: z.number(),
    c: z.boolean()
  }))

const schemaZod = z.discriminatedUnion("kind", x)

const good = {
  kind: n - 1,
  a: "a",
  b: 1,
  c: true
}

const bad = {
  kind: n - 1,
  a: "a",
  b: 1,
  c: "c"
}

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
  .add("zod (good)", function() {
    schemaZod.safeParse(good)
  })
  .add("Schema.parseEither (bad)", function() {
    schemaParseEither(bad, options)
  })
  .add("ParseResult.parseEither (bad)", function() {
    parseResultParseEither(bad, options)
  })
  .add("zod (bad)", function() {
    schemaZod.safeParse(good)
  })

await bench.run()

console.table(bench.table())
