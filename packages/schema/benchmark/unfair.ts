import { Bench } from "tinybench"
import { z } from "zod"
import type { ParseOptions } from "../src/AST.js"
import * as P from "../src/Parser.js"
import * as t from "../src/Schema.js"

/*
┌─────────┬──────────────────────┬───────────┬───────────────────┬──────────┬─────────┐
│ (index) │      Task Name       │  ops/sec  │ Average Time (ns) │  Margin  │ Samples │
├─────────┼──────────────────────┼───────────┼───────────────────┼──────────┼─────────┤
│    0    │ 'parseEither (good)' │ '138,746' │ 7207.384160841943 │ '±0.77%' │ 138747  │
│    1    │     'zod (good)'     │ '38,164'  │ 26202.45955897146 │ '±2.14%' │  38165  │
│    2    │ 'parseEither (bad)'  │ '528,860' │ 1890.858355466343 │ '±0.72%' │ 528861  │
│    3    │     'zod (bad)'      │ '10,251'  │ 97544.71922125429 │ '±3.71%' │  10252  │
└─────────┴──────────────────────┴───────────┴───────────────────┴──────────┴─────────┘
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
export const schemaZod = z.union([AsteroidZod, PlanetZod, ShipZod]) // unfair: no discriminated union

export const parseEither = P.parseEither(schema)
const options: ParseOptions = { errors: "first" } // unfair: "first" instead of "all"

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
        population: 1000,
        habitable: "true" // unfair: take advantage of /schema's "sort fields by weight" internal feature
      }
    }
  ]
}

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

await bench.run()

console.table(bench.table())
