import { pipe } from "@fp-ts/data/Function"
import * as HashSet from "@fp-ts/data/HashSet"
import * as List from "@fp-ts/data/List"
import * as Option from "@fp-ts/data/Option"

/**
 * Squashes a `Cause` down to a single defect, chosen to be the "most
 * important" defect.
 *
 * @tsplus static effect/core/io/Cause.Aspects squashWith
 * @tsplus pipeable effect/core/io/Cause squashWith
 * @category destructors
 * @since 1.0.0
 */
export function squashWith<E>(f: (e: E) => unknown) {
  return (self: Cause<E>): unknown =>
    pipe(
      self.failureOption,
      Option.map(f),
      Option.getOrElse(() => {
        if (self.isInterrupted) {
          const fibers = pipe(
            self.interruptors,
            HashSet.flatMap((fiberId) => pipe(fiberId.ids, HashSet.map((n) => `#${n}`))),
            HashSet.reduce("", (acc, id) => `${acc}, ${id}`)
          )
          return new InterruptedException(`Interrupted by fibers: ${fibers}`)
        }
        return pipe(
          self.defects,
          List.head,
          Option.getOrElse(new InterruptedException())
        )
      })
    )
}
