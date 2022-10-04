type State<K, A, B> =
  | DrainLeft
  | DrainRight
  | PullBoth
  | PullLeft<K, B>
  | PullRight<K, A>

export class DrainLeft {
  readonly _tag = "DrainLeft"
}

export class DrainRight {
  readonly _tag = "DrainRight"
}

export class PullBoth {
  readonly _tag = "PullBoth"
}

export class PullLeft<K, B> {
  readonly _tag = "PullLeft"
  constructor(readonly rightChunk: Chunk<readonly [K, B]>) {}
}

export class PullRight<K, A> {
  readonly _tag = "PullRight"
  constructor(readonly leftChunk: Chunk<readonly [K, A]>) {}
}

/**
 * Zips this stream that is sorted by distinct keys and the specified stream
 * that is sorted by distinct keys to produce a new stream that is sorted by
 * distinct keys. Uses the functions `left`, `right`, and `both` to handle
 * the cases where a key and value exist in this stream, that stream, or
 * both streams.
 *
 * This allows zipping potentially unbounded streams of data by key in
 * constant space but the caller is responsible for ensuring that the
 * streams are sorted by distinct keys.
 *
 * @tsplus static effect/core/stream/SortedByKey.Aspects zipAllSortedByKeyWith
 * @tsplus pipeable effect/core/stream/SortedByKey zipAllSortedByKeyWith
 * @tsplus static effect/core/stream/Stream.Aspects zipAllSortedByKeyWith
 * @tsplus pipeable effect/core/stream/Stream zipAllSortedByKeyWith
 */
