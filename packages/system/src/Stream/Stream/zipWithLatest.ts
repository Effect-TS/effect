import * as A from "../../Chunk"
import { pipe } from "../../Function"
import * as O from "../../Option"
import * as T from "../_internal/effect"
import * as F from "../_internal/fiber"
import * as M from "../_internal/managed"
import * as Ref from "../_internal/ref"
import { chain } from "./chain"
import { concat } from "./concat"
import { Stream } from "./definitions"
import { fromChunk } from "./fromChunk"
import { fromEffect } from "./fromEffect"
import { fromEffectOption } from "./fromEffectOption"
import { mergeWith } from "./mergeWith"
import { repeatEffectOption } from "./repeatEffectOption"

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
  const pullNonEmpty = <Out>(
    pull: T.Effect<R & R1, O.Option<E | E1>, A.Chunk<Out>>
  ): T.Effect<R & R1, O.Option<E | E1>, A.Chunk<Out>> =>
    T.chain_(pull, (chunk) =>
      A.isEmpty(chunk) ? pullNonEmpty(pull) : T.succeed(chunk)
    )

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
                  left,
                  right,
                  (leftDone, rightFiber) =>
                    pipe(
                      T.done(leftDone),
                      T.zipWith(F.join(rightFiber), (a, b) => [a, b, true] as const)
                    ),
                  (rightDone, leftFiber) =>
                    pipe(
                      T.done(rightDone),
                      T.zipWith(F.join(leftFiber), (r, l) => [l, r, false] as const)
                    )
                )
              ),
              chain(([l, r, leftFirst]) =>
                pipe(
                  fromEffect(
                    T.zip_(Ref.makeRef(l[l.length - 1]), Ref.makeRef(r[r.length - 1]))
                  ),
                  chain(([latestLeft, latestRight]) =>
                    pipe(
                      fromChunk(
                        leftFirst
                          ? A.map_(r, (_) => f(l[l.length - 1], _))
                          : A.map_(l, (_) => f(_, r[r.length - 1]))
                      ),
                      concat(
                        pipe(
                          repeatEffectOption(
                            pipe(
                              left,
                              T.tap((chunk) => latestLeft.set(chunk[chunk.length - 1])),
                              T.zip(latestRight.get)
                            )
                          ),
                          mergeWith(
                            repeatEffectOption(
                              pipe(
                                right,
                                T.tap((chunk) =>
                                  latestRight.set(chunk[chunk.length - 1])
                                ),
                                T.zip(latestLeft.get)
                              )
                            )
                          )(
                            ([leftChunk, rightLatest]) =>
                              A.map_(leftChunk, (_) => f(_, rightLatest)),
                            ([rightChunk, leftLatest]) =>
                              A.map_(rightChunk, (_) => f(leftLatest, _))
                          ),
                          chain(fromChunk)
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
