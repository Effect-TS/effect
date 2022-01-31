// ets_tracing: off

import "../../Operator/index.js"

import type { Cause } from "../../Cause/index.js"
import * as A from "../../Collections/Immutable/Chunk/index.js"
import * as Tp from "../../Collections/Immutable/Tuple/index.js"
import * as E from "../../Either/index.js"
import { pipe } from "../../Function/index.js"
import type * as O from "../../Option/index.js"
import * as T from "../_internal/effect.js"
import * as M from "../_internal/managed.js"
import * as R from "../_internal/ref.js"

export interface Push<R, E, I, L, Z> {
  (_: O.Option<A.Chunk<I>>): T.Effect<R, Tp.Tuple<[E.Either<E, Z>, A.Chunk<L>]>, void>
}

export function emit<I, Z>(
  z: Z,
  leftover: A.Chunk<I>
): T.IO<Tp.Tuple<[E.Either<never, Z>, A.Chunk<I>]>, never> {
  return T.fail(Tp.tuple(E.right(z), leftover))
}

export function fail<E, I>(
  e: E,
  leftover: A.Chunk<I>
): T.IO<Tp.Tuple<[E.Either<E, never>, A.Chunk<I>]>, never> {
  return T.fail(Tp.tuple(E.left(e), leftover))
}

export function halt<E>(
  c: Cause<E>
): T.IO<Tp.Tuple<[E.Either<E, never>, A.Chunk<never>]>, never> {
  return T.mapError_(T.halt(c), (e) => Tp.tuple(E.left(e), A.empty()))
}

export const more = T.unit

/**
 * Decorates a Push with a Effect value that re-initializes it with a fresh state.
 */
export function restartable<R, R1, E, I, L, Z>(
  sink: M.Managed<R, never, Push<R1, E, I, L, Z>>
): M.Managed<R, never, Tp.Tuple<[Push<R1, E, I, L, Z>, T.Effect<R, never, void>]>> {
  return pipe(
    M.do,
    M.bind("switchSink", () => M.switchable<R, never, Push<R1, E, I, L, Z>>()),
    M.bind("initialSink", ({ switchSink }) => T.toManaged(switchSink(sink))),
    M.bind("currSink", ({ initialSink }) => T.toManaged(R.makeRef(initialSink))),
    M.map(({ currSink, switchSink }) => {
      const restart = T.chain_(switchSink(sink), currSink.set)
      const newPush = (input: O.Option<A.Chunk<I>>) =>
        T.chain_(currSink.get, (f) => f(input))

      return Tp.tuple(newPush, restart)
    })
  )
}
