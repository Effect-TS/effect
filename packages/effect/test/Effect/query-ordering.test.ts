import { Data, Effect, ReadonlyArray, Request, RequestResolver } from "effect"
import * as it from "effect-test/utils/extend"
import { gql, GraphQLClient } from "graphql-request"
import { describe, expect } from "vitest"

export class PokemonError extends Data.TaggedError("PokemonError")<{
  readonly message: string
}> {}

export class Pokemon extends Data.Class<{
  readonly id: number
  readonly name: string
}> {}

const client = new GraphQLClient("https://beta.pokeapi.co/graphql/v1beta")

const query = <A = unknown>(document: string, variables?: Record<string, any>) =>
  Effect.tryPromise({
    try: (signal) =>
      client.request<A, any>({
        document,
        variables,
        signal
      }),
    catch: (error) => new PokemonError({ message: String(error) })
  })

const pokemonById = gql`
    query pokemonById($ids: [Int!]!) {
      pokemon_v2_pokemon(where: { id: { _in: $ids } }) {
        id
        name
      }
    }
  `
const getByIds = (ids: ReadonlyArray<number>) =>
  query(pokemonById, { ids }).pipe(
    Effect.map((_) => (_ as any).pokemon_v2_pokemon as ReadonlyArray<Pokemon>),
    Effect.map((pokemon) => pokemon.map((args) => new Pokemon(args)))
  )

class GetPokemonById extends Request.TaggedClass("GetPokemonById")<
  PokemonError,
  Pokemon,
  { id: number }
> {}

const resolver: RequestResolver.RequestResolver<GetPokemonById, never> = RequestResolver.fromEffectTagged<
  GetPokemonById
>()({
  GetPokemonById: (requests) => getByIds(requests.map((_) => _.id))
})

const getPokemonById = (id: number) => Effect.request(new GetPokemonById({ id }), resolver)

describe("Request", () => {
  it.effect("should return results in the proper order", () =>
    Effect.gen(function*(_) {
      const pokemon = yield* _(
        Effect.forEach(ReadonlyArray.range(1, 5), getPokemonById, {
          batching: true
        })
      )

      console.log(pokemon)

      expect(pokemon).toEqual([
        new Pokemon({ id: 1, name: "bulbasaur" }),
        new Pokemon({ id: 2, name: "ivysaur" }),
        new Pokemon({ id: 3, name: "venusaur" }),
        new Pokemon({ id: 4, name: "charmander" }),
        new Pokemon({ id: 5, name: "charmeleon" })
      ])
    }))
})
