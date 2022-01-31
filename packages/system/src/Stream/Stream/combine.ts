// ets_tracing: off

import type * as Tp from "../../Collections/Immutable/Tuple/index.js"
import type * as Ex from "../../Exit/index.js"
import { pipe } from "../../Function/index.js"
import type * as O from "../../Option/index.js"
import * as BP from "../../Stream/BufferedPull/index.js"
import * as T from "../_internal/effect.js"
import * as M from "../_internal/managed.js"
import { Stream } from "./definitions.js"
import { unfoldM } from "./unfoldM.js"

/**
 * Combines the elements from this stream and the specified stream by repeatedly applying the
 * function `f` to extract an element using both sides and conceptually "offer"
 * it to the destination stream. `f` can maintain some internal state to control
 * the combining process, with the initial state being specified by `s`.
 *
 * Where possible, prefer `Stream#combineChunks` for a more efficient implementation.
 */
export function combine_<R1, E1, O2, S, R, E, O, O3>(
  self: Stream<R, E, O>,
  that: Stream<R1, E1, O2>,
  s: S,
  f: (
    s: S,
    a: T.Effect<R, O.Option<E>, O>,
    b: T.Effect<R1, O.Option<E1>, O2>
  ) => T.Effect<R & R1, never, Ex.Exit<O.Option<E | E1>, Tp.Tuple<[O3, S]>>>
): Stream<R1 & R, E | E1, O3> {
  return new Stream(
    pipe(
      M.do,
      M.bind("left", () => M.mapM_(self.proc, (_) => BP.make<R, E, O>(_))),
      M.bind("right", () => M.mapM_(that.proc, (_) => BP.make<R1, E1, O2>(_))),
      M.bind(
        "pull",
        ({ left, right }) =>
          unfoldM(s, (s) =>
            T.chain_(f(s, BP.pullElement(left), BP.pullElement(right)), (_) =>
              T.optional(T.done(_))
            )
          ).proc
      ),
      M.map(({ pull }) => pull)
    )
  )
}

/**
 * Combines the elements from this stream and the specified stream by repeatedly applying the
 * function `f` to extract an element using both sides and conceptually "offer"
 * it to the destination stream. `f` can maintain some internal state to control
 * the combining process, with the initial state being specified by `s`.
 *
 * Where possible, prefer `Stream#combineChunks` for a more efficient implementation.
 *
 * @ets_data_first combine_
 */
export function combine<R1, E1, O2, S, R, E, O, O3>(
  that: Stream<R1, E1, O2>,
  s: S,
  f: (
    s: S,
    a: T.Effect<R, O.Option<E>, O>,
    b: T.Effect<R1, O.Option<E1>, O2>
  ) => T.Effect<R & R1, never, Ex.Exit<O.Option<E | E1>, Tp.Tuple<[O3, S]>>>
) {
  return (self: Stream<R, E, O>): Stream<R1 & R, E | E1, O3> =>
    combine_(self, that, s, f)
}
