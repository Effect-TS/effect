import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import type * as A from "../../Array"
import type * as Exit from "../../Exit/api"
import { pipe } from "../../Function"
import * as O from "../../Option"
import { Stream } from "./definitions"
import { unfoldChunkM } from "./unfoldChunkM"

/**
 * Combines the chunks from this stream and the specified stream by repeatedly applying the
 * function `f` to extract a chunk using both sides and conceptually "offer"
 * it to the destination stream. `f` can maintain some internal state to control
 * the combining process, with the initial state being specified by `s`.
 */
export const combineChunks = <S1, R1, E1, O2>(that: Stream<S1, R1, E1, O2>) => <Z>(
  z: Z
) => <S, S2, R, E, O, O3>(
  f: (
    z: Z,
    s: T.Effect<S, R, O.Option<E>, A.Array<O>>,
    t: T.Effect<S1, R1, O.Option<E1>, A.Array<O2>>
  ) => T.Effect<
    S2,
    R & R1,
    never,
    Exit.Exit<O.Option<E | E1>, readonly [A.Array<O3>, Z]>
  >
) => (self: Stream<S, R, E, O>): Stream<S1 | S | S2, R & R1, E1 | E, O3> =>
  new Stream(
    pipe(
      M.of,
      M.bind("left", () => self.proc),
      M.bind("right", () => that.proc),
      M.bind(
        "pull",
        ({ left, right }) =>
          unfoldChunkM(z)((z) =>
            pipe(
              f(z, left, right),
              T.chain((ex) => T.optional(T.done(ex)))
            )
          ).proc
      ),
      M.map(({ pull }) => pull)
    )
  )
