import { Bench } from "tinybench"
import { z } from "zod"
import type { ParseOptions } from "../src/AST.js"
import * as Schema from "../src/Schema.js"

/*
┌─────────┬─────────────────┬───────────┬────────────────────┬──────────┬─────────┐
│ (index) │    Task Name    │  ops/sec  │ Average Time (ns)  │  Margin  │ Samples │
├─────────┼─────────────────┼───────────┼────────────────────┼──────────┼─────────┤
│    0    │ 'schema (good)' │ '340,533' │ 2936.5716941698306 │ '±0.76%' │ 340534  │
│    1    │  'zod (good)'   │ '558,944' │ 1789.0862294446451 │ '±0.24%' │ 558945  │
│    2    │ 'schema (bad)'  │ '309,645' │ 3229.500939833211  │ '±0.52%' │ 309646  │
│    3    │   'zod (bad)'   │ '108,605' │ 9207.643553834967  │ '±7.81%' │ 108606  │
└─────────┴─────────────────┴───────────┴────────────────────┴──────────┴─────────┘
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

const schema = Schema.struct({
  name: Schema.string.pipe(Schema.minLength(3), Schema.maxLength(20)),
  age: Schema.number.pipe(Schema.greaterThanOrEqualTo(0), Schema.lessThanOrEqualTo(120)),
  address: Schema.struct({
    street: Schema.string.pipe(Schema.minLength(3), Schema.maxLength(200)),
    number: Schema.number.pipe(Schema.greaterThanOrEqualTo(0), Schema.lessThanOrEqualTo(120)),
    city: Schema.string.pipe(Schema.minLength(3), Schema.maxLength(200)),
    country: Schema.string.pipe(Schema.minLength(3), Schema.maxLength(200)),
    zip: Schema.string.pipe(Schema.minLength(3), Schema.maxLength(200))
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

const parseEither = Schema.parseEither(schema)
const options: ParseOptions = { errors: "all" }

// console.log(UserZod.safeParse(good))
// console.log(parseEither(good))
// console.log(JSON.stringify(UserZod.safeParse(bad), null, 2))
// console.log(JSON.stringify(parseEither(bad), null, 2))

bench
  .add("schema (good)", function() {
    parseEither(good, options)
  })
  .add("zod (good)", function() {
    UserZod.safeParse(good)
  })
  .add("schema (bad)", function() {
    parseEither(bad, options)
  })
  .add("zod (bad)", function() {
    UserZod.safeParse(bad)
  })

await bench.run()

console.table(bench.table())
