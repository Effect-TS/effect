import * as RA from "effect/Array"
import * as ParseResult from "effect/ParseResult"
import * as S from "effect/Schema"
import type { ParseOptions } from "effect/SchemaAST"
import { Bench } from "tinybench"
import { z } from "zod"

/*
┌─────────┬──────────────────────────────────────────┬─────────────┬────────────────────┬──────────┬─────────┐
│ (index) │ Task Name                                │ ops/sec     │ Average Time (ns)  │ Margin   │ Samples │
├─────────┼──────────────────────────────────────────┼─────────────┼────────────────────┼──────────┼─────────┤
│ 0       │ 'Schema.decodeUnknownEither (good)'      │ '2,777,583' │ 360.025132633242   │ '±0.31%' │ 2777584 │
│ 1       │ 'ParseResult.decodeUnknownEither (good)' │ '2,763,947' │ 361.80132983691675 │ '±0.03%' │ 2763948 │
│ 2       │ 'zod (good)'                             │ '3,335,028' │ 299.8475137697173  │ '±0.31%' │ 3335029 │
│ 3       │ 'Schema.decodeUnknownEither (bad)'       │ '207,579'   │ 4817.437354273092  │ '±0.08%' │ 207580  │
│ 4       │ 'ParseResult.decodeUnknownEither (bad)'  │ '1,707,747' │ 585.5667206168476  │ '±0.31%' │ 1707748 │
│ 5       │ 'zod (bad)'                              │ '3,305,101' │ 302.5625463294264  │ '±0.24%' │ 3305102 │
└─────────┴──────────────────────────────────────────┴─────────────┴────────────────────┴──────────┴─────────┘
*/

const bench = new Bench({ time: 1000 })

const n = 100
const members = RA.makeBy(n, (i) =>
  S.Struct({
    kind: S.Literal(i),
    a: S.String,
    b: S.Number,
    c: S.Boolean
  }))
const schema = S.Union(...members)

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

const schemaDecodeUnknownEither = S.decodeUnknownEither(schema)
const parseResultDecodeUnknownEither = ParseResult.decodeUnknownEither(schema)
const options: ParseOptions = { errors: "all" }

bench
  .add("Schema.decodeUnknownEither (good)", function() {
    schemaDecodeUnknownEither(good, options)
  })
  .add("ParseResult.decodeUnknownEither (good)", function() {
    parseResultDecodeUnknownEither(good, options)
  })
  .add("zod (good)", function() {
    schemaZod.safeParse(good)
  })
  .add("Schema.decodeUnknownEither (bad)", function() {
    schemaDecodeUnknownEither(bad, options)
  })
  .add("ParseResult.decodeUnknownEither (bad)", function() {
    parseResultDecodeUnknownEither(bad, options)
  })
  .add("zod (bad)", function() {
    schemaZod.safeParse(good)
  })

await bench.run()

console.table(bench.table())
