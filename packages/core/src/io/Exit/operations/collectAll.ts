import { pipe } from "@fp-ts/data/Function"
import * as List from "@fp-ts/data/List"
import * as Option from "@fp-ts/data/Option"
import * as ReadonlyArray from "@fp-ts/data/ReadonlyArray"

/**
 * @tsplus static effect/core/io/Exit.Ops collectAll
 * @category constructors
 * @since 1.0.0
 */
export function collectAll<E, A>(
  exits: Iterable<Exit<E, A>>
): Option.Option<Exit<E, List.List<A>>> {
  const array = Array.from(exits)
  if (array.length === 0) {
    return Option.none
  }
  const head = array[0]!
  const tail = array.slice(1)
  return Option.some(
    pipe(
      tail,
      ReadonlyArray.reduce(head.map(List.of), (accumulator, current) =>
        accumulator.zipWith(
          current,
          (list, value) => pipe(list, List.prepend(value)),
          (causeA, causeB) => Cause.then(causeA, causeB)
        ))
    ).map(List.reverse)
  )
}
