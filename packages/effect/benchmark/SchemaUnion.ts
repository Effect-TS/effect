import * as RA from "effect/Array"
import * as ParseResult from "effect/ParseResult"
import * as S from "effect/Schema"
import type { ParseOptions } from "effect/SchemaAST"
import { Bench } from "tinybench"
import { z } from "zod"

/*
n = 100
┌─────────┬──────────────────────────────────────────┬───────────┬────────────────────┬──────────┬─────────┐
│ (index) │                Task Name                 │  ops/sec  │ Average Time (ns)  │  Margin  │ Samples │
├─────────┼──────────────────────────────────────────┼───────────┼────────────────────┼──────────┼─────────┤
│    0    │   'Schema.decodeUnknownEither (good)'    │ '762,351' │ 1311.7303972762459 │ '±0.93%' │ 762352  │
│    1    │ 'ParseResult.decodeUnknownEither (good)' │ '783,576' │ 1276.199792010595  │ '±0.54%' │ 783577  │
│    2    │               'zod (good)'               │ '958,140' │ 1043.6878259825853 │ '±0.82%' │ 958141  │
│    3    │    'Schema.decodeUnknownEither (bad)'    │ '53,537'  │ 18678.624151070893 │ '±0.58%' │  53538  │
│    4    │ 'ParseResult.decodeUnknownEither (bad)'  │ '484,651' │ 2063.3393040682363 │ '±0.67%' │ 484652  │
│    5    │               'zod (bad)'                │ '997,081' │ 1002.9270279182039 │ '±0.67%' │ 997082  │
└─────────┴──────────────────────────────────────────┴───────────┴────────────────────┴──────────┴─────────┘
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
  .add("zod (good)", function() {
    schemaZod.safeParse(good)
  })
  .add("Schema.decodeUnknownEither (bad)", function() {
    schemadecodeUnknownEither(bad, options)
  })
  .add("ParseResult.decodeUnknownEither (bad)", function() {
    parseResultdecodeUnknownEither(bad, options)
  })
  .add("zod (bad)", function() {
    schemaZod.safeParse(good)
  })

await bench.run()

console.table(bench.table())
