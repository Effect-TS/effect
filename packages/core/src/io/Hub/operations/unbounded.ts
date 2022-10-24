import { makeHub } from "@effect/core/io/Hub/operations/_internal/makeHub"
import { makeUnbounded } from "@effect/core/io/Hub/operations/_internal/makeUnbounded"
import { Strategy } from "@effect/core/io/Hub/operations/strategy"

/**
 * Creates an unbounded hub.
 *
 * @tsplus static effect/core/io/Hub.Ops unbounded
 * @category constructors
 * @since 1.0.0
 */
export function unbounded<A>(): Effect<never, never, Hub<A>> {
  return Effect.sync(makeUnbounded<A>()).flatMap((atomicHub) =>
    makeHub(atomicHub, Strategy.Dropping())
  )
}
