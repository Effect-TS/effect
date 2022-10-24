import type { Order } from "@fp-ts/core/typeclass/Order"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"

/** @internal */
type State<K, A, B> =
  | DrainLeft
  | DrainRight
  | PullBoth
  | PullLeft<K, B>
  | PullRight<K, A>

/** @internal */
class DrainLeft {
  readonly _tag = "DrainLeft"
}

/** @internal */
class DrainRight {
  readonly _tag = "DrainRight"
}

/** @internal */
class PullBoth {
  readonly _tag = "PullBoth"
}

/** @internal */
class PullLeft<K, B> {
  readonly _tag = "PullLeft"
  constructor(readonly rightChunk: Chunk.Chunk<readonly [K, B]>) {}
}

/** @internal */
class PullRight<K, A> {
  readonly _tag = "PullRight"
  constructor(readonly leftChunk: Chunk.Chunk<readonly [K, A]>) {}
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
 * @category mutations
 * @since 1.0.0
 */
export function zipAllSortedByKeyWith<K, R2, E2, A2, A, C1, C2, C3>(
  order: Order<K>,
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
      pullLeft: Effect<R, Option.Option<E>, Chunk.Chunk<readonly [K, A]>>,
      pullRight: Effect<R2, Option.Option<E2>, Chunk.Chunk<readonly [K, A2]>>
    ): Effect<
      R | R2,
      never,
      Exit<
        Option.Option<E | E2>,
        readonly [Chunk.Chunk<readonly [K, C1 | C2 | C3]>, State<K, A, A2>]
      >
    > => {
      switch (state._tag) {
        case "DrainLeft":
          return pullLeft.fold(
            (e) => Exit.fail(e),
            (leftChunk) =>
              Exit.succeed(
                [
                  pipe(leftChunk, Chunk.map(([k, a]) => [k, left(a)] as const)),
                  new DrainLeft()
                ] as const
              )
          )
        case "DrainRight":
          return pullRight.fold(
            (e) => Exit.fail(e),
            (rightChunk) =>
              Exit.succeed(
                [
                  pipe(rightChunk, Chunk.map(([k, b]) => [k, right(b)] as const)),
                  new DrainRight()
                ] as const
              )
          )
        case "PullBoth": {
          return pullLeft
            .unsome
            .zipPar(pullRight.unsome)
            .foldEffect(
              (e) => Effect.succeed(Exit.fail(Option.some(e))),
              ([a, b]) => {
                if (Option.isSome(a) && Option.isSome(b)) {
                  const leftChunk = a.value
                  const rightChunk = b.value

                  if (Chunk.isEmpty(leftChunk) && Chunk.isEmpty(rightChunk)) {
                    return pull(new PullBoth(), pullLeft, pullRight)
                  } else if (Chunk.isEmpty(leftChunk)) {
                    return pull(new PullLeft(rightChunk), pullLeft, pullRight)
                  } else if (Chunk.isEmpty(rightChunk)) {
                    return pull(new PullRight(leftChunk), pullLeft, pullRight)
                  } else {
                    return Effect.succeed(
                      Exit.succeed(mergeSortedByKeyChunk(leftChunk, rightChunk))
                    )
                  }
                } else if (Option.isSome(a)) {
                  const leftChunk = a.value

                  return Chunk.isEmpty(leftChunk)
                    ? pull(new DrainLeft(), pullLeft, pullRight)
                    : Effect.succeed(
                      Exit.succeed(
                        [
                          pipe(leftChunk, Chunk.map(([k, a]) => [k, left(a)] as const)),
                          new DrainLeft()
                        ] as const
                      )
                    )
                } else if (Option.isSome(b)) {
                  const rightChunk = b.value

                  return Chunk.isEmpty(rightChunk)
                    ? pull(new DrainLeft(), pullLeft, pullRight)
                    : Effect.succeed(
                      Exit.succeed(
                        [
                          pipe(rightChunk, Chunk.map(([k, b]) => [k, right(b)])),
                          new DrainRight()
                        ] as const
                      )
                    )
                } else {
                  return Effect.succeed(Exit.fail(Option.none))
                }
              }
            )
        }
        case "PullLeft": {
          const rightChunk = state.rightChunk

          return pullLeft.foldEffect(
            (option) => {
              switch (option._tag) {
                case "None": {
                  return Effect.succeed(
                    Exit.succeed([
                      pipe(rightChunk, Chunk.map(([k, b]) => [k, right(b)])),
                      new DrainRight()
                    ])
                  )
                }
                case "Some": {
                  return Effect.succeed(Exit.fail(Option.some(option.value)))
                }
              }
            },
            (leftChunk) =>
              Chunk.isEmpty(leftChunk)
                ? pull(new PullLeft(rightChunk), pullLeft, pullRight)
                : Effect.succeed(
                  Exit.succeed(mergeSortedByKeyChunk(leftChunk, rightChunk))
                )
          )
        }
        case "PullRight": {
          const leftChunk = state.leftChunk

          return pullRight.foldEffect(
            (option) => {
              switch (option._tag) {
                case "None": {
                  return Effect.succeed(
                    Exit.succeed(
                      [
                        pipe(leftChunk, Chunk.map(([k, a]) => [k, left(a)] as const)),
                        new DrainLeft()
                      ] as const
                    )
                  )
                }
                case "Some": {
                  return Effect.succeed(Exit.fail(Option.some(option.value)))
                }
              }
            },
            (rightChunk) =>
              Chunk.isEmpty(rightChunk)
                ? pull(new PullRight(leftChunk), pullLeft, pullRight)
                : Effect.succeed(
                  Exit.succeed(mergeSortedByKeyChunk(leftChunk, rightChunk))
                )
          )
        }
      }
    }

