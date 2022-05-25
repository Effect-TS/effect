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
 * @tsplus fluent ets/Stream zipWithChunks
 */
export function zipWithChunks_<R, E, A, R2, E2, A2, A3>(
  self: Stream<R, E, A>,
  that: LazyArg<Stream<R2, E2, A2>>,
  f: (
    leftChunk: Chunk<A>,
    rightChunk: Chunk<A2>
  ) => Tuple<[Chunk<A3>, Either<Chunk<A>, Chunk<A2>>]>,
  __tsplusTrace?: string
): Stream<R & R2, E | E2, A3> {
  return self.combineChunks(that, (): State<A, A2> => new PullBoth(), pull(f))
}

/**
 * Zips this stream with another point-wise and applies the function to the
 * paired elements.
 *
 * The new stream will end when one of the sides ends.
 *
 * @tsplus static ets/Stream/Aspects zipWithChunks
 */
export const zipWithChunks = Pipeable(zipWithChunks_)

function zipWithChunksInternal<A, A2, A3>(
  leftChunk: Chunk<A>,
  rightChunk: Chunk<A2>,
  f: (
    leftChunk: Chunk<A>,
    rightChunk: Chunk<A2>
  ) => Tuple<[Chunk<A3>, Either<Chunk<A>, Chunk<A2>>]>,
  __tsplusTrace?: string
): Tuple<[Chunk<A3>, State<A, A2>]> {
  const {
    tuple: [out, either]
  } = f(leftChunk, rightChunk)
  return either.fold(
    (leftChunk) =>
      leftChunk.isEmpty()
        ? Tuple(out, new PullBoth())
        : Tuple(out, new PullRight(leftChunk)),
    (rightChunk) =>
      rightChunk.isEmpty()
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
    pullLeft: Effect<R, Option<E>, Chunk<A>>,
    pullRight: Effect<R2, Option<E2>, Chunk<A2>>,
    __tsplusTrace?: string
  ): Effect<R & R2, never, Exit<Option<E | E2>, Tuple<[Chunk<A3>, State<A, A2>]>>> => {
    switch (state._tag) {
      case "PullBoth": {
        return pullLeft.zipPar(pullRight).foldEffect(
          (err) => Effect.succeedNow(Exit.fail(err)),
          ({ tuple: [leftChunk, rightChunk] }) => {
            if (leftChunk.isEmpty() && rightChunk.isEmpty()) {
              return pull(f)(new PullBoth(), pullLeft, pullRight)
            } else if (leftChunk.isEmpty()) {
              return pull(f)(new PullLeft(rightChunk), pullLeft, pullRight)
            } else if (rightChunk.isEmpty()) {
              return pull(f)(new PullRight(leftChunk), pullLeft, pullRight)
            } else {
              return Effect.succeedNow(
                Exit.succeed(zipWithChunksInternal(leftChunk, rightChunk, f))
              )
            }
          }
        )
      }
      case "PullLeft": {
        return pullLeft.foldEffect(
          (err) => Effect.succeedNow(Exit.fail(err)),
          (leftChunk) =>
            leftChunk.isEmpty()
              ? pull(f)(new PullLeft(state.rightChunk), pullLeft, pullRight)
              : state.rightChunk.isEmpty()
              ? pull(f)(new PullRight(leftChunk), pullLeft, pullRight)
              : Effect.succeedNow(
                Exit.succeed(zipWithChunksInternal(leftChunk, state.rightChunk, f))
              )
        )
      }
      case "PullRight": {
        return pullRight.foldEffect(
          (err) => Effect.succeedNow(Exit.fail(err)),
          (rightChunk) =>
            rightChunk.isEmpty()
              ? pull(f)(new PullRight(state.leftChunk), pullLeft, pullRight)
              : state.leftChunk.isEmpty()
              ? pull(f)(new PullLeft(rightChunk), pullLeft, pullRight)
              : Effect.succeedNow(
                Exit.succeed(zipWithChunksInternal(state.leftChunk, rightChunk, f))
              )
        )
      }
    }
  }
}
