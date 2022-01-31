// ets_tracing: off

import * as A from "../../Collections/Immutable/Chunk/index.js"
import * as Tp from "../../Collections/Immutable/Tuple/index.js"
import * as E from "../../Either/index.js"
import { pipe } from "../../Function/index.js"
import type * as O from "../../Option/index.js"
import * as T from "../_internal/effect.js"
import * as F from "../_internal/fiber.js"
import * as M from "../_internal/managed.js"
import * as Ref from "../_internal/ref.js"
import * as chain from "./chain.js"
import * as concat from "./concat.js"
import { Stream } from "./definitions.js"
import { fromChunk } from "./fromChunk.js"
import { fromEffect } from "./fromEffect.js"
import { fromEffectOption } from "./fromEffectOption.js"
import * as mapm from "./mapM.js"
import * as merge from "./merge.js"
import { repeatEffectOption } from "./repeatEffectOption.js"

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
export function zipWithLatest_<R, R1, E, E1, O, O2, O3>(
  self: Stream<R, E, O>,
  that: Stream<R1, E1, O2>,
  f: (o: O, o2: O2) => O3
) {
  return new Stream(
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
                    T.zipWith(F.join(rightFiber), (l, r) => Tp.tuple(l, r, true))
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
                  Ref.makeRef(
                    Tp.tuple(
                      A.unsafeGet_(l, A.size(l) - 1),
                      A.unsafeGet_(r, A.size(r) - 1)
                    )
                  )
                ),
                chain.chain((latest) =>
                  pipe(
                    fromChunk(
                      leftFirst
                        ? A.map_(r, (_) => f(A.unsafeGet_(l, A.size(l) - 1), _))
                        : A.map_(l, (_) => f(_, A.unsafeGet_(r, A.size(r) - 1)))
                    ),
                    concat.concat(
                      pipe(
                        repeatEffectOption(left),
                        merge.mergeEither(repeatEffectOption(right)),
                        mapm.mapM(
                          E.fold(
                            (leftChunk) =>
                              Ref.modify_(latest, ({ tuple: [_, rightLatest] }) =>
                                Tp.tuple(
                                  A.map_(leftChunk, (_) => f(_, rightLatest)),
                                  Tp.tuple(
                                    A.unsafeGet_(leftChunk, A.size(leftChunk) - 1),
                                    rightLatest
                                  )
                                )
                              ),
                            (rightChunk) =>
                              Ref.modify_(latest, ({ tuple: [leftLatest, _] }) =>
                                Tp.tuple(
                                  A.map_(rightChunk, (_) => f(leftLatest, _)),
                                  Tp.tuple(
                                    leftLatest,
                                    A.unsafeGet_(rightChunk, A.size(rightChunk) - 1)
                                  )
                                )
                              )
                          )
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

/**
 * Zips the two streams so that when a value is emitted by either of the two streams,
 * it is combined with the latest value from the other stream to produce a result.
 *
 * Note: tracking the latest value is done on a per-chunk basis. That means that
 * emitted elements that are not the last value in chunks will never be used for zipping.
 */
export function zipWithLatest<R1, E1, O, O2, O3>(
  that: Stream<R1, E1, O2>,
  f: (o: O, o2: O2) => O3
) {
  return <R, E>(self: Stream<R, E, O>) => zipWithLatest_(self, that, f)
}
