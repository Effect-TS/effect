import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import * as List from "@fp-ts/data/List"
import type * as Option from "@fp-ts/data/Option"

/**
 * Transforms all elements of the chunk for as long as the specified partial
 * function is defined.
 *
 * @tsplus static effect/core/io/Effect.Ops collectWhile
 * @category constructors
 * @since 1.0.0
 */
export function collectWhile<A, R, E, B>(
  as: Iterable<A>,
  f: (a: A) => Option.Option<Effect<R, E, B>>
): Effect<R, E, Chunk.Chunk<B>> {
  const array = Array.from(as)
  // Break out early if the input is empty
  if (array.length === 0) {
    return Effect.succeed(Chunk.empty)
  }
  // Break out early if there is only one element in the list
  if (array.length === 1) {
    const option = f(array[0]!)
    switch (option._tag) {
      case "None": {
        return Effect.succeed(Chunk.empty)
      }
      case "Some": {
        return option.value.map(Chunk.single)
      }
    }
  }
  // Otherwise setup our intermediate result
  let result: Effect<R, E, List.List<B>> = Effect.succeed(List.empty())
  for (let i = array.length - 1; i >= 0; i--) {
    const option = f(array[i]!)
    switch (option._tag) {
      case "None": {
        return result.map(Chunk.fromIterable)
      }
      case "Some": {
        result = result.zipWith(option.value, (bs, b) => pipe(bs, List.prepend(b)))
      }
    }
  }
  return result.map(Chunk.fromIterable)
}
