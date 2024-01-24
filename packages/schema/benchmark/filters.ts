import type { ParseOptions } from "@effect/schema/AST"
import * as ParseResult from "@effect/schema/ParseResult"
import * as S from "@effect/schema/Schema"
import { Bench } from "tinybench"
import { z } from "zod"

/*
┌─────────┬──────────────────────────────────┬───────────┬────────────────────┬──────────┬─────────┐
│ (index) │            Task Name             │  ops/sec  │ Average Time (ns)  │  Margin  │ Samples │
├─────────┼──────────────────────────────────┼───────────┼────────────────────┼──────────┼─────────┤
│    0    │   'Schema.parseEither (good)'    │ '342,020' │ 2923.802446453039  │ '±0.62%' │ 342021  │
│    1    │ 'ParseResult.parseEither (good)' │ '337,695' │ 2961.2508013182246 │ '±0.53%' │ 337696  │
│    2    │           'zod (good)'           │ '555,119' │ 1801.4151433871723 │ '±0.23%' │ 555120  │
│    3    │    'Schema.parseEither (bad)'    │ '49,078'  │ 20375.676968197804 │ '±0.39%' │  49079  │
│    4    │ 'ParseResult.parseEither (bad)'  │ '296,194' │ 3376.1556217069515 │ '±0.77%' │ 296195  │
│    5    │           'zod (bad)'            │ '108,526' │ 9214.319887718113  │ '±4.52%' │ 108527  │
└─────────┴──────────────────────────────────┴───────────┴────────────────────┴──────────┴─────────┘
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

const schema = S.struct({
  name: S.string.pipe(S.minLength(3), S.maxLength(20)),
  age: S.number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(120)),
  address: S.struct({
    street: S.string.pipe(S.minLength(3), S.maxLength(200)),
    number: S.number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(120)),
    city: S.string.pipe(S.minLength(3), S.maxLength(200)),
    country: S.string.pipe(S.minLength(3), S.maxLength(200)),
    zip: S.string.pipe(S.minLength(3), S.maxLength(200))
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
    UserZod.safeParse(good)
  })
  .add("Schema.parseEither (bad)", function() {
    schemaParseEither(bad, options)
  })
  .add("ParseResult.parseEither (bad)", function() {
    parseResultParseEither(bad, options)
  })
  .add("zod (bad)", function() {
    UserZod.safeParse(bad)
  })

await bench.run()

console.table(bench.table())
