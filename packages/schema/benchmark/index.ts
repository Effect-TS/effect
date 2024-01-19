import type { ParseOptions } from "@effect/schema/AST"
import * as ParseResult from "@effect/schema/ParseResult"
import * as S from "@effect/schema/Schema"
import { Bench } from "tinybench"
import { z } from "zod"

/*
┌─────────┬──────────────────────────────────┬───────────┬────────────────────┬──────────┬─────────┐
│ (index) │            Task Name             │  ops/sec  │ Average Time (ns)  │  Margin  │ Samples │
├─────────┼──────────────────────────────────┼───────────┼────────────────────┼──────────┼─────────┤
│    0    │   'Schema.parseEither (good)'    │ '130,306' │ 7674.228477495592  │ '±7.61%' │ 130307  │
│    1    │ 'ParseResult.parseEither (good)' │ '151,387' │ 6605.554570212346  │ '±0.53%' │ 151388  │
│    2    │           'zod (good)'           │ '216,190' │ 4625.557899766241  │ '±0.57%' │ 216191  │
│    3    │    'Schema.parseEither (bad)'    │ '38,477'  │  25989.2171476021  │ '±0.42%' │  38478  │
│    4    │ 'ParseResult.parseEither (bad)'  │ '119,583' │ 8362.342247374083  │ '±0.90%' │ 119584  │
│    5    │           'zod (bad)'            │ '59,241'  │ 16880.113437179694 │ '±3.70%' │  59242  │
└─────────┴──────────────────────────────────┴───────────┴────────────────────┴──────────┴─────────┘
*/

const bench = new Bench({ time: 1000 })

const Vector = S.tuple(S.number, S.number, S.number)
const VectorZod = z.tuple([z.number(), z.number(), z.number()])

const Asteroid = S.struct({
  type: S.literal("asteroid"),
  location: Vector,
  mass: S.number
})
const AsteroidZod = z.object({
  type: z.literal("asteroid"),
  location: VectorZod,
  mass: z.number()
})

const Planet = S.struct({
  type: S.literal("planet"),
  location: Vector,
  mass: S.number,
  population: S.number,
  habitable: S.boolean
})
const PlanetZod = z.object({
  type: z.literal("planet"),
  location: VectorZod,
  mass: z.number(),
  population: z.number(),
  habitable: z.boolean()
})

const Rank = S.union(
  S.literal("captain"),
  S.literal("first mate"),
  S.literal("officer"),
  S.literal("ensign")
)
const RankZod = z.union([
  z.literal("captain"),
  z.literal("first mate"),
  z.literal("officer"),
  z.literal("ensign")
])

const CrewMember = S.struct({
  name: S.string,
  age: S.number,
  rank: Rank,
  home: Planet
})
const CrewMemberZod = z.object({
  name: z.string(),
  age: z.number(),
  rank: RankZod,
  home: PlanetZod
})

const Ship = S.struct({
  type: S.literal("ship"),
  location: Vector,
  mass: S.number,
  name: S.string,
  crew: S.array(CrewMember)
})
const ShipZod = z.object({
  type: z.literal("ship"),
  location: VectorZod,
  mass: z.number(),
  name: z.string(),
  crew: z.array(CrewMemberZod)
})

export const schema = S.union(Asteroid, Planet, Ship)
export const schemaZod = z.discriminatedUnion("type", [AsteroidZod, PlanetZod, ShipZod])

const good = {
  type: "ship",
  location: [1, 2, 3],
  mass: 4,
  name: "foo",
  crew: [
    {
      name: "bar",
      age: 44,
      rank: "captain",
      home: {
        type: "planet",
        location: [5, 6, 7],
        mass: 8,
        population: 1000,
        habitable: true
      }
    }
  ]
}

const bad = {
  type: "ship",
  location: [1, 2, "a"],
  mass: 4,
  name: "foo",
  crew: [
    {
      name: "bar",
      age: 44,
      rank: "captain",
      home: {
        type: "planet",
        location: [5, 6, 7],
        mass: 8,
        population: "a",
        habitable: true
      }
    }
  ]
}

export const schemaParseEither = S.parseEither(schema)
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
    schemaZod.safeParse(bad)
  })

await bench.run()

console.table(bench.table())