    function mergeSortedByKeyChunk(
      leftChunk: Chunk.Chunk<readonly [K, A]>,
      rightChunk: Chunk.Chunk<readonly [K, A2]>
    ): readonly [Chunk.Chunk<readonly [K, C1 | C2 | C3]>, State<K, A, A2>] {
      const builder: Array<readonly [K, C1 | C2 | C3]> = []
      let state: State<K, A, A2> | undefined
      let leftIndex = 0
      let rightIndex = 0
      let leftTuple = pipe(leftChunk, Chunk.unsafeGet(leftIndex))
      let rightTuple = pipe(rightChunk, Chunk.unsafeGet(rightIndex))
      let k1 = leftTuple[0]
      let a = leftTuple[1]
      let k2 = rightTuple[0]
      let b = rightTuple[1]
      let loop = true

      const hasNext = <T>(c: Chunk.Chunk<T>, index: number) => index < c.length - 1

      while (loop) {
        const compare = order.compare(k2)(k1)

        if (compare === 0) {
          builder.push([k1, both(a, b)] as const)

          if (hasNext(leftChunk, leftIndex) && hasNext(rightChunk, rightIndex)) {
            leftIndex += 1
            rightIndex += 1
            leftTuple = pipe(leftChunk, Chunk.unsafeGet(leftIndex))
            rightTuple = pipe(rightChunk, Chunk.unsafeGet(rightIndex))
            k1 = leftTuple[0]
            a = leftTuple[1]
            k2 = rightTuple[0]
            b = rightTuple[1]
          } else if (hasNext(leftChunk, leftIndex)) {
            state = new PullRight(pipe(leftChunk, Chunk.drop(leftIndex + 1)))
            loop = false
          } else if (hasNext(rightChunk, rightIndex)) {
            state = new PullLeft(pipe(rightChunk, Chunk.drop(rightIndex + 1)))
            loop = false
          } else {
            state = new PullBoth()
            loop = false
          }
        } else if (compare < 0) {
          builder.push([k1, left(a)])

          if (hasNext(leftChunk, leftIndex)) {
            leftIndex += 1
            leftTuple = pipe(leftChunk, Chunk.unsafeGet(leftIndex))
            k1 = leftTuple[0]
            a = leftTuple[1]
          } else {
            const rightBuilder: Array<readonly [K, A2]> = []
            rightBuilder.push(rightTuple)

            while (hasNext(rightChunk, rightIndex)) {
              rightIndex += 1
              rightTuple = pipe(rightChunk, Chunk.unsafeGet(rightIndex))
              rightBuilder.push(rightTuple)
              state = new PullLeft(Chunk.unsafeFromArray(rightBuilder))
              loop = false
            }
          }
        } else {
          builder.push([k2, right(b)])

          if (hasNext(rightChunk, rightIndex)) {
            rightIndex += 1
            rightTuple = pipe(rightChunk, Chunk.unsafeGet(rightIndex))
            k2 = rightTuple[0]
            b = rightTuple[1]
          } else {
            const leftBuilder: Array<readonly [K, A]> = []
            leftBuilder.push(leftTuple)

            while (hasNext(leftChunk, leftIndex)) {
              leftIndex += 1
              leftTuple = pipe(leftChunk, Chunk.unsafeGet(leftIndex))
              leftBuilder.push(leftTuple)
              state = new PullRight(Chunk.unsafeFromArray(leftBuilder))
              loop = false
            }
          }
        }
      }

      return [Chunk.unsafeFromArray(builder), state!]
    }

    return self.combineChunks(that, new PullBoth(), pull)
  }
}
