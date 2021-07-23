// ets_tracing: off

import * as A from "../../Collections/Immutable/Chunk"
import * as Tp from "../../Collections/Immutable/Tuple"
import { pipe } from "../../Function"
import type * as O from "../../Option"
import * as T from "../_internal/effect"
import * as F from "../_internal/fiber"
import * as M from "../_internal/managed"
import * as Ref from "../_internal/ref"
import * as chain from "./chain"
import * as concat from "./concat"
import { Stream } from "./definitions"
import { fromChunk } from "./fromChunk"
import { fromEffect } from "./fromEffect"
import { fromEffectOption } from "./fromEffectOption"
import * as mergeWith from "./mergeWith"
import { repeatEffectOption } from "./repeatEffectOption"

function pullNonEmpty<R, E, Out>(
  pull: T.Effect<R, E, A.Chunk<Out>>
): T.Effect<R, E, A.Chunk<Out>> {
  return T.chain_(pull, (chunk) =>
    A.isEmpty(chunk) ? pullNonEmpty(pull) : T.succeed(chunk)
  )
}

/**
 * Zips the two streams so that when a value is emitted by either of the two streams,
 * it is combined with the latest value from the other stream to produce a result.
 *
 * Note: tracking the latest value is done on a per-chunk basis. That means that
 * emitted elements that are not the last value in chunks will never be used for zipping.
 */
export function zipWithLatest<R, R1, E, E1, O, O2>(
  self: Stream<R, E, O>,
  that: Stream<R1, E1, O2>
) {
  return <O3>(f: (o: O, o2: O2) => O3): Stream<R & R1, E | E1, O3> =>
    new Stream(
      pipe(
        M.do,
        M.bind("left", () => M.map_(self.proc, pullNonEmpty)),
        M.bind("right", () => M.map_(that.proc, pullNonEmpty)),
        M.bind(
          "pull",
          ({ left, right }) =>
            pipe(
              fromEffectOption(
                T.raceWith_(
                  left as T.Effect<R & R1, O.Option<E | E1>, A.Chunk<O>>,
                  right,
                  (leftDone, rightFiber) =>
                    pipe(
                      T.done(leftDone),
                      T.zipWith(F.join(rightFiber), (a, b) => Tp.tuple(a, b, true))
                    ),
                  (rightDone, leftFiber) =>
                    pipe(
                      T.done(rightDone),
                      T.zipWith(F.join(leftFiber), (r, l) => Tp.tuple(l, r, false))
                    )
                )
              ),
              chain.chain(({ tuple: [l, r, leftFirst] }) =>
                pipe(
                  fromEffect(
                    T.zip_(
                      Ref.makeRef(A.unsafeGet_(l, A.size(l) - 1)),
                      Ref.makeRef(A.unsafeGet_(r, A.size(r) - 1))
                    )
                  ),
                  chain.chain(({ tuple: [latestLeft, latestRight] }) =>
                    pipe(
                      fromChunk(
                        leftFirst
                          ? A.map_(r, (_) => f(A.unsafeGet_(l, A.size(l) - 1)!, _))
                          : A.map_(l, (_) => f(_, A.unsafeGet_(r, A.size(r) - 1)!))
                      ),
                      concat.concat(
                        pipe(
                          repeatEffectOption(
                            pipe(
                              left,
                              T.tap((chunk) =>
                                latestLeft.set(A.unsafeGet_(chunk, A.size(chunk) - 1))
                              ),
                              T.zip(latestRight.get)
                            )
                          ),
                          mergeWith.mergeWith(
                            repeatEffectOption(
                              pipe(
                                right,
                                T.tap((chunk) =>
                                  latestRight.set(
                                    A.unsafeGet_(chunk, A.size(chunk) - 1)
                                  )
                                ),
                                T.zip(latestLeft.get)
                              )
                            ),
                            ({ tuple: [leftChunk, rightLatest] }) =>
                              A.map_(leftChunk, (_) => f(_, rightLatest!)),
                            ({ tuple: [rightChunk, leftLatest] }) =>
                              A.map_(rightChunk, (_) => f(leftLatest!, _))
                          ),
                          chain.chain(fromChunk)
                        )
                      )
                    )
                  )
                )
              )
            ).proc
        ),
        M.map(({ pull }) => pull)
      )
    )
}