export function zipAllSortedByKeyWith<K, R2, E2, A2, A, C1, C2, C3>(
  ord: Ord<K>,
  that: SortedByKey<R2, E2, K, A2>,
  left: (a: A) => C1,
  right: (b: A2) => C2,
  both: (a: A, b: A2) => C3
) {
  return <R, E>(
    self: SortedByKey<R, E, K, A>
  ): Stream<R | R2, E | E2, readonly [K, C1 | C2 | C3]> => {
    const pull = (
      state: State<K, A, A2>,
      pullLeft: Effect<R, Maybe<E>, Chunk<readonly [K, A]>>,
      pullRight: Effect<R2, Maybe<E2>, Chunk<readonly [K, A2]>>
    ): Effect<
      R | R2,
      never,
      Exit<Maybe<E | E2>, readonly [Chunk<readonly [K, C1 | C2 | C3]>, State<K, A, A2>]>
    > => {
      switch (state._tag) {
        case "DrainLeft":
          return pullLeft.fold(
            (e) => Exit.fail(e),
            (leftChunk) =>
              Exit.succeed(
                [leftChunk.map(([k, a]) => [k, left(a)] as const), new DrainLeft()] as const
              )
          )
        case "DrainRight":
          return pullRight.fold(
            (e) => Exit.fail(e),
            (rightChunk) =>
              Exit.succeed(
                [rightChunk.map(([k, b]) => [k, right(b)] as const), new DrainRight()] as const
              )
          )
        case "PullBoth": {
          return pullLeft
            .unsome
            .zipPar(pullRight.unsome)
            .foldEffect(
              (e) => Effect.succeed(Exit.fail(Maybe.some(e))),
              ([a, b]) => {
                if (a.isSome() && b.isSome()) {
                  const leftChunk = a.value
                  const rightChunk = b.value

                  if (leftChunk.isEmpty && rightChunk.isEmpty) {
                    return pull(new PullBoth(), pullLeft, pullRight)
                  } else if (leftChunk.isEmpty) {
                    return pull(new PullLeft(rightChunk), pullLeft, pullRight)
                  } else if (rightChunk.isEmpty) {
                    return pull(new PullRight(leftChunk), pullLeft, pullRight)
                  } else {
                    return Effect.succeed(
                      Exit.succeed(mergeSortedByKeyChunk(leftChunk, rightChunk))
                    )
                  }
                } else if (a.isSome()) {
                  const leftChunk = a.value

                  return leftChunk.isEmpty
                    ? pull(new DrainLeft(), pullLeft, pullRight)
                    : Effect.succeed(
                      Exit.succeed(
                        [leftChunk.map(([k, a]) => [k, left(a)] as const), new DrainLeft()] as const
                      )
                    )
                } else if (b.isSome()) {
                  const rightChunk = b.value

                  return rightChunk.isEmpty
                    ? pull(new DrainLeft(), pullLeft, pullRight)
                    : Effect.succeed(
                      Exit.succeed(
                        [
                          rightChunk.map(([k, b]) => [k, right(b)]),
                          new DrainRight()
                        ] as const
                      )
                    )
                } else {
                  return Effect.succeed(Exit.fail(Maybe.none))
                }
              }
            )
        }
        case "PullLeft": {
          const rightChunk = state.rightChunk

          return pullLeft.foldEffect(
            (option) =>
              option.fold(
                (): Effect<
                  never,
                  never,
                  Exit<Maybe<E>, [Chunk<readonly [K, C2]>, DrainRight]>
                > =>
                  Effect.succeed(
                    Exit.succeed([rightChunk.map(([k, b]) => [k, right(b)]), new DrainRight()])
                  ),
                (e) => Effect.succeed(Exit.fail(Maybe.some(e)))
              ),
            (leftChunk) =>
              leftChunk.isEmpty
                ? pull(new PullLeft(rightChunk), pullLeft, pullRight)
                : Effect.succeed(
                  Exit.succeed(mergeSortedByKeyChunk(leftChunk, rightChunk))
                )
          )
        }
        case "PullRight": {
          const leftChunk = state.leftChunk

          return pullRight.foldEffect(
            (option) =>
              option.fold(
                (): Effect<
                  never,
                  never,
                  Exit<Maybe<E2>, readonly [Chunk<readonly [K, C1]>, DrainLeft]>
                > =>
                  Effect.succeed(
                    Exit.succeed(
                      [
                        leftChunk.map(([k, a]) => [k, left(a)] as const),
                        new DrainLeft()
                      ] as const
                    )
                  ),
                (e) => Effect.succeed(Exit.fail(Maybe.some(e)))
              ),
            (rightChunk) =>
              rightChunk.isEmpty
                ? pull(new PullRight(leftChunk), pullLeft, pullRight)
                : Effect.succeed(
                  Exit.succeed(mergeSortedByKeyChunk(leftChunk, rightChunk))
                )
          )
        }
      }
    }

    function mergeSortedByKeyChunk(
      leftChunk: Chunk<readonly [K, A]>,
      rightChunk: Chunk<readonly [K, A2]>
    ): readonly [Chunk<readonly [K, C1 | C2 | C3]>, State<K, A, A2>] {
      const builder = Chunk.builder<readonly [K, C1 | C2 | C3]>()
      let state: State<K, A, A2> | undefined
      let leftIndex = 0
      let rightIndex = 0
      let leftTuple = leftChunk.unsafeGet(leftIndex)
      let rightTuple = rightChunk.unsafeGet(rightIndex)
      let k1 = leftTuple[0]
      let a = leftTuple[1]
      let k2 = rightTuple[0]
      let b = rightTuple[1]
      let loop = true

      const hasNext = <T>(c: Chunk<T>, index: number) => index < c.size - 1

      while (loop) {
        const compare = ord.compare(k1, k2)

        if (compare === 0) {
          builder.append([k1, both(a, b)] as const)

          if (hasNext(leftChunk, leftIndex) && hasNext(rightChunk, rightIndex)) {
            leftIndex += 1
            rightIndex += 1
            leftTuple = leftChunk.unsafeGet(leftIndex)
            rightTuple = rightChunk.unsafeGet(rightIndex)
            k1 = leftTuple[0]
            a = leftTuple[1]
            k2 = rightTuple[0]
            b = rightTuple[1]
          } else if (hasNext(leftChunk, leftIndex)) {
            state = new PullRight(leftChunk.drop(leftIndex + 1))
            loop = false
          } else if (hasNext(rightChunk, rightIndex)) {
            state = new PullLeft(rightChunk.drop(rightIndex + 1))
            loop = false
          } else {
            state = new PullBoth()
            loop = false
          }
        } else if (compare < 0) {
          builder.append([k1, left(a)])

          if (hasNext(leftChunk, leftIndex)) {
            leftIndex += 1
            leftTuple = leftChunk.unsafeGet(leftIndex)
            k1 = leftTuple[0]
            a = leftTuple[1]
          } else {
            const rightBuilder = Chunk.builder<readonly [K, A2]>()
            rightBuilder.append(rightTuple)

            while (hasNext(rightChunk, rightIndex)) {
              rightIndex += 1
              rightTuple = rightChunk.unsafeGet(rightIndex)
              rightBuilder.append(rightTuple)
              state = new PullLeft(rightBuilder.build())
              loop = false
            }
          }
        } else {
          builder.append([k2, right(b)])

          if (hasNext(rightChunk, rightIndex)) {
            rightIndex += 1
            rightTuple = rightChunk.unsafeGet(rightIndex)
            k2 = rightTuple[0]
            b = rightTuple[1]
          } else {
            const leftBuilder = Chunk.builder<readonly [K, A]>()
            leftBuilder.append(leftTuple)

            while (hasNext(leftChunk, leftIndex)) {
              leftIndex += 1
              leftTuple = leftChunk.unsafeGet(leftIndex)
              leftBuilder.append(leftTuple)
              state = new PullRight(leftBuilder.build())
              loop = false
            }
          }
        }
      }

      return [builder.build(), state!]
    }

    return self.combineChunks(that, new PullBoth(), pull)
  }
}
