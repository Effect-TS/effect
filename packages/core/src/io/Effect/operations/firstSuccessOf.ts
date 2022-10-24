import { pipe } from "@fp-ts/data/Function"
import * as List from "@fp-ts/data/List"

/**
 * Returns an effect that runs this effect and in case of failure, runs each
 * of the specified effects in order until one of them succeeds.
 *
 * @tsplus static effect/core/io/Effect.Ops firstSuccessOf
 * @category elements
 * @since 1.0.0
 */
export function firstSuccessOf<R, E, A>(effects: Iterable<Effect<R, E, A>>): Effect<R, E, A> {
  return Effect.suspendSucceed(() => {
    const list = List.fromIterable(effects)
    if (List.isNil(list)) {
      return Effect.dieSync(new IllegalArgumentException(`received empty collection of effects`))
    }
    return pipe(
      list.tail,
      List.reduce(list.head, (left, right) => left.orElse(right))
    )
  })
}
