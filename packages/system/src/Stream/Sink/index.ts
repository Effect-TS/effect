import * as A from "../../Array"
import * as C from "../../Cause/core"
import * as E from "../../Either"
import * as Ex from "../../Exit/api"
import * as F from "../../Fiber/api"
import { pipe, tuple } from "../../Function"
import * as O from "../../Option"
import * as R from "../../Ref"
import * as Push from "../Push"
import * as T from "../_internal/effect"
import * as M from "../_internal/managed"

// Important notes while writing sinks and combinators:
// - What return values for sinks mean:
//   Effect.unit - "need more values"
//   Effect.fail([Either.Right(z), l]) - "ended with z and emit leftover l"
//   Effect.fail([Either.Left(e), l]) - "failed with e and emit leftover l"
// - Result of processing of the stream using the sink must not depend on how the stream is chunked
//   (chunking-invariance)
//   pipe(stream, run(sink), Effect.either) === pipe(stream, chunkN(1), run(sink), Effect.either)
// - Sinks should always end when receiving a `None`. It is a defect to not end with some
//   sort of result (even a failure) when receiving a `None`.
// - Sinks can assume they will not be pushed again after emitting a value.
export class Sink<S, R, E, I, L, Z> {
  constructor(readonly push: M.Managed<S, R, never, Push.Push<S, R, E, I, L, Z>>) {}
}

/**
 * Creates a sink from a Push
 */
export const fromPush = <S, R, E, I, L, Z>(push: Push.Push<S, R, E, I, L, Z>) =>
  new Sink(M.succeedNow(push))

/**
 * A sink that immediately ends with the specified value.
 */
export const succeed = <Z, I>(z: Z): Sink<never, unknown, never, I, I, Z> =>
  fromPush<never, unknown, never, I, I, Z>((c) => {
    const leftover = O.fold_(
      c,
      () => [] as A.Array<I>,
      (x) => x
    )

    return Push.emit(z, leftover)
  })

/**
 * A sink that effectfully folds its input chunks with the provided function, termination predicate and initial state.
 * `contFn` condition is checked only for the initial value and at the end of processing of each chunk.
 * `f` and `contFn` must preserve chunking-invariance.
 */
export const foldArraysM = <Z>(z: Z) => (contFn: (s: Z) => boolean) => <I, S, R, E>(
  f: (s: Z, i: A.Array<I>) => T.Effect<S, R, E, Z>
): Sink<S, R, E, I, I, Z> => {
  if (contFn(z)) {
    return new Sink(
      pipe(
        M.of,
        M.bind("state", () => pipe(R.makeRef(z), T.toManaged())),
        M.let("push", ({ state }) => (is: O.Option<A.Array<I>>) => {
          switch (is._tag) {
            case "None": {
              return pipe(
                state.get,
                T.chain((s) => Push.emit(s, []))
              )
            }
            case "Some": {
              return pipe(
                state.get,
                T.chain((s) =>
                  pipe(
                    f(s, is.value),
                    T.mapError(
                      (e) => [E.left(e), []] as [E.Either<E, never>, A.Array<I>]
                    ),
                    T.chain((s) =>
                      contFn(s)
                        ? pipe(
                            state.set(s),
                            T.chain(() => Push.more)
                          )
                        : Push.emit(s, [])
                    )
                  )
                )
              )
            }
          }
        }),
        M.map(({ push }) => push)
      )
    )
  } else {
    return succeed<Z, I>(z)
  }
}

/**
 * A sink that folds its input chunks with the provided function, termination predicate and initial state.
 * `contFn` condition is checked only for the initial value and at the end of processing of each chunk.
 * `f` and `contFn` must preserve chunking-invariance.
 */
export const foldArrays = <Z>(z: Z) => (contFn: (s: Z) => boolean) => <I>(
  f: (s: Z, i: A.Array<I>) => Z
): Sink<never, unknown, never, I, I, Z> =>
  foldArraysM(z)(contFn)((z, i: A.Array<I>) => T.succeedNow(f(z, i)))

