import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import * as R from "../_internal/ref"
import * as A from "../../Array"
import type { Cause } from "../../Cause"
import * as E from "../../Either"
import { pipe } from "../../Function"
import type * as O from "../../Option"

export type Push<R, E, I, L, Z> = (
  _: O.Option<A.Array<I>>
) => T.Effect<R, readonly [E.Either<E, Z>, A.Array<L>], void>

export function emit<I, Z>(
  z: Z,
  leftover: A.Array<I>
): T.IO<[E.Either<never, Z>, A.Array<I>], never> {
  return T.fail([E.right(z), leftover])
}

export const more = T.unit

export function fail<E, I>(
  e: E,
  leftover: A.Array<I>
): T.IO<[E.Either<E, never>, A.Array<I>], never> {
  return T.fail([E.left(e), leftover])
}

export function halt<E>(
  c: Cause<E>
): T.IO<[E.Either<E, never>, A.Array<never>], never> {
  return T.mapError_(T.halt(c), (e) => [E.left(e), A.empty])
}

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
      const newPush = (input: O.Option<A.Array<I>>) =>
        T.chain_(currSink.get, (f) => f(input))

      return [newPush, restart]
    })
  )
}
