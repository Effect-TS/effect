// ets_tracing: off

import * as A from "../../../Collections/Immutable/Chunk/index.js"
import * as Tp from "../../../Collections/Immutable/Tuple/index.js"
import * as T from "../../../Effect/index.js"
import * as Ex from "../../../Exit/index.js"
import * as O from "../../../Option/index.js"
import type * as OD from "../../../Ord/index.js"
import * as CombineChunks from "../_internal/api/combineChunks.js"
import type * as S from "../_internal/core.js"
import type * as C from "./core.js"

class DrainLeft {
  readonly _tag = "DrainLeft"
}

class DrainRight {
  readonly _tag = "DrainRight"
}

class PullBoth {
  readonly _tag = "PullBoth"
}

class PullLeft<K, B> {
  readonly _tag = "PullLeft"
  constructor(readonly rightChunk: A.Chunk<Tp.Tuple<[K, B]>>) {}
}

class PullRight<K, A> {
  readonly _tag = "PullRight"
  constructor(readonly leftChunk: A.Chunk<Tp.Tuple<[K, A]>>) {}
}

type State<K, A, B> =
  | DrainLeft
  | DrainRight
  | PullBoth
  | PullLeft<K, B>
  | PullRight<K, A>

/**
 * Zips this stream that is sorted by distinct keys and the specified
 * stream that is sorted by distinct keys to produce a new stream that is
 * sorted by distinct keys. Uses the functions `left`, `right`, and `both`
 * to handle the cases where a key and value exist in this stream, that
 * stream, or both streams.
 *
 * This allows zipping potentially unbounded streams of data by key in
 * constant space but the caller is responsible for ensuring that the
 * streams are sorted by distinct keys.
 *
 * The execution strategy `exec` will be used to determine whether to pull
 * from the streams sequentially or in parallel.
 */
