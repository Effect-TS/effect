import * as ParseResult from "effect/ParseResult"
import * as S from "effect/Schema"
import type { ParseOptions } from "effect/SchemaAST"
import { Bench } from "tinybench"
import { z } from "zod"

/*
┌─────────┬──────────────────────────────────────────┬─────────────┬────────────────────┬──────────┬─────────┐
│ (index) │ Task Name                                │ ops/sec     │ Average Time (ns)  │ Margin   │ Samples │
├─────────┼──────────────────────────────────────────┼─────────────┼────────────────────┼──────────┼─────────┤
│ 0       │ 'Schema.decodeUnknownEither (good)'      │ '178,340'   │ 5607.258022552317  │ '±0.39%' │ 178341  │
│ 1       │ 'ParseResult.decodeUnknownEither (good)' │ '178,705'   │ 5595.811024811139  │ '±0.15%' │ 178706  │
│ 2       │ 'zod (good)'                             │ '1,745,923' │ 572.7628212909881  │ '±0.41%' │ 1745924 │
│ 3       │ 'Schema.decodeUnknownEither (bad)'       │ '103,361'   │ 9674.739442547396  │ '±0.13%' │ 103363  │
│ 4       │ 'ParseResult.decodeUnknownEither (bad)'  │ '187,992'   │ 5319.374051161494  │ '±0.23%' │ 187993  │
│ 5       │ 'zod (bad)'                              │ '471,637'   │ 2120.2705459049216 │ '±2.25%' │ 471639  │
└─────────┴──────────────────────────────────────────┴─────────────┴────────────────────┴──────────┴─────────┘
*/

const bench = new Bench({ time: 1000 })

const UserZod = z.object({
  name: z.string().min(3).max(20),
  age: z.number().min(0).max(120),
  address: z.object({
    street: z.string().min(3).max(200),
    number: z.number().min(0).max(120),
    city: z.string().min(3).max(200),
    country: z.string().min(3).max(200),
    zip: z.string().min(3).max(200)
  })
})

const schema = S.Struct({
  name: S.String.pipe(S.minLength(3), S.maxLength(20)),
  age: S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(120)),
  address: S.Struct({
    street: S.String.pipe(S.minLength(3), S.maxLength(200)),
    number: S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(120)),
    city: S.String.pipe(S.minLength(3), S.maxLength(200)),
    country: S.String.pipe(S.minLength(3), S.maxLength(200)),
    zip: S.String.pipe(S.minLength(3), S.maxLength(200))
  })
})

const good = {
  name: "Joe",
  age: 13,
  address: {
    street: "Main Street",
    number: 12,
    city: "New York",
    country: "USA",
    zip: "12345"
  }
}

const bad = {
  name: "Jo",
  age: 13,
  address: {
    street: "Main Street",
    number: 12,
    city: "New York",
    country: "USA",
    zip: "12345"
  }
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
    UserZod.safeParse(good)
  })
  .add("Schema.decodeUnknownEither (bad)", function() {
    schemaDecodeUnknownEither(bad, options)
  })
  .add("ParseResult.decodeUnknownEither (bad)", function() {
    parseResultDecodeUnknownEither(bad, options)
  })
  .add("zod (bad)", function() {
    UserZod.safeParse(bad)
  })

await bench.run()

console.table(bench.table())
