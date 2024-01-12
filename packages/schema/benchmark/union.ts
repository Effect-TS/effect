import * as RA from "effect/ReadonlyArray"
import { Bench } from "tinybench"
import { z } from "zod"
import type { ParseOptions } from "../src/AST.js"
import * as S from "../src/Schema.js"

/*
n = 100
┌─────────┬──────────────────────┬─────────────┬────────────────────┬──────────┬─────────┐
│ (index) │      Task Name       │   ops/sec   │ Average Time (ns)  │  Margin  │ Samples │
├─────────┼──────────────────────┼─────────────┼────────────────────┼──────────┼─────────┤
│    0    │ 'parseEither (good)' │  '769,686'  │ 1299.2299910120141 │ '±0.72%' │ 769789  │
│    1    │     'zod (good)'     │ '1,032,295' │ 968.7144246894364  │ '±0.61%' │ 1032296 │
│    2    │ 'parseEither (bad)'  │  '463,348'  │  2158.20458744785  │ '±0.55%' │ 463349  │
│    3    │     'zod (bad)'      │ '1,010,359' │ 989.7469520908651  │ '±0.62%' │ 1010360 │
└─────────┴──────────────────────┴─────────────┴────────────────────┴──────────┴─────────┘
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

const parseEither = S.parseEither(schema)
const options: ParseOptions = { errors: "all" }

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

// console.log(parseEither(good))
// console.log(parseEither(bad))

bench
  .add("parseEither (good)", function() {
    parseEither(good, options)
  })
  .add("zod (good)", function() {
    schemaZod.safeParse(good)
  })
  .add("parseEither (bad)", function() {
    parseEither(bad, options)
  })
  .add("zod (bad)", function() {
    schemaZod.safeParse(good)
  })

await bench.run()

console.table(bench.table())