/**
 * A sink that folds its input chunks with the provided function and initial state.
 * `f` must preserve chunking-invariance.
 */
export const foldLeftArrays = <Z>(z: Z) => <I>(f: (s: Z, i: A.Array<I>) => Z) =>
  foldArrays(z)(() => true)(f)

/**
 * A sink that collects all of its inputs into an array.
 */
export const collectAll = <A>(): Sink<never, unknown, never, A, A, A.Array<A>> =>
  foldLeftArrays([] as A.Array<A>)((s, i: A.Array<A>) => [...s, ...i])

/**
 * Runs both sinks in parallel on the input, returning the result or the error from the
 * one that finishes first.
 */
export const raceBoth = <S1, R1, E1, I1 extends I, L1, Z1, I>(
  that: Sink<S1, R1, E1, I1, L1, Z1>
) => <S, R, E, L, Z>(
  self: Sink<S, R, E, I, L, Z>
): Sink<unknown, R1 & R, E1 | E, I1, L1 | L, E.Either<Z, Z1>> =>
  new Sink(
    pipe(
      M.of,
      M.bind("p1", () => self.push),
      M.bind("p2", () => that.push),
      M.let("push", ({ p1, p2 }) => (i: O.Option<A.Array<I1>>): T.Effect<
        unknown,
        R1 & R,
        readonly [E.Either<E | E1, E.Either<Z, Z1>>, A.Array<L | L1>],
        void
      > =>
        pipe(
          T.raceWith(
            p1(i),
            p2(i),
            (res1, fib2) =>
              pipe(
                res1,
                Ex.foldM(
                  (f) =>
                    pipe(
                      fib2,
                      F.interrupt,
                      T.chain(() =>
                        T.halt(
                          pipe(
                            f,
                            C.map(([r, leftover]) =>
                              tuple(
                                E.map_(r, (x) => E.left(x)),
                                leftover
                              )
                            )
                          )
                        )
                      )
                    ),
                  () =>
                    pipe(
                      fib2,
                      F.join,
                      T.mapError(([r, leftover]) =>
                        tuple(
                          E.map_(r, (x) => E.right(x)),
                          leftover
                        )
                      )
                    )
                )
              ),
            (res2, fib1) =>
              pipe(
                res2,
                Ex.foldM(
                  (f) =>
                    pipe(
                      fib1,
                      F.interrupt,
                      T.chain(() =>
                        T.halt(
                          pipe(
                            f,
                            C.map(([r, leftover]) =>
                              tuple(
                                E.map_(r, (x) => E.right(x)),
                                leftover
                              )
                            )
                          )
                        )
                      )
                    ),
                  () =>
                    pipe(
                      fib1,
                      F.join,
                      T.mapError(([r, leftover]) =>
                        tuple(
                          E.map_(r, (x) => E.left(x)),
                          leftover
                        )
                      )
                    )
                )
              )
          )
        )
      ),
      M.map(({ push }) => push)
    )
  )

/**
 * A sink that executes the provided effectful function for every element fed to it.
 */
export const foreach = <I, S1, R1, E1>(f: (i: I) => T.Effect<S1, R1, E1, any>) => {
  const go = (
    chunk: A.Array<I>,
    idx: number,
    len: number
  ): T.Effect<S1, R1, [E.Either<E1, never>, A.Array<I>], void> => {
    if (idx === len) {
      return Push.more
    } else {
      return pipe(
        f(chunk[idx]),
        T.foldM(
          (e) => Push.fail(e, A.dropLeft_(chunk, idx + 1)),
          () => go(chunk, idx + 1, len)
        )
      )
    }
  }

  return fromPush(
    O.fold(
      () => Push.emit<never, void>(undefined, []),
      (is: A.Array<I>) => go(is, 0, is.length)
    )
  )
}
