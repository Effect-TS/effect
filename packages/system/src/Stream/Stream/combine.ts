import * as T from "../../Effect"
import type * as Ex from "../../Exit"
import { pipe } from "../../Function"
import * as M from "../../Managed"
import type * as O from "../../Option"
import * as BP from "../../Stream/BufferedPull"
import { Stream } from "./definitions"
import { unfoldM } from "./unfoldM"

/**
 * Combines the elements from this stream and the specified stream by repeatedly applying the
 * function `f` to extract an element using both sides and conceptually "offer"
 * it to the destination stream. `f` can maintain some internal state to control
 * the combining process, with the initial state being specified by `s`.
 *
 * Where possible, prefer [[Stream#combineChunks]] for a more efficient implementation.
 */
export function combine<R1, E1, O2>(that: Stream<R1, E1, O2>) {
  return <S>(s: S) => <R, E, O, O3>(
    f: (
      s: S,
      a: T.Effect<R, O.Option<E>, O>,
      b: T.Effect<R1, O.Option<E1>, O2>
    ) => T.Effect<R1, never, Ex.Exit<O.Option<E | E1>, readonly [O3, S]>>
  ) => (self: Stream<R, E, O>): Stream<R1 & R, E | E1, O3> =>
    new Stream(
      pipe(
        M.do,
        M.bind("left", () => M.mapM_(self.proc, (_) => BP.make<R, E, O>(_))),
        M.bind("right", () => M.mapM_(that.proc, (_) => BP.make<R1, E1, O2>(_))),
        M.bind(
          "pull",
          ({ left, right }) =>
            unfoldM(s)((s) =>
              T.chain_(f(s, BP.pullElement(left), BP.pullElement(right)), (_) =>
                T.optional(T.done(_))
              )
            ).proc
        ),
        M.map(({ pull }) => pull)
      )
    )
}
