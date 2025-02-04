import * as ParseResult from "effect/ParseResult"
import * as S from "effect/Schema"
import type { ParseOptions } from "effect/SchemaAST"
import { Bench } from "tinybench"
import { z } from "zod"

/*
┌─────────┬──────────────────────────────────────────┬───────────┬────────────────────┬──────────┬─────────┐
│ (index) │ Task Name                                │ ops/sec   │ Average Time (ns)  │ Margin   │ Samples │
├─────────┼──────────────────────────────────────────┼───────────┼────────────────────┼──────────┼─────────┤
│ 0       │ 'Schema.decodeUnknownEither (good)'      │ '509,149' │ 1964.061260925078  │ '±1.79%' │ 509150  │
│ 1       │ 'ParseResult.decodeUnknownEither (good)' │ '533,211' │ 1875.429060111383  │ '±0.29%' │ 533212  │
│ 2       │ 'zod (good)'                             │ '678,945' │ 1472.8725318364138 │ '±0.25%' │ 678946  │
│ 3       │ 'Schema.decodeUnknownEither (bad)'       │ '150,067' │ 6663.685855746499  │ '±0.15%' │ 150068  │
│ 4       │ 'ParseResult.decodeUnknownEither (bad)'  │ '435,462' │ 2296.4078417675796 │ '±0.32%' │ 435463  │
│ 5       │ 'zod (bad)'                              │ '252,755' │ 3956.3951281064533 │ '±2.17%' │ 252756  │
└─────────┴──────────────────────────────────────────┴───────────┴────────────────────┴──────────┴─────────┘
*/

const bench = new Bench({ time: 1000 })

const Vector = S.Tuple(S.Number, S.Number, S.Number)
const VectorZod = z.tuple([z.number(), z.number(), z.number()])

const Asteroid = S.Struct({
  type: S.Literal("asteroid"),
  location: Vector,
  mass: S.Number
})
const AsteroidZod = z.object({
  type: z.literal("asteroid"),
  location: VectorZod,
  mass: z.number()
})

const Planet = S.Struct({
  type: S.Literal("planet"),
  location: Vector,
  mass: S.Number,
  population: S.Number,
  habitable: S.Boolean
})
const PlanetZod = z.object({
  type: z.literal("planet"),
  location: VectorZod,
  mass: z.number(),
  population: z.number(),
  habitable: z.boolean()
})

const Rank = S.Union(
  S.Literal("captain"),
  S.Literal("first mate"),
  S.Literal("officer"),
  S.Literal("ensign")
)
const RankZod = z.union([
  z.literal("captain"),
  z.literal("first mate"),
  z.literal("officer"),
  z.literal("ensign")
])

const CrewMember = S.Struct({
  name: S.String,
  age: S.Number,
  rank: Rank,
  home: Planet
})
const CrewMemberZod = z.object({
  name: z.string(),
  age: z.number(),
  rank: RankZod,
  home: PlanetZod
})

const Ship = S.Struct({
  type: S.Literal("ship"),
  location: Vector,
  mass: S.Number,
  name: S.String,
  crew: S.Array(CrewMember)
})
const ShipZod = z.object({
  type: z.literal("ship"),
  location: VectorZod,
  mass: z.number(),
  name: z.string(),
  crew: z.array(CrewMemberZod)
})

export const schema = S.Union(Asteroid, Planet, Ship)
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

export const schemaDecodeUnknownEither = S.decodeUnknownEither(schema)
export const parseResultDecodeUnknownEither = ParseResult.decodeUnknownEither(schema)
const options: ParseOptions = { errors: "all" }

bench
  .add("Schema.decodeUnknownEither (good)", function() {
    schemaDecodeUnknownEither(good, options)
  })
  .add("ParseResult.decodeUnknownEither (good)", function() {
    parseResultDecodeUnknownEither(good, options)
  })
  .add("zod (good)", function() {
    schemaZod.safeParse(good)
  })
  .add("Schema.decodeUnknownEither (bad)", function() {
    schemaDecodeUnknownEither(bad, options)
  })
  .add("ParseResult.decodeUnknownEither (bad)", function() {
    parseResultDecodeUnknownEither(bad, options)
  })
  .add("zod (bad)", function() {
    schemaZod.safeParse(bad)
  })

await bench.run()

console.table(bench.table())
