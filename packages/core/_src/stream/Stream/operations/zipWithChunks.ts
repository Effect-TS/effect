type State<A, A2> = PullBoth | PullLeft<A2> | PullRight<A>

class PullBoth {
  readonly _tag = "PullBoth"
}

class PullLeft<A2> {
  readonly _tag = "PullLeft"
  constructor(readonly rightChunk: Chunk<A2>) {}
}

class PullRight<A> {
  readonly _tag = "PullRight"
  constructor(readonly leftChunk: Chunk<A>) {}
}

/**
 * Zips this stream with another point-wise and applies the function to the
 * paired elements.
 *
 * The new stream will end when one of the sides ends.
 *
 * @tsplus static effect/core/stream/Stream.Aspects zipWithChunks
 * @tsplus pipeable effect/core/stream/Stream zipWithChunks
 */
export function zipWithChunks<R2, E2, A2, A, A3>(
  that: LazyArg<Stream<R2, E2, A2>>,
  f: (
    leftChunk: Chunk<A>,
    rightChunk: Chunk<A2>
  ) => Tuple<[Chunk<A3>, Either<Chunk<A>, Chunk<A2>>]>
) {
  return <R, E>(self: Stream<R, E, A>): Stream<R | R2, E | E2, A3> =>
    self.combineChunks(that, (): State<A, A2> => new PullBoth(), pull(f))
}

function zipWithChunksInternal<A, A2, A3>(
  leftChunk: Chunk<A>,
  rightChunk: Chunk<A2>,
  f: (
    leftChunk: Chunk<A>,
    rightChunk: Chunk<A2>
  ) => Tuple<[Chunk<A3>, Either<Chunk<A>, Chunk<A2>>]>
): Tuple<[Chunk<A3>, State<A, A2>]> {
  const {
    tuple: [out, either]
  } = f(leftChunk, rightChunk)
  return either.fold(
    (leftChunk) =>
      leftChunk.isEmpty
        ? Tuple(out, new PullBoth())
        : Tuple(out, new PullRight(leftChunk)),
    (rightChunk) =>
      rightChunk.isEmpty
        ? Tuple(out, new PullBoth())
        : Tuple(out, new PullLeft(rightChunk))
  )
}

function pull<A, A2, A3>(
  f: (
    leftChunk: Chunk<A>,
    rightChunk: Chunk<A2>
  ) => Tuple<[Chunk<A3>, Either<Chunk<A>, Chunk<A2>>]>
) {
  return <R, R2, E, E2>(
    state: State<A, A2>,
    pullLeft: Effect<R, Maybe<E>, Chunk<A>>,
    pullRight: Effect<R2, Maybe<E2>, Chunk<A2>>
  ): Effect<R | R2, never, Exit<Maybe<E | E2>, Tuple<[Chunk<A3>, State<A, A2>]>>> => {
    switch (state._tag) {
      case "PullBoth": {
        return pullLeft.unsome
          .zipPar(pullRight.unsome)
          .foldEffect(
            (err) => Effect.succeed(Exit.fail(Maybe.some(err))),
            ({ tuple: [left, right] }) => {
              if (left.isSome() && right.isSome()) {
                const leftChunk = left.value
                const rightChunk = right.value
                if (leftChunk.isEmpty && rightChunk.isEmpty) {
                  return pull(f)(new PullBoth(), pullLeft, pullRight)
                } else if (leftChunk.isEmpty) {
                  return pull(f)(new PullLeft(rightChunk), pullLeft, pullRight)
                } else if (rightChunk.isEmpty) {
                  return pull(f)(new PullRight(leftChunk), pullLeft, pullRight)
                } else {
                  return Effect.succeed(
                    Exit.succeed(zipWithChunksInternal(leftChunk, rightChunk, f))
                  )
                }
              }
              return Effect.succeed(Exit.fail(Maybe.none))
            }
          )
      }
      case "PullLeft": {
        return pullLeft.foldEffect(
          (err) => Effect.succeed(Exit.fail(err)),
          (leftChunk) =>
            leftChunk.isEmpty
              ? pull(f)(new PullLeft(state.rightChunk), pullLeft, pullRight)
              : state.rightChunk.isEmpty
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
            rightChunk.isEmpty
              ? pull(f)(new PullRight(state.leftChunk), pullLeft, pullRight)
              : state.leftChunk.isEmpty
              ? pull(f)(new PullLeft(rightChunk), pullLeft, pullRight)
              : Effect.succeed(
                Exit.succeed(zipWithChunksInternal(state.leftChunk, rightChunk, f))
              )
        )
      }
    }
  }
}
