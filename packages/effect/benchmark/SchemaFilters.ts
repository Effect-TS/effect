import * as ParseResult from "effect/ParseResult"
import * as S from "effect/Schema"
import type { ParseOptions } from "effect/SchemaAST"
import { Bench } from "tinybench"
import { z } from "zod"

/*
┌─────────┬──────────────────────────────────────────┬───────────┬────────────────────┬──────────┬─────────┐
│ (index) │                Task Name                 │  ops/sec  │ Average Time (ns)  │  Margin  │ Samples │
├─────────┼──────────────────────────────────────────┼───────────┼────────────────────┼──────────┼─────────┤
│    0    │   'Schema.decodeUnknownEither (good)'    │ '328,371' │ 3045.328672532268  │ '±1.44%' │ 328372  │
│    1    │ 'ParseResult.decodeUnknownEither (good)' │ '335,322' │ 2982.2044956612053 │ '±0.48%' │ 335323  │
│    2    │               'zod (good)'               │ '552,477' │ 1810.0287945960085 │ '±0.21%' │ 552478  │
│    3    │    'Schema.decodeUnknownEither (bad)'    │ '48,031'  │ 20819.486205098154 │ '±0.39%' │  48032  │
│    4    │ 'ParseResult.decodeUnknownEither (bad)'  │ '292,213' │ 3422.1507011699778 │ '±0.63%' │ 292214  │
│    5    │               'zod (bad)'                │ '103,400' │ 9671.159100907833  │ '±4.43%' │ 103613  │
└─────────┴──────────────────────────────────────────┴───────────┴────────────────────┴──────────┴─────────┘
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
    UserZod.safeParse(good)
  })
  .add("Schema.decodeUnknownEither (bad)", function() {
    schemadecodeUnknownEither(bad, options)
  })
  .add("ParseResult.decodeUnknownEither (bad)", function() {
    parseResultdecodeUnknownEither(bad, options)
  })
  .add("zod (bad)", function() {
    UserZod.safeParse(bad)
  })

await bench.run()

console.table(bench.table())
