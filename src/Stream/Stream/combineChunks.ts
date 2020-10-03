import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import type * as Array from "../../Array"
import type * as Exit from "../../Exit/api"
import { pipe } from "../../Function"
import type * as Option from "../../Option"
import { Stream } from "./definitions"
import { unfoldChunkM } from "./unfoldChunkM"

/**
 * Combines the chunks from this stream and the specified stream by repeatedly applying the
 * function `f` to extract a chunk using both sides and conceptually "offer"
 * it to the destination stream. `f` can maintain some internal state to control
 * the combining process, with the initial state being specified by `s`.
 */
export const combineChunks = <R1, E1, O2, Z, R, E, O, O3>(
  that: Stream<R1, E1, O2>,
  z: Z,
  f: (
    z: Z,
    s: T.Effect<R, Option.Option<E>, Array.Array<O>>,
    t: T.Effect<R1, Option.Option<E1>, Array.Array<O2>>
  ) => T.Effect<
    R & R1,
    never,
    Exit.Exit<Option.Option<E | E1>, readonly [Array.Array<O3>, Z]>
  >
) => (self: Stream<R, E, O>): Stream<R & R1, E1 | E, O3> =>
  new Stream(
    pipe(
      M.do,
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
