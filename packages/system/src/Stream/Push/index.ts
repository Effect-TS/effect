import type { Cause } from "../../Cause"
import * as A from "../../Chunk"
import * as E from "../../Either"
import { pipe } from "../../Function"
import type * as O from "../../Option"
import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import * as R from "../_internal/ref"

export interface Push<R, E, I, L, Z> {
  (_: O.Option<A.Chunk<I>>): T.Effect<R, readonly [E.Either<E, Z>, A.Chunk<L>], void>
}

export function emit<I, Z>(
  z: Z,
  leftover: A.Chunk<I>
): T.IO<[E.Either<never, Z>, A.Chunk<I>], never> {
  return T.fail([E.right(z), leftover])
}

export function fail<E, I>(
  e: E,
  leftover: A.Chunk<I>
): T.IO<[E.Either<E, never>, A.Chunk<I>], never> {
  return T.fail([E.left(e), leftover])
}

export function halt<E>(
  c: Cause<E>
): T.IO<[E.Either<E, never>, A.Chunk<never>], never> {
  return T.mapError_(T.halt(c), (e) => [E.left(e), A.empty])
}

export const more = T.unit

/**
 * Decorates a Push with a Effect value that re-initializes it with a fresh state.
 */
export function restartable<R, R1, E, I, L, Z>(
  sink: M.Managed<R, never, Push<R1, E, I, L, Z>>
): M.Managed<R, never, [Push<R1, E, I, L, Z>, T.Effect<R, never, void>]> {
  return pipe(
    M.do,
    M.bind("switchSink", () => M.switchable<R, never, Push<R1, E, I, L, Z>>()),
    M.bind("initialSink", ({ switchSink }) => T.toManaged_(switchSink(sink))),
    M.bind("currSink", ({ initialSink }) => T.toManaged_(R.makeRef(initialSink))),
    M.map(({ currSink, switchSink }) => {
      const restart = T.chain_(switchSink(sink), currSink.set)
      const newPush = (input: O.Option<A.Chunk<I>>) =>
        T.chain_(currSink.get, (f) => f(input))

      return [newPush, restart]
    })
  )
}
