import type { Chunk } from "../../../collection/immutable/Chunk"
import { Tuple } from "../../../collection/immutable/Tuple"
import type { LazyArg } from "../../../data/Function"
import type { Option } from "../../../data/Option"
import { Effect } from "../../../io/Effect"
import { Managed } from "../../../io/Managed"
import { Ref } from "../../../io/Ref"
import { Stream } from "../definition"

/**
 * Zips the two streams so that when a value is emitted by either of the two
 * streams, it is combined with the latest value from the other stream to
 * produce a result.
 *
 * Note: tracking the latest value is done on a per-chunk basis. That means
 * that emitted elements that are not the last value in chunks will never be
 * used for zipping.
 *
 * @tsplus fluent ets/Stream zipWithLatest
 */
export function zipWithLatest_<R, E, A, R2, E2, A2, A3>(
  self: Stream<R, E, A>,
  that: LazyArg<Stream<R2, E2, A2>>,
  f: (a: A, a2: A2) => A3,
  __tsplusTrace?: string
): Stream<R & R2, E | E2, A3> {
  return Stream.fromPull(
    Managed.Do()
      .bind("left", () => self.toPull().map(pullNonEmpty))
      .bind("right", () => that().toPull().map(pullNonEmpty))
      .flatMap(({ left, right }) =>
        Stream.fromEffectOption(
          left.raceWith(
            right,
            (leftDone, rightFiber) =>
              Effect.done(leftDone).zipWith(rightFiber.join(), (left, right) =>
                Tuple(left, right, true)
              ),
            (rightDone, leftFiber) =>
              Effect.done(rightDone).zipWith(leftFiber.join(), (right, left) =>
                Tuple(left, right, false)
              )
          )
        )
          .flatMap(({ tuple: [l, r, leftFirst] }) =>
            Stream.fromEffect(
              Ref.make(Tuple(l.unsafeGet(l.size - 1), r.unsafeGet(r.size - 1)))
            ).flatMap(
              (latest) =>
                Stream.fromChunk(
                  leftFirst
                    ? r.map((a2) => f(l.unsafeGet(l.size - 1), a2))
                    : l.map((a) => f(a, r.unsafeGet(r.size - 1)))
                ) +
                Stream.repeatEffectOption(left)
                  .mergeEither(Stream.repeatEffectOption(right))
                  .mapEffect((either) =>
                    either.fold(
                      (leftChunk) =>
                        latest.modify(({ tuple: [_, rightLatest] }) =>
                          Tuple(
                            leftChunk.map((a) => f(a, rightLatest)),
                            Tuple(leftChunk.unsafeGet(leftChunk.size - 1), rightLatest)
                          )
                        ),
                      (rightChunk) =>
                        latest.modify(({ tuple: [leftLatest, _] }) =>
                          Tuple(
                            rightChunk.map((a2) => f(leftLatest, a2)),
                            Tuple(leftLatest, rightChunk.unsafeGet(rightChunk.size - 1))
                          )
                        )
                    )
                  )
                  .flatMap((chunk) => Stream.fromChunk(chunk))
            )
          )
          .toPull()
      )
  )
}

/**
 * Zips the two streams so that when a value is emitted by either of the two
 * streams, it is combined with the latest value from the other stream to
 * produce a result.
 *
 * Note: tracking the latest value is done on a per-chunk basis. That means
 * that emitted elements that are not the last value in chunks will never be
 * used for zipping.
 */
export const zipWithLatest = Pipeable(zipWithLatest_)

function pullNonEmpty<R, E, A>(
  pull: Effect<R, Option<E>, Chunk<A>>,
  __tsplusTrace?: string
): Effect<R, Option<E>, Chunk<A>> {
  return pull.flatMap((chunk) =>
    chunk.isEmpty() ? pullNonEmpty(pull) : Effect.succeedNow(chunk)
  )
}
