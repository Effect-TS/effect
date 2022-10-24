import type { Option } from "@fp-ts/data/Option"

/**
 * Lifts an `Maybe` into an `Effect`. If the option is not defined, fail with
 * the specified `e` value.
 *
 * @tsplus static effect/core/io/Effect.Ops getOrFailWith
 * @category conversions
 * @since 1.0.0
 */
export function getOrFailWith<E, A>(option: Option<A>, e: LazyArg<E>): Effect<never, E, A> {
  switch (option._tag) {
    case "None": {
      return Effect.failSync(e)
    }
    case "Some": {
      return Effect.succeed(option.value)
    }
  }
}
