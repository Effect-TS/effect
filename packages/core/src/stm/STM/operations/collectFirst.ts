import type { Option } from "@fp-ts/data/Option"

/**
 * Collects the first element of the `Collection<A?` for which the effectual
 * function `f` returns `Some`.
 *
 * @tsplus static effect/core/stm/STM.Ops collectFirst
 * @category constructors
 * @since 1.0.0
 */
export function collectFirst<R, E, A, B>(
  as: Iterable<A>,
  f: (a: A) => STM<R, E, Option<B>>
): STM<R, E, Option<B>> {
  return STM.suspend(loop(as[Symbol.iterator](), f))
}

function loop<R, E, A, B>(
  iterator: Iterator<A, any, undefined>,
  f: (a: A) => STM<R, E, Option<B>>
): STM<R, E, Option<B>> {
  const next = iterator.next()
  return next.done
    ? STM.none
    : f(next.value).flatMap((option) => {
      switch (option._tag) {
        case "None": {
          return loop(iterator, f)
        }
        case "Some": {
          return STM.some(option.value)
        }
      }
    })
}
