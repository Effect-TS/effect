import { Bench } from "tinybench"
import { z } from "zod"
import type { ParseOptions } from "../src/AST.js"
import * as P from "../src/Parser.js"
import * as t from "../src/Schema.js"

/*
┌─────────┬──────────────────────┬───────────┬───────────────────┬───────────┬─────────┐
│ (index) │      Task Name       │  ops/sec  │ Average Time (ns) │  Margin   │ Samples │
├─────────┼──────────────────────┼───────────┼───────────────────┼───────────┼─────────┤
│    0    │ 'parseEither (good)' │ '150,586' │ 6640.714005254174 │ '±0.73%'  │ 150587  │
│    1    │     'zod (good)'     │ '212,371' │ 4708.722572530713 │ '±0.57%'  │ 212372  │
│    2    │ 'parseEither (bad)'  │ '130,028' │ 7690.645276174016 │ '±0.57%'  │ 130029  │
│    3    │     'zod (bad)'      │ '56,463'  │ 17710.45249230275 │ '±10.43%' │  56465  │
│    4    │ 'parseEither (bad2)' │ '152,362' │  6563.3090290069  │ '±0.55%'  │ 152363  │
│    5    │     'zod (bad2)'     │ '211,165' │ 4735.626160980493 │ '±0.59%'  │ 211166  │
└─────────┴──────────────────────┴───────────┴───────────────────┴───────────┴─────────┘
*/

const bench = new Bench({ time: 1000 })

const Vector = t.tuple(t.number, t.number, t.number)
const VectorZod = z.tuple([z.number(), z.number(), z.number()])

const Asteroid = t.struct({
  type: t.literal("asteroid"),
  location: Vector,
  mass: t.number
})
const AsteroidZod = z.object({
  type: z.literal("asteroid"),
  location: VectorZod,
  mass: z.number()
})

const Planet = t.struct({
  type: t.literal("planet"),
  location: Vector,
  mass: t.number,
  population: t.number,
  habitable: t.boolean
})
const PlanetZod = z.object({
  type: z.literal("planet"),
  location: VectorZod,
  mass: z.number(),
  population: z.number(),
  habitable: z.boolean()
})

const Rank = t.union(
  t.literal("captain"),
  t.literal("first mate"),
  t.literal("officer"),
  t.literal("ensign")
)
const RankZod = z.union([
  z.literal("captain"),
  z.literal("first mate"),
  z.literal("officer"),
  z.literal("ensign")
])

const CrewMember = t.struct({
  name: t.string,
  age: t.number,
  rank: Rank,
  home: Planet
})
const CrewMemberZod = z.object({
  name: z.string(),
  age: z.number(),
  rank: RankZod,
  home: PlanetZod
})

const Ship = t.struct({
  type: t.literal("ship"),
  location: Vector,
  mass: t.number,
  name: t.string,
  crew: t.array(CrewMember)
})
const ShipZod = z.object({
  type: z.literal("ship"),
  location: VectorZod,
  mass: z.number(),
  name: z.string(),
  crew: z.array(CrewMemberZod)
})

export const schema = t.union(Asteroid, Planet, Ship)
export const schemaZod = z.discriminatedUnion("type", [AsteroidZod, PlanetZod, ShipZod])

export const parseEither = P.parseEither(schema)
const options: ParseOptions = { errors: "all" }

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

const bad2 = {
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
  ],
  excess: 1
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
    schemaZod.safeParse(bad)
  })
  .add("parseEither (bad2)", function() {
    parseEither(bad2, options)
  })
  .add("zod (bad2)", function() {
    schemaZod.safeParse(bad2)
  })

await bench.run()

console.table(bench.table())
