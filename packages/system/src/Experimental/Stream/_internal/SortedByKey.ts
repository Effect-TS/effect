import * as A from "../../../Collections/Immutable/Chunk"
import * as Tp from "../../../Collections/Immutable/Tuple"
import * as T from "../../../Effect"
import * as Ex from "../../../Exit"
import { identity } from "../../../Function"
import * as O from "../../../Option"
import type { Stream } from "./core"
import { combineChunks_ } from "./core"

export type SortedByKey<R, E, K, A> = Stream<R, E, Tp.Tuple<[K, A]>>

export type KeyComparator<K> = (k1: K, k2: K) => number

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
  self: SortedByKey<R, E, K, A>,
  that: SortedByKey<R1, E1, K, B>,
  left: (a: A) => C1,
  right: (b: B) => C2,
  both: (a: A, b: B) => C3,
  comparator: KeyComparator<K>,
  exec: T.ExecutionStrategy
): Stream<R & R1, E | E1, Tp.Tuple<[K, C1 | C2 | C3]>> {
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
      const compare = comparator(k1, k2)

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

  return combineChunks_(self, that, new PullBoth(), pull)
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
  that: SortedByKey<R1, E1, K, B>,
  left: (a: A) => C1,
  right: (b: B) => C2,
  both: (a: A, b: B) => C3,
  comparator: KeyComparator<K>,
  exec: T.ExecutionStrategy
) {
  return <R, E>(self: SortedByKey<R, E, K, A>) =>
    zipAllSortedByKeyWithExec_(self, that, left, right, both, comparator, exec)
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
 */
export function zipAllSortedByKeyWith_<R, R1, E, E1, K, A, B, C1, C2, C3>(
  self: SortedByKey<R, E, K, A>,
  that: SortedByKey<R1, E1, K, B>,
  left: (a: A) => C1,
  right: (b: B) => C2,
  both: (a: A, b: B) => C3,
  comparator: KeyComparator<K>
): Stream<R & R1, E | E1, Tp.Tuple<[K, C1 | C2 | C3]>> {
  return zipAllSortedByKeyWithExec_(
    self,
    that,
    left,
    right,
    both,
    comparator,
    T.parallel
  )
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
 * @ets_data_first zipAllSortedByKeyWith_
 */
export function zipAllSortedByKeyWith<R1, E1, K, A, B, C1, C2, C3>(
  that: SortedByKey<R1, E1, K, B>,
  left: (a: A) => C1,
  right: (b: B) => C2,
  both: (a: A, b: B) => C3,
  comparator: KeyComparator<K>
) {
  return <R, E>(self: SortedByKey<R, E, K, A>) =>
    zipAllSortedByKeyWith_(self, that, left, right, both, comparator)
}

/**
 * Zips this stream that is sorted by distinct keys and the specified
 * stream that is sorted by distinct keys to produce a new stream that is
 * sorted by distinct keys. Keeps only values from that stream, using the
 * specified value `default` to fill in missing values.
 *
 * This allows zipping potentially unbounded streams of data by key in
 * constant space but the caller is responsible for ensuring that the
 * streams are sorted by distinct keys.
 */
export function zipAllSortedByKeyRight_<R, R1, E, E1, K, A, B>(
  self: SortedByKey<R, E, K, A>,
  that: Stream<R1, E1, Tp.Tuple<[K, B]>>,
  default_: B,
  comparator: KeyComparator<K>
): Stream<R & R1, E | E1, Tp.Tuple<[K, B]>> {
  return zipAllSortedByKeyWith_(
    self,
    that,
    (_) => default_,
    identity,
    (_, b) => b,
    comparator
  )
}

/**
 * Zips this stream that is sorted by distinct keys and the specified
 * stream that is sorted by distinct keys to produce a new stream that is
 * sorted by distinct keys. Keeps only values from that stream, using the
 * specified value `default` to fill in missing values.
 *
 * This allows zipping potentially unbounded streams of data by key in
 * constant space but the caller is responsible for ensuring that the
 * streams are sorted by distinct keys.
 *
 * @ets_data_first zipAllSortedByKeyRight_
 */
export function zipAllSortedByKeyRight<R1, E1, K, A, B>(
  that: Stream<R1, E1, Tp.Tuple<[K, B]>>,
  default_: B,
  comparator: KeyComparator<K>
) {
  return <R, E>(self: SortedByKey<R, E, K, A>) =>
    zipAllSortedByKeyRight_(self, that, default_, comparator)
}

/**
 * Zips this stream that is sorted by distinct keys and the specified
 * stream that is sorted by distinct keys to produce a new stream that is
 * sorted by distinct keys. Keeps only values from this stream, using the
 * specified value `default` to fill in missing values.
 *
 * This allows zipping potentially unbounded streams of data by key in
 * constant space but the caller is responsible for ensuring that the
 * streams are sorted by distinct keys.
 */
export function zipAllSortedByKeyLeft_<R, R1, E, E1, K, A, B>(
  self: SortedByKey<R, E, K, A>,
  that: Stream<R1, E1, Tp.Tuple<[K, B]>>,
  default_: A,
  comparator: KeyComparator<K>
): Stream<R & R1, E | E1, Tp.Tuple<[K, A]>> {
  return zipAllSortedByKeyWith_(
    self,
    that,
    identity,
    (_) => default_,
    (a, _) => a,
    comparator
  )
}

/**
 * Zips this stream that is sorted by distinct keys and the specified
 * stream that is sorted by distinct keys to produce a new stream that is
 * sorted by distinct keys. Keeps only values from this stream, using the
 * specified value `default` to fill in missing values.
 *
 * This allows zipping potentially unbounded streams of data by key in
 * constant space but the caller is responsible for ensuring that the
 * streams are sorted by distinct keys.
 *
 * @ets_data_first zipAllSortedByKeyLeft_
 */
export function zipAllSortedByKeyLeft<R1, E1, K, A, B>(
  that: Stream<R1, E1, Tp.Tuple<[K, B]>>,
  default_: A,
  comparator: KeyComparator<K>
) {
  return <R, E>(self: SortedByKey<R, E, K, A>) =>
    zipAllSortedByKeyLeft_(self, that, default_, comparator)
}

/**
 * Zips this stream that is sorted by distinct keys and the specified
 * stream that is sorted by distinct keys to produce a new stream that is
 * sorted by distinct keys. Combines values associated with each key into a
 * tuple, using the specified values `defaultLeft` and `defaultRight` to
 * fill in missing values.
 *
 * This allows zipping potentially unbounded streams of data by key in
 * constant space but the caller is responsible for ensuring that the
 * streams are sorted by distinct keys.
 */
export function zipAllSortedByKey_<R, R1, E, E1, K, A, B>(
  self: SortedByKey<R, E, K, A>,
  that: Stream<R1, E1, Tp.Tuple<[K, B]>>,
  defaultLeft: A,
  defaultRight: B,
  comparator: KeyComparator<K>
): Stream<R & R1, E | E1, Tp.Tuple<[K, Tp.Tuple<[A, B]>]>> {
  return zipAllSortedByKeyWith_(
    self,
    that,
    (_) => Tp.tuple(_, defaultRight),
    (_) => Tp.tuple(defaultLeft, _),
    (a, b) => Tp.tuple(a, b),
    comparator
  )
}

/**
 * Zips this stream that is sorted by distinct keys and the specified
 * stream that is sorted by distinct keys to produce a new stream that is
 * sorted by distinct keys. Combines values associated with each key into a
 * tuple, using the specified values `defaultLeft` and `defaultRight` to
 * fill in missing values.
 *
 * This allows zipping potentially unbounded streams of data by key in
 * constant space but the caller is responsible for ensuring that the
 * streams are sorted by distinct keys.
 *
 * @ets_data_first zipAllSortedByKey_
 */
export function zipAllSortedByKey<R1, E1, K, A, B>(
  that: Stream<R1, E1, Tp.Tuple<[K, B]>>,
  defaultLeft: A,
  defaultRight: B,
  comparator: KeyComparator<K>
) {
  return <R, E>(self: SortedByKey<R, E, K, A>) =>
    zipAllSortedByKey_(self, that, defaultLeft, defaultRight, comparator)
}
