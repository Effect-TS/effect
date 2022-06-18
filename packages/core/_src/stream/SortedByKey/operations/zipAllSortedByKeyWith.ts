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
  constructor(readonly rightChunk: Chunk<Tuple<[K, B]>>) {}
}

export class PullRight<K, A> {
  readonly _tag = "PullRight"
  constructor(readonly leftChunk: Chunk<Tuple<[K, A]>>) {}
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
 * @tsplus fluent ets/SortedByKey zipAllSortedByKeyWith
 * @tsplus fluent ets/Stream zipAllSortedByKeyWith
 */
export function zipAllSortedByKeyWith_<R, E, K, A>(
  self: SortedByKey<R, E, K, A>,
  ord: Ord<K>
) {
  return <R2, E2, B, C1, C2, C3>(
    that: LazyArg<SortedByKey<R2, E2, K, B>>,
    left: (a: A) => C1,
    right: (b: B) => C2,
    both: (a: A, b: B) => C3,
    __tsplusTrace?: string
  ): Stream<R | R2, E | E2, Tuple<[K, C1 | C2 | C3]>> => {
    const pull = (
      state: State<K, A, B>,
      pullLeft: Effect<R, Maybe<E>, Chunk<Tuple<[K, A]>>>,
      pullRight: Effect<R2, Maybe<E2>, Chunk<Tuple<[K, B]>>>
    ): Effect<
      R | R2,
      never,
      Exit<Maybe<E | E2>, Tuple<[Chunk<Tuple<[K, C1 | C2 | C3]>>, State<K, A, B>]>>
    > => {
      switch (state._tag) {
        case "DrainLeft":
          return pullLeft.fold(
            (e) => Exit.fail(e),
            (leftChunk) =>
              Exit.succeed(
                Tuple(
                  leftChunk.map(({ tuple: [k, a] }) => Tuple(k, left(a))),
                  new DrainLeft()
                )
              )
          )
        case "DrainRight":
          return pullRight.fold(
            (e) => Exit.fail(e),
            (rightChunk) =>
              Exit.succeed(
                Tuple(
                  rightChunk.map(({ tuple: [k, b] }) => Tuple(k, right(b))),
                  new DrainRight()
                )
              )
          )
        case "PullBoth": {
          return pullLeft
            .unsome()
            .zipPar(pullRight.unsome())
            .foldEffect(
              (e) => Effect.succeedNow(Exit.fail(Maybe.some(e))),
              ({ tuple: [a, b] }) => {
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
                    return Effect.succeedNow(
                      Exit.succeed(mergeSortedByKeyChunk(leftChunk, rightChunk))
                    )
                  }
                } else if (a.isSome()) {
                  const leftChunk = a.value

                  return leftChunk.isEmpty
                    ? pull(new DrainLeft(), pullLeft, pullRight)
                    : Effect.succeedNow(
                      Exit.succeed(
                        Tuple(
                          leftChunk.map(({ tuple: [k, a] }) => Tuple(k, left(a))),
                          new DrainLeft()
                        )
                      )
                    )
                } else if (b.isSome()) {
                  const rightChunk = b.value

                  return rightChunk.isEmpty
                    ? pull(new DrainLeft(), pullLeft, pullRight)
                    : Effect.succeedNow(
                      Exit.succeed(
                        Tuple(
                          rightChunk.map(({ tuple: [k, b] }) => Tuple(k, right(b))),
                          new DrainRight()
                        )
                      )
                    )
                } else {
                  return Effect.succeedNow(Exit.fail(Maybe.none))
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
                  Exit<Maybe<E>, Tuple<[Chunk<Tuple<[K, C2]>>, DrainRight]>>
                > =>
                  Effect.succeedNow(
                    Exit.succeed(
                      Tuple(
                        rightChunk.map(({ tuple: [k, b] }) => Tuple(k, right(b))),
                        new DrainRight()
                      )
                    )
                  ),
                (e) => Effect.succeedNow(Exit.fail(Maybe.some(e)))
              ),
            (leftChunk) =>
              leftChunk.isEmpty
                ? pull(new PullLeft(rightChunk), pullLeft, pullRight)
                : Effect.succeedNow(
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
                  Exit<Maybe<E2>, Tuple<[Chunk<Tuple<[K, C1]>>, DrainLeft]>>
                > =>
                  Effect.succeedNow(
                    Exit.succeed(
                      Tuple(
                        leftChunk.map(({ tuple: [k, a] }) => Tuple(k, left(a))),
                        new DrainLeft()
                      )
                    )
                  ),
                (e) => Effect.succeedNow(Exit.fail(Maybe.some(e)))
              ),
            (rightChunk) =>
              rightChunk.isEmpty
                ? pull(new PullRight(leftChunk), pullLeft, pullRight)
                : Effect.succeedNow(
                  Exit.succeed(mergeSortedByKeyChunk(leftChunk, rightChunk))
                )
          )
        }
      }
    }

    function mergeSortedByKeyChunk(
      leftChunk: Chunk<Tuple<[K, A]>>,
      rightChunk: Chunk<Tuple<[K, B]>>
    ): Tuple<[Chunk<Tuple<[K, C1 | C2 | C3]>>, State<K, A, B>]> {
      const builder = Chunk.builder<Tuple<[K, C1 | C2 | C3]>>()
      let state: State<K, A, B> | undefined
      let leftIndex = 0
      let rightIndex = 0
      let leftTuple = leftChunk.unsafeGet(leftIndex)
      let rightTuple = rightChunk.unsafeGet(rightIndex)
      let k1 = leftTuple.get(0)
      let a = leftTuple.get(1)
      let k2 = rightTuple.get(0)
      let b = rightTuple.get(1)
      let loop = true

      const hasNext = <T>(c: Chunk<T>, index: number) => index < c.size - 1

      while (loop) {
        const compare = ord.compare(k1, k2)

        if (compare === 0) {
          builder.append(Tuple(k1, both(a, b)))

          if (hasNext(leftChunk, leftIndex) && hasNext(rightChunk, rightIndex)) {
            leftIndex += 1
            rightIndex += 1
            leftTuple = leftChunk.unsafeGet(leftIndex)
            rightTuple = rightChunk.unsafeGet(rightIndex)
            k1 = leftTuple.get(0)
            a = leftTuple.get(1)
            k2 = rightTuple.get(0)
            b = rightTuple.get(1)
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
          builder.append(Tuple(k1, left(a)))

          if (hasNext(leftChunk, leftIndex)) {
            leftIndex += 1
            leftTuple = leftChunk.unsafeGet(leftIndex)
            k1 = leftTuple.get(0)
            a = leftTuple.get(1)
          } else {
            const rightBuilder = Chunk.builder<Tuple<[K, B]>>()
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
          builder.append(Tuple(k2, right(b)))

          if (hasNext(rightChunk, rightIndex)) {
            rightIndex += 1
            rightTuple = rightChunk.unsafeGet(rightIndex)
            k2 = rightTuple.get(0)
            b = rightTuple.get(1)
          } else {
            const leftBuilder = Chunk.builder<Tuple<[K, A]>>()
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

      return Tuple(builder.build(), state!)
    }

    return self.combineChunks(that, new PullBoth(), pull)
  }
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
 * @tsplus static ets/SortedByKey/Aspects zipAllSortedByKeyWith
 */
export const zipAllSortedByKeyWith = Pipeable(zipAllSortedByKeyWith_)
