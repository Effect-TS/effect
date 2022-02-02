// ets_tracing: off

import * as C from "../../Cause/index.js"
import * as A from "../../Collections/Immutable/Chunk/index.js"
import * as Tp from "../../Collections/Immutable/Tuple/index.js"
import * as E from "../../Either/index.js"
import * as Ex from "../../Exit/index.js"
import * as F from "../../Fiber/index.js"
import { identity, pipe } from "../../Function/index.js"
import * as O from "../../Option/index.js"
import * as RefM from "../../RefM/index.js"
import * as T from "../_internal/effect.js"
import * as M from "../_internal/managed.js"
import * as H from "../Handoff/index.js"
import type * as Pull from "../Pull/index.js"
import * as TK from "../Take/index.js"
import { Stream } from "./definitions.js"

export type TerminationStrategy = "Left" | "Right" | "Both" | "Either"

/**
 * Merges this stream and the specified stream together to a common element
 * type with the specified mapping functions.
 *
 * New produced stream will terminate when both specified stream terminate if
 * no termination strategy is specified.
 *
 * @ets_data_first mergeWith_
 */
export function mergeWith<R1, E1, B, A, C, C1>(
  that: Stream<R1, E1, B>,
  l: (a: A) => C,
  r: (b: B) => C1,
  strategy: TerminationStrategy = "Both"
) {
  return <R, E>(self: Stream<R, E, A>): Stream<R1 & R, E | E1, C | C1> =>
    mergeWith_(self, that, l, r, strategy)
}

/**
 * Merges this stream and the specified stream together to a common element
 * type with the specified mapping functions.
 *
 * New produced stream will terminate when both specified stream terminate if
 * no termination strategy is specified.
 */
export function mergeWith_<R, E, R1, E1, B, A, C, C1>(
  self: Stream<R, E, A>,
  that: Stream<R1, E1, B>,
  l: (a: A) => C,
  r: (b: B) => C1,
  strategy: TerminationStrategy = "Both"
): Stream<R1 & R, E | E1, C | C1> {
  return new Stream(
    pipe(
      M.do,
      M.bind("handoff", () => M.fromEffect(H.make<TK.Take<E | E1, C | C1>>())),
      M.bind("done", () => M.fromEffect(RefM.makeRefM<O.Option<boolean>>(O.none))),
      M.bind("chunksL", () => self.proc),
      M.bind("chunksR", () => that.proc),
      M.let(
        "handler",
        ({ done, handoff }) =>
          (pull: Pull.Pull<R & R1, E | E1, C | C1>, terminate: boolean) =>
            pipe(
              done.get,
              T.chain((o) => {
                if (o._tag === "Some" && o.value) {
                  return T.succeed(false)
                } else {
                  return pipe(
                    pull,
                    T.result,
                    T.chain((exit) =>
                      pipe(
                        done,
                        RefM.modify((o) => {
                          const causeOrChunk = pipe(
                            exit,
                            Ex.fold(
                              (
                                c
                              ): E.Either<O.Option<C.Cause<E | E1>>, A.Chunk<C | C1>> =>
                                E.left(C.sequenceCauseOption(c)),
                              E.right
                            )
                          )

                          if (o._tag === "Some" && o.value) {
                            return T.succeed(Tp.tuple(false, o))
                          } else if (causeOrChunk._tag === "Right") {
                            return pipe(
                              H.offer_(
                                handoff,
                                <TK.Take<E | E1, C | C1>>TK.chunk(causeOrChunk.right)
                              ),
                              T.as(Tp.tuple(true, o))
                            )
                          } else if (
                            causeOrChunk._tag === "Left" &&
                            causeOrChunk.left._tag === "Some"
                          ) {
                            return pipe(
                              H.offer_(
                                handoff,
                                <TK.Take<E | E1, C | C1>>(
                                  TK.halt(causeOrChunk.left.value)
                                )
                              ),
                              T.as(Tp.tuple(false, O.some(true)))
                            )
                          } else if (
                            causeOrChunk._tag === "Left" &&
                            causeOrChunk.left._tag === "None" &&
                            (terminate || o._tag === "Some")
                          ) {
                            return pipe(
                              H.offer_(handoff, <TK.Take<E | E1, C | C1>>TK.end),
                              T.as(Tp.tuple(false, O.some(true)))
                            )
                          } else {
                            return T.succeed(Tp.tuple(false, O.some(false)))
                          }
                        })
                      )
                    )
                  )
                }
              }),
              T.repeatWhile(identity),
              T.fork,
              T.interruptible,
              T.toManagedRelease(F.interrupt)
            )
      ),
      M.tap(({ chunksL, handler }) =>
        handler(
          pipe(chunksL, T.map(A.map(l))),
          strategy === "Left" || strategy === "Either"
        )
      ),
      M.tap(({ chunksR, handler }) =>
        handler(
          pipe(chunksR, T.map(A.map(r))),
          strategy === "Right" || strategy === "Either"
        )
      ),
      M.map(({ done, handoff }) =>
        pipe(
          T.do,
          T.bind("done", () => done.get),
          T.bind("take", (s) =>
            s.done._tag === "Some" && s.done.value
              ? pipe(handoff, H.poll, T.some)
              : pipe(handoff, H.take)
          ),
          T.bind("result", ({ take }) => TK.done(take)),
          T.map(({ result }) => result)
        )
      )
    )
  )
}
