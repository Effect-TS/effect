import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import type { Option } from "@fp-ts/data/Option"

/**
 * Zips the two streams so that when a value is emitted by either of the two
 * streams, it is combined with the latest value from the other stream to
 * produce a result.
 *
 * Note: tracking the latest value is done on a per-chunk basis. That means
 * that emitted elements that are not the last value in chunks will never be
 * used for zipping.
 *
 * @tsplus static effect/core/stream/Stream.Aspects zipWithLatest
 * @tsplus pipeable effect/core/stream/Stream zipWithLatest
 * @category zipping
 * @since 1.0.0
 */
export function zipWithLatest<R2, E2, A2, A, A3>(
  that: Stream<R2, E2, A2>,
  f: (a: A, a2: A2) => A3
) {
  return <R, E>(self: Stream<R, E, A>): Stream<R | R2, E | E2, A3> =>
    Stream.fromPull(
      Do(($) => {
        const left = $(self.toPull.map(pullNonEmpty))
        const right = $(that.toPull.map(pullNonEmpty))
        return $(
          Stream.fromEffectOption(
            left.raceWith<
              R,
              Option<E>,
              Chunk.Chunk<A>,
              R2,
              Option<E2>,
              Chunk.Chunk<A2>,
              never,
              Option<E | E2>,
              readonly [Chunk.Chunk<A>, Chunk.Chunk<A2>, boolean],
              never,
              Option<E | E2>,
              readonly [Chunk.Chunk<A>, Chunk.Chunk<A2>, boolean]
            >(
              right,
              (leftDone, rightFiber) =>
                Effect.done(leftDone).zipWith(
                  rightFiber.join,
                  (left, right) => [left, right, true]
                ),
              (rightDone, leftFiber) =>
                Effect.done(rightDone).zipWith(
                  leftFiber.join,
                  (right, left) => [left, right, false]
                )
            )
          )
            .flatMap(([l, r, leftFirst]) =>
              Stream.fromEffect(
                Ref.make(
                  [
                    pipe(l, Chunk.unsafeGet(l.length - 1)),
                    pipe(r, Chunk.unsafeGet(r.length - 1))
                  ] as const
                )
              ).flatMap(
                (latest) =>
                  Stream.fromChunk(
                    leftFirst
                      ? pipe(r, Chunk.map((a2) => f(pipe(l, Chunk.unsafeGet(l.length - 1)), a2)))
                      : pipe(l, Chunk.map((a) => f(a, pipe(r, Chunk.unsafeGet(r.length - 1)))))
                  ).concat(
                    Stream.repeatEffectOption(left)
                      .mergeEither(Stream.repeatEffectOption(right))
                      .mapEffect((either) => {
                        switch (either._tag) {
                          case "Left": {
                            const leftChunk = either.left
                            return latest.modify(([_, rightLatest]) =>
                              [
                                pipe(leftChunk, Chunk.map((a) => f(a, rightLatest))),
                                [
                                  pipe(leftChunk, Chunk.unsafeGet(leftChunk.length - 1)),
                                  rightLatest
                                ] as const
                              ] as const
                            )
                          }
                          case "Right": {
                            const rightChunk = either.right
                            return latest.modify(([leftLatest, _]) =>
                              [
                                pipe(rightChunk, Chunk.map((a2) => f(leftLatest, a2))),
                                [
                                  leftLatest,
                                  pipe(rightChunk, Chunk.unsafeGet(rightChunk.length - 1))
                                ] as const
                              ] as const
                            )
                          }
                        }
                      })
                      .flatMap((chunk) => Stream.fromChunk(chunk))
                  )
              )
            )
            .toPull
        )
      })
    )
}

function pullNonEmpty<R, E, A>(
  pull: Effect<R, Option<E>, Chunk.Chunk<A>>
): Effect<R, Option<E>, Chunk.Chunk<A>> {
  return pull.flatMap((chunk) => Chunk.isEmpty(chunk) ? pullNonEmpty(pull) : Effect.succeed(chunk))
}