export function zipAllSortedByKeyWithExec_<R, R1, E, E1, K, A, B, C1, C2, C3>(
  self: C.SortedByKey<R, E, K, A>,
  that: C.SortedByKey<R1, E1, K, B>,
  left: (a: A) => C1,
  right: (b: B) => C2,
  both: (a: A, b: B) => C3,
  ord: OD.Ord<K>,
  exec: T.ExecutionStrategy
): S.Stream<R & R1, E | E1, Tp.Tuple<[K, C1 | C2 | C3]>> {
  const pull = (
    state: State<K, A, B>,
    pullLeft: T.Effect<R, O.Option<E>, A.Chunk<Tp.Tuple<[K, A]>>>,
    pullRight: T.Effect<R1, O.Option<E1>, A.Chunk<Tp.Tuple<[K, B]>>>
  ): T.Effect<
    R & R1,
    never,
    Ex.Exit<
      O.Option<E | E1>,
      Tp.Tuple<[A.Chunk<Tp.Tuple<[K, C1 | C2 | C3]>>, State<K, A, B>]>
    >
  > => {
    switch (state._tag) {
      case "DrainLeft":
        return T.fold_(
          pullLeft,
          (e) => Ex.fail(e),
          (leftChunk) =>
            Ex.succeed(
              Tp.tuple(
                A.map_(leftChunk, ({ tuple: [k, a] }) => Tp.tuple(k, left(a))),
                new DrainLeft()
              )
            )
        )
      case "DrainRight":
        return T.fold_(
          pullRight,
          (e) => Ex.fail(e),
          (rightChunk) =>
            Ex.succeed(
              Tp.tuple(
                A.map_(rightChunk, ({ tuple: [k, b] }) => Tp.tuple(k, right(b))),
                new DrainRight()
              )
            )
        )
      case "PullBoth": {
        switch (exec._tag) {
          case "Sequential":
            return T.foldM_(
              pullLeft,
              O.fold(
                () => pull(new DrainRight(), pullLeft, pullRight),
                (e) => T.succeed(Ex.fail(O.some(e)))
              ),
              (leftChunk) =>
                A.isEmpty(leftChunk)
                  ? pull(new PullBoth(), pullLeft, pullRight)
                  : pull(new PullRight(leftChunk), pullLeft, pullRight)
            )
          default:
            return T.foldM_(
              T.zipPar_(T.unsome(pullLeft), T.unsome(pullRight)),
              (e) => T.succeed(Ex.fail(O.some(e))),
              ({ tuple: [a, b] }) => {
                if (O.isSome(a) && O.isSome(b)) {
                  const leftChunk = a.value
                  const rightChunk = b.value

                  if (A.isEmpty(leftChunk) && A.isEmpty(rightChunk)) {
                    return pull(new PullBoth(), pullLeft, pullRight)
                  } else if (A.isEmpty(leftChunk)) {
                    return pull(new PullLeft(rightChunk), pullLeft, pullRight)
                  } else if (A.isEmpty(rightChunk)) {
                    return pull(new PullRight(leftChunk), pullLeft, pullRight)
                  } else {
                    return T.succeed(
                      Ex.succeed(mergeSortedByKeyChunk(leftChunk, rightChunk))
                    )
                  }
                } else if (O.isSome(a)) {
                  const leftChunk = a.value

                  return A.isEmpty(leftChunk)
                    ? pull(new DrainLeft(), pullLeft, pullRight)
                    : T.succeed(
                        Ex.succeed(
                          Tp.tuple(
                            A.map_(leftChunk, ({ tuple: [k, a] }) =>
                              Tp.tuple(k, left(a))
                            ),
                            new DrainLeft()
                          )
                        )
                      )
                } else if (O.isSome(b)) {
                  const rightChunk = b.value

                  return A.isEmpty(rightChunk)
                    ? pull(new DrainLeft(), pullLeft, pullRight)
                    : T.succeed(
                        Ex.succeed(
                          Tp.tuple(
                            A.map_(rightChunk, ({ tuple: [k, b] }) =>
                              Tp.tuple(k, right(b))
                            ),
                            new DrainRight()
                          )
                        )
                      )
                } else {
                  return T.succeed(Ex.fail(O.none))
                }
              }
            )
        }
      }
      case "PullLeft": {
        const rightChunk = state.rightChunk

        return T.foldM_(
          pullLeft,
          O.fold(
            (): T.Effect<
              unknown,
              never,
              Ex.Exit<O.Option<E>, Tp.Tuple<[A.Chunk<Tp.Tuple<[K, C2]>>, DrainRight]>>
            > =>
              T.succeed(
                Ex.succeed(
                  Tp.tuple(
                    A.map_(rightChunk, ({ tuple: [k, b] }) => Tp.tuple(k, right(b))),
                    new DrainRight()
                  )
                )
              ),
            (e) => T.succeed(Ex.fail(O.some(e)))
          ),
          (leftChunk) =>
            A.isEmpty(leftChunk)
              ? pull(new PullLeft(rightChunk), pullLeft, pullRight)
              : T.succeed(Ex.succeed(mergeSortedByKeyChunk(leftChunk, rightChunk)))
        )
      }
      case "PullRight": {
        const leftChunk = state.leftChunk

        return T.foldM_(
          pullRight,
          O.fold(
            (): T.Effect<
              unknown,
              never,
              Ex.Exit<O.Option<E1>, Tp.Tuple<[A.Chunk<Tp.Tuple<[K, C1]>>, DrainLeft]>>
            > =>
              T.succeed(
                Ex.succeed(
                  Tp.tuple(
                    A.map_(leftChunk, ({ tuple: [k, a] }) => Tp.tuple(k, left(a))),
                    new DrainLeft()
                  )
                )
              ),
            (e) => T.succeed(Ex.fail(O.some(e)))
          ),
          (rightChunk) =>
            A.isEmpty(rightChunk)
              ? pull(new PullRight(leftChunk), pullLeft, pullRight)
              : T.succeed(Ex.succeed(mergeSortedByKeyChunk(leftChunk, rightChunk)))
        )
      }
    }
  }

  const mergeSortedByKeyChunk = (
    leftChunk: A.Chunk<Tp.Tuple<[K, A]>>,
    rightChunk: A.Chunk<Tp.Tuple<[K, B]>>
  ): Tp.Tuple<[A.Chunk<Tp.Tuple<[K, C1 | C2 | C3]>>, State<K, A, B>]> => {
    const builder = A.builder<Tp.Tuple<[K, C1 | C2 | C3]>>()
    let state: State<K, A, B> | undefined
    let leftIndex = 0
    let rightIndex = 0
    let leftTuple = A.unsafeGet_(leftChunk, leftIndex)
    let rightTuple = A.unsafeGet_(rightChunk, rightIndex)
    let k1 = leftTuple.get(0)
    let a = leftTuple.get(1)
    let k2 = rightTuple.get(0)
    let b = rightTuple.get(1)
    let loop = true

    const hasNext = <T>(c: A.Chunk<T>, index: number) => index < A.size(c) - 1

    while (loop) {
      const compare = ord.compare(k1, k2)

      if (compare === 0) {
        builder.append(Tp.tuple(k1, both(a, b)))

        if (hasNext(leftChunk, leftIndex) && hasNext(rightChunk, rightIndex)) {
          leftIndex += 1
          rightIndex += 1
          leftTuple = A.unsafeGet_(leftChunk, leftIndex)
          rightTuple = A.unsafeGet_(rightChunk, rightIndex)
          k1 = leftTuple.get(0)
          a = leftTuple.get(1)
          k2 = rightTuple.get(0)
          b = rightTuple.get(1)
        } else if (hasNext(leftChunk, leftIndex)) {
          state = new PullRight(A.drop_(leftChunk, leftIndex + 1))
          loop = false
        } else if (hasNext(rightChunk, rightIndex)) {
          state = new PullLeft(A.drop_(rightChunk, rightIndex + 1))
          loop = false
        } else {
          state = new PullBoth()
          loop = false
        }
      } else if (compare < 0) {
        builder.append(Tp.tuple(k1, left(a)))

        if (hasNext(leftChunk, leftIndex)) {
          leftIndex += 1
          leftTuple = A.unsafeGet_(leftChunk, leftIndex)
          k1 = leftTuple.get(0)
          a = leftTuple.get(1)
        } else {
          const rightBuilder = A.builder<Tp.Tuple<[K, B]>>()
          rightBuilder.append(rightTuple)

          while (hasNext(rightChunk, rightIndex)) {
            rightIndex += 1
            rightTuple = A.unsafeGet_(rightChunk, rightIndex)
            rightBuilder.append(rightTuple)
            state = new PullLeft(rightBuilder.build())
            loop = false
          }
        }
      } else {
        builder.append(Tp.tuple(k2, right(b)))

        if (hasNext(rightChunk, rightIndex)) {
          rightIndex += 1
          rightTuple = A.unsafeGet_(rightChunk, rightIndex)
          k2 = rightTuple.get(0)
          b = rightTuple.get(1)
        } else {
          const leftBuilder = A.builder<Tp.Tuple<[K, A]>>()
          leftBuilder.append(leftTuple)

          while (hasNext(leftChunk, leftIndex)) {
            leftIndex += 1
            leftTuple = A.unsafeGet_(leftChunk, leftIndex)
            leftBuilder.append(leftTuple)
            state = new PullRight(leftBuilder.build())
            loop = false
          }
        }
      }
    }

    return Tp.tuple(builder.build(), state!)
  }

  return CombineChunks.combineChunks_(self, that, new PullBoth(), pull)
}

/**
 * Zips this stream that is sorted by distinct keys and the specified
 * stream that is sorted by distinct keys to produce a new stream that is
 * sorted by distinct keys. Uses the functions `left`, `right`, and `both`
 * to handle the cases where a key and value exist in this stream, that
 * stream, or both streams.
 *
 * This allows zipping potentially unbounded streams of data by key in
 * constant space but the caller is responsible for ensuring that the
 * streams are sorted by distinct keys.
 *
 * The execution strategy `exec` will be used to determine whether to pull
 * from the streams sequentially or in parallel.
 *
 * @ets_data_first zipAllSortedByKeyWithExec_
 */
export function zipAllSortedByKeyWithExec<R1, E1, K, A, B, C1, C2, C3>(
  that: C.SortedByKey<R1, E1, K, B>,
  left: (a: A) => C1,
  right: (b: B) => C2,
  both: (a: A, b: B) => C3,
  ord: OD.Ord<K>,
  exec: T.ExecutionStrategy
) {
  return <R, E>(self: C.SortedByKey<R, E, K, A>) =>
    zipAllSortedByKeyWithExec_(self, that, left, right, both, ord, exec)
}
