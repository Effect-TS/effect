import * as Option from "@fp-ts/data/Option"

/**
 * Returns the first element that satisfies the effectful predicate.
 *
 * @tsplus static effect/core/io/Effect.Ops find
 * @category elements
 * @since 1.0.0
 */
export function find<R, E, A>(
  as: Iterable<A>,
  f: (a: A) => Effect<R, E, boolean>
): Effect<R, E, Option.Option<A>> {
  return Effect.suspendSucceed(() => {
    const array = Array.from(as)
    const iterator = array[Symbol.iterator]()
    let next: IteratorResult<A, any>
    next = iterator.next()
    const loop = (iterator: Iterator<A>, value: A): Effect<R, E, Option.Option<A>> => {
      return f(value).flatMap((result) => {
        if (result) {
          return Effect.succeed(Option.some(value))
        }
        if (!(next = iterator.next()).done) {
          return loop(iterator, next.value)
        }
        return Effect.succeed(Option.none)
      })
    }
    if (!next.done) {
      return loop(iterator, next.value)
    }
    return Effect.succeed(Option.none)
  })
}
