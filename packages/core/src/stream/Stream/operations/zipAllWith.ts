import { zipChunks } from "@effect/core/stream/Stream/operations/_internal/zipChunks"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"

type State<A, A2> = DrainLeft | DrainRight | PullBoth | PullLeft<A2> | PullRight<A>

class DrainLeft {
  readonly _tag = "DrainLeft"
}

class DrainRight {
  readonly _tag = "DrainRight"
}

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
 * Zips this stream with another point-wise. The provided functions will be
 * used to create elements for the composed stream.
 *
 * The functions `left` and `right` will be used if the streams have different
 * lengths and one of the streams has ended before the other.
 *
 * @tsplus static effect/core/stream/Stream.Aspects zipAllWith
 * @tsplus pipeable effect/core/stream/Stream zipAllWith
 * @category zipping
 * @since 1.0.0
 */
export function zipAllWith<R2, E2, A2, A, A3>(
  that: Stream<R2, E2, A2>,
  left: (a: A) => A3,
  right: (a2: A2) => A3,
  both: (a: A, a2: A2) => A3
) {
  return <R, E>(self: Stream<R, E, A>): Stream<R | R2, E | E2, A3> =>
    self.combineChunks(
      that,
      new PullBoth() as State<A, A2>,
      pull(left, right, both)
    )
}

function zipWithChunks<A, A2, A3>(
  leftChunk: Chunk.Chunk<A>,
  rightChunk: Chunk.Chunk<A2>,
  f: (a: A, a2: A2) => A3
): readonly [Chunk.Chunk<A3>, State<A, A2>] {
  const [out, either] = zipChunks(leftChunk, rightChunk, f)
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
  left: (a: A) => A3,
  right: (a2: A2) => A3,
  both: (a: A, a2: A2) => A3
) {
  return <R, E, R2, E2>(
    state: State<A, A2>,
    pullLeft: Effect<R, Option.Option<E>, Chunk.Chunk<A>>,
    pullRight: Effect<R2, Option.Option<E2>, Chunk.Chunk<A2>>
  ): Effect<
    R | R2,
    never,
    Exit<Option.Option<E | E2>, readonly [Chunk.Chunk<A3>, State<A, A2>]>
  > => {
    switch (state._tag) {
      case "DrainLeft": {
        return pullLeft.foldEffect(
          (err) => Effect.succeed(Exit.fail(err)),
          (leftChunk) =>
            Effect.succeed(Exit.succeed([pipe(leftChunk, Chunk.map(left)), new DrainLeft()]))
        )
      }
      case "DrainRight": {
        return pullRight.foldEffect(
          (err) => Effect.succeed(Exit.fail(err)),
          (rightChunk) =>
            Effect.succeed(
              Exit.succeed([pipe(rightChunk, Chunk.map(right)), new DrainRight()])
            )
        )
      }
      case "PullBoth": {
        return pullLeft
          .unsome
          .zipPar(pullRight.unsome)
          .foldEffect(
            (err) => Effect.succeed(Exit.fail(Option.some(err))),
            ([l, r]) => {
              if (l._tag === "Some" && r._tag === "Some") {
                const leftChunk = l.value
                const rightChunk = r.value
                if (Chunk.isEmpty(leftChunk) && Chunk.isEmpty(rightChunk)) {
                  return pull(left, right, both)(new PullBoth(), pullLeft, pullRight)
                } else if (Chunk.isEmpty(leftChunk)) {
                  return pull(left, right, both)(
                    new PullLeft(rightChunk),
                    pullLeft,
                    pullRight
                  )
                } else if (Chunk.isEmpty(rightChunk)) {
                  return pull(left, right, both)(
                    new PullRight(leftChunk),
                    pullLeft,
                    pullRight
                  )
                } else {
                  return Effect.succeed(
                    Exit.succeed(zipWithChunks(leftChunk, rightChunk, both))
                  )
                }
              } else if (Option.isSome(l) && Option.isNone(r)) {
                return Effect.succeed(
                  Exit.succeed([pipe(l.value, Chunk.map(left)), new DrainLeft()])
                )
              } else if (Option.isNone(l) && Option.isSome(r)) {
                return Effect.succeed(
                  Exit.succeed([pipe(r.value, Chunk.map(right)), new DrainRight()])
                )
              } else {
                return Effect.succeed(Exit.fail(Option.none))
              }
            }
          )
      }
      case "PullLeft": {
        return pullLeft.foldEffect(
          (option) => {
            switch (option._tag) {
              case "None": {
                return Effect.succeed<
                  Exit<Option.Option<E | E2>, readonly [Chunk.Chunk<A3>, State<A, A2>]>
                >(
                  Exit.succeed([pipe(state.rightChunk, Chunk.map(right)), new DrainRight()])
                )
              }
              case "Some": {
                return Effect.succeed<
                  Exit<Option.Option<E | E2>, readonly [Chunk.Chunk<A3>, State<A, A2>]>
                >(
                  Exit.fail(option)
                )
              }
            }
          },
          (leftChunk) =>
            Chunk.isEmpty(leftChunk)
              ? pull(left, right, both)(
                new PullLeft(state.rightChunk),
                pullLeft,
                pullRight
              )
              : Chunk.isEmpty(state.rightChunk)
              ? pull(left, right, both)(new PullRight(leftChunk), pullLeft, pullRight)
              : Effect.succeed(
                Exit.succeed(zipWithChunks(leftChunk, state.rightChunk, both))
              )
        )
      }
      case "PullRight": {
        return pullRight.foldEffect(
          (option) => {
            switch (option._tag) {
              case "None": {
                return Effect.succeed<
                  Exit<Option.Option<E | E2>, readonly [Chunk.Chunk<A3>, State<A, A2>]>
                >(
                  Exit.succeed([pipe(state.leftChunk, Chunk.map(left)), new DrainLeft()])
                )
              }
              case "Some": {
                return Effect.succeed<
                  Exit<Option.Option<E | E2>, readonly [Chunk.Chunk<A3>, State<A, A2>]>
                >(
                  Exit.fail(option)
                )
              }
            }
          },
          (rightChunk) =>
            Chunk.isEmpty(rightChunk)
              ? pull(left, right, both)(
                new PullRight(state.leftChunk),
                pullLeft,
                pullRight
              )
              : Chunk.isEmpty(state.leftChunk)
              ? pull(left, right, both)(new PullLeft(rightChunk), pullLeft, pullRight)
              : Effect.succeed(
                Exit.succeed(zipWithChunks(state.leftChunk, rightChunk, both))
              )
        )
      }
    }
  }
}
