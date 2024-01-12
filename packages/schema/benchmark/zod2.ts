import { Bench } from "tinybench"
import { z } from "zod"
import type { ParseOptions } from "../src/AST.js"
import * as Schema from "../src/Schema.js"

/*
┌─────────┬─────────────────┬─────────────┬───────────────────┬───────────┬─────────┐
│ (index) │    Task Name    │   ops/sec   │ Average Time (ns) │  Margin   │ Samples │
├─────────┼─────────────────┼─────────────┼───────────────────┼───────────┼─────────┤
│    0    │ 'schema (good)' │  '751,419'  │ 1330.814624035134 │ '±11.99%' │ 751420  │
│    1    │  'zod (good)'   │ '1,534,425' │ 651.7096710372143 │ '±0.61%'  │ 1534426 │
│    2    │ 'schema (bad)'  │  '751,849'  │ 1330.053814391217 │ '±0.58%'  │ 751850  │
│    3    │   'zod (bad)'   │  '142,749'  │ 7005.278872942548 │ '±5.70%'  │ 142750  │
└─────────┴─────────────────┴─────────────┴───────────────────┴───────────┴─────────┘
*/

const bench = new Bench({ time: 1000 })

const UserZod = z.object({
  name: z.string().min(3).max(20),
  age: z.number().min(0).max(120)
})

const schema = Schema.struct({
  name: Schema.string.pipe(Schema.minLength(3), Schema.maxLength(20)),
  age: Schema.number.pipe(Schema.greaterThanOrEqualTo(0), Schema.lessThanOrEqualTo(120))
})

const good = {
  name: "Joe",
  age: 13
}

const bad = {
  name: "Jo",
  age: 13
}

const parseEither = Schema.parseEither(schema)
const options: ParseOptions = { errors: "all" }

// parseEither(good, options)
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
