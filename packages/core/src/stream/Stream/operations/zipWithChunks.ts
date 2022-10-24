import * as Chunk from "@fp-ts/data/Chunk"
import type { Either } from "@fp-ts/data/Either"
import * as Option from "@fp-ts/data/Option"

type State<A, A2> = PullBoth | PullLeft<A2> | PullRight<A>

class PullBoth {
  readonly _tag = "PullBoth"
}

class PullLeft<A2> {
  readonly _tag = "PullLeft"
  constructor(readonly rightChunk: Chunk.Chunk<A2>) {}
}

class PullRight<A> {
  readonly _tag = "PullRight"
  constructor(readonly leftChunk: Chunk.Chunk<A>) {}
}

/**
 * Zips this stream with another point-wise and applies the function to the
 * paired elements.
 *
 * The new stream will end when one of the sides ends.
 *
 * @tsplus static effect/core/stream/Stream.Aspects zipWithChunks
 * @tsplus pipeable effect/core/stream/Stream zipWithChunks
 * @category zipping
 * @since 1.0.0
 */
export function zipWithChunks<R2, E2, A2, A, A3>(
  that: Stream<R2, E2, A2>,
  f: (
    leftChunk: Chunk.Chunk<A>,
    rightChunk: Chunk.Chunk<A2>
  ) => readonly [Chunk.Chunk<A3>, Either<Chunk.Chunk<A>, Chunk.Chunk<A2>>]
) {
  return <R, E>(self: Stream<R, E, A>): Stream<R | R2, E | E2, A3> =>
    self.combineChunks(that, new PullBoth() as State<A, A2>, pull(f))
}

function zipWithChunksInternal<A, A2, A3>(
  leftChunk: Chunk.Chunk<A>,
  rightChunk: Chunk.Chunk<A2>,
  f: (
    leftChunk: Chunk.Chunk<A>,
    rightChunk: Chunk.Chunk<A2>
  ) => readonly [Chunk.Chunk<A3>, Either<Chunk.Chunk<A>, Chunk.Chunk<A2>>]
): readonly [Chunk.Chunk<A3>, State<A, A2>] {
  const [out, either] = f(leftChunk, rightChunk)
  switch (either._tag) {
    case "Left": {
      const leftChunk = either.left
      return Chunk.isEmpty(leftChunk)
        ? [out, new PullBoth()]
        : [out, new PullRight(leftChunk)]
    }
    case "Right": {
      const rightChunk = either.right
      return Chunk.isEmpty(rightChunk)
        ? [out, new PullBoth()]
        : [out, new PullLeft(rightChunk)]
    }
  }
}

function pull<A, A2, A3>(
  f: (
    leftChunk: Chunk.Chunk<A>,
    rightChunk: Chunk.Chunk<A2>
  ) => readonly [Chunk.Chunk<A3>, Either<Chunk.Chunk<A>, Chunk.Chunk<A2>>]
) {
  return <R, R2, E, E2>(
    state: State<A, A2>,
    pullLeft: Effect<R, Option.Option<E>, Chunk.Chunk<A>>,
    pullRight: Effect<R2, Option.Option<E2>, Chunk.Chunk<A2>>
  ): Effect<
    R | R2,
    never,
    Exit<Option.Option<E | E2>, readonly [Chunk.Chunk<A3>, State<A, A2>]>
  > => {
    switch (state._tag) {
      case "PullBoth": {
        return pullLeft.unsome
          .zipPar(pullRight.unsome)
          .foldEffect(
            (err) => Effect.succeed(Exit.fail(Option.some(err))),
            ([left, right]) => {
              if (Option.isSome(left) && Option.isSome(right)) {
                const leftChunk = left.value
                const rightChunk = right.value
                if (Chunk.isEmpty(leftChunk) && Chunk.isEmpty(rightChunk)) {
                  return pull(f)(new PullBoth(), pullLeft, pullRight)
                } else if (Chunk.isEmpty(leftChunk)) {
                  return pull(f)(new PullLeft(rightChunk), pullLeft, pullRight)
                } else if (Chunk.isEmpty(rightChunk)) {
                  return pull(f)(new PullRight(leftChunk), pullLeft, pullRight)
                } else {
                  return Effect.succeed(
                    Exit.succeed(zipWithChunksInternal(leftChunk, rightChunk, f))
                  )
                }
              }
              return Effect.succeed(Exit.fail(Option.none))
            }
          )
      }
      case "PullLeft": {
        return pullLeft.foldEffect(
          (err) => Effect.succeed(Exit.fail(err)),
          (leftChunk) =>
            Chunk.isEmpty(leftChunk)
              ? pull(f)(new PullLeft(state.rightChunk), pullLeft, pullRight)
              : Chunk.isEmpty(state.rightChunk)
              ? pull(f)(new PullRight(leftChunk), pullLeft, pullRight)
              : Effect.succeed(
                Exit.succeed(zipWithChunksInternal(leftChunk, state.rightChunk, f))
              )
        )
      }
      case "PullRight": {
        return pullRight.foldEffect(
          (err) => Effect.succeed(Exit.fail(err)),
          (rightChunk) =>
            Chunk.isEmpty(rightChunk)
              ? pull(f)(new PullRight(state.leftChunk), pullLeft, pullRight)
              : Chunk.isEmpty(state.leftChunk)
              ? pull(f)(new PullLeft(rightChunk), pullLeft, pullRight)
              : Effect.succeed(
                Exit.succeed(zipWithChunksInternal(state.leftChunk, rightChunk, f))
              )
        )
      }
    }
  }
}
