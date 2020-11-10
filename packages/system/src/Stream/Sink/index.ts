import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import * as A from "../../Array"
import * as C from "../../Cause/core"
import * as E from "../../Either"
import * as Ex from "../../Exit/api"
import * as F from "../../Fiber/api"
import { pipe } from "../../Function"
import * as O from "../../Option"
import * as R from "../../Ref"
import * as Push from "../Push"

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
export class Sink<R, E, I, L, Z> {
  constructor(readonly push: M.Managed<R, never, Push.Push<R, E, I, L, Z>>) {}
}

/**
 * Replaces this sink's result with the provided value.
 */
export function as_<R, E, I, L, Z, Z1>(
  self: Sink<R, E, I, L, Z>,
  z: Z1
): Sink<R, E, I, L, Z1> {
  return map_(self, (_) => z)
}

/**
 * Replaces this sink's result with the provided value.
 */
export function as<Z1>(z: Z1) {
  return <R, E, I, L, Z>(self: Sink<R, E, I, L, Z>) => as_(self, z)
}

/**
 * Repeatedly runs the sink for as long as its results satisfy
 * the predicate `p`. The sink's results will be accumulated
 * using the stepping function `f`.
 */
export function collectAllWhileWith_<R, E, I, L, Z, S>(
  self: Sink<R, E, I, L, Z>,
  z: S,
  p: (z: Z) => boolean,
  f: (s: S, z: Z) => S
): Sink<R, E, I, L, S> {
  return new Sink(
    pipe(
      R.makeManagedRef(z),
      M.chain((acc) => {
        return pipe(
          Push.restartable(self.push),
          M.map(([push, restart]) => {
            const go = (
              s: S,
              in_: O.Option<A.Array<I>>,
              end: boolean
            ): T.Effect<R, [E.Either<E, S>, A.Array<L>], S> =>
              T.catchAll_(T.as_(push(in_), s), ([e, leftover]) =>
                E.fold_(
                  e,
                  (e) => Push.fail(e, leftover),
                  (z) => {
                    if (p(z)) {
                      const s1 = f(s, z)

                      if (leftover.length === 0) {
                        if (end) {
                          return Push.emit(s1, A.empty)
                        } else {
                          return T.as_(restart, s1)
                        }
                      } else {
                        return T.andThen_(
                          restart,
                          go(s1, O.some((leftover as unknown) as A.Array<I>), end)
                        )
                      }
                    } else {
                      return Push.emit(s, leftover)
                    }
                  }
                )
              )

            return (in_: O.Option<A.Array<I>>) =>
              T.chain_(acc.get, (s) =>
                T.chain_(go(s, in_, O.isNone(in_)), (s1) => acc.set(s1))
              )
          })
        )
      })
    )
  )
}

/**
 * Repeatedly runs the sink for as long as its results satisfy
 * the predicate `p`. The sink's results will be accumulated
 * using the stepping function `f`.
 */
export function collectAllWhileWith<S, Z>(
  z: S,
  p: (z: Z) => boolean,
  f: (s: S, z: Z) => S
) {
  return <R, E, I, L>(self: Sink<R, E, I, L, Z>) => collectAllWhileWith_(self, z, p, f)
}

/**
 * Runs this sink until it yields a result, then uses that result to create another
 * sink from the provided function which will continue to run until it yields a result.
 *
 * This function essentially runs sinks in sequence.
 */
export function chain_<R, R1, E, E1, I, I2, L, L2, Z, Z2>(
  self: Sink<R, E, I, L, Z>,
  f: (z: Z) => Sink<R1, E1, I2, L2, Z2>
) {
  return foldM_(self, (e) => fail<E, L>(e), f)
}

/**
 * Runs this sink until it yields a result, then uses that result to create another
 * sink from the provided function which will continue to run until it yields a result.
 *
 * This function essentially runs sinks in sequence.
 */
export function chain<Z, R, R1, E1, I1, L1, Z1>(f: (z: Z) => Sink<R1, E1, I1, L1, Z1>) {
  return <E, I, L>(self: Sink<R, E, I, L, Z>) => chain_(self, f)
}

/**
 * Recovers from errors by accepting one effect to execute for the case of an
 * error, and one effect to execute for the case of success.
 *
 * This method has better performance than `either` since no intermediate
 * value is allocated and does not require subsequent calls to `flatMap` to
 * define the next effect.
 *
 * The error parameter of the returned `IO` may be chosen arbitrarily, since
 * it will depend on the `IO`s returned by the given continuations.
 */
export function foldM_<R, E, I, L, Z, R1, E1, I1, L1, Z1, R2, E2, I2, L2, Z2>(
  self: Sink<R, E, I, L, Z>,
  failure: (e: E) => Sink<R1, E1, I1, L1, Z1>,
  success: (z: Z) => Sink<R2, E2, I2, L2, Z2>
): Sink<R & R1 & R2, E1 | E2, I & I1 & I2, L1 | L2, Z1 | Z2> {
  return new Sink(
    pipe(
      M.do,
      M.bind("switched", () => T.toManaged_(R.makeRef(false))),
      M.bind("thisPush", () => self.push),
      M.bind("thatPush", () =>
        T.toManaged_(
          R.makeRef<Push.Push<R1 & R2, E1 | E2, I & I1 & I2, L1 | L2, Z1 | Z2>>(
            (_) => T.unit
          )
        )
      ),
      M.bind("openThatPush", () =>
        M.switchable<
          R1 & R2,
          never,
          Push.Push<R1 & R2, E1 | E2, I & I1 & I2, L1 | L2, Z1 | Z2>
        >()
      ),
      M.map(({ openThatPush, switched, thatPush, thisPush }) => {
        return (in_: O.Option<A.Array<I & I1 & I2>>) =>
          T.chain_(switched.get, (sw) => {
            if (!sw) {
              return T.catchAll_(thisPush(in_), (v) => {
                const leftover = v[1]
                const nextSink = E.fold_(v[0], failure, success)

                return pipe(
                  openThatPush(nextSink.push),
                  T.tap(thatPush.set),
                  T.chain((p) =>
                    T.andThen_(
                      switched.set(true),
                      O.fold_(
                        in_,
                        () =>
                          pipe(
                            p(O.some((leftover as unknown) as A.Array<I & I1 & I2>)),
                            T.when(() => leftover.length > 0),
                            T.andThen(p(O.none))
                          ),
                        () =>
                          pipe(
                            p(O.some((leftover as unknown) as A.Array<I & I1 & I2>)),
                            T.when(() => leftover.length > 0)
                          )
                      )
                    )
                  )
                )
              })
            } else {
              return T.chain_(thatPush.get, (p) => p(in_))
            }
          })
      })
    )
  )
}

/**
 * A sink that always fails with the specified error.
 */
export function fail<E, I>(e: E): Sink<unknown, E, I, I, never> {
  return fromPush((c) => {
    const leftover: A.Array<I> = O.fold_(
      c,
      () => A.empty,
      (x) => x
    )

    return Push.fail(e, leftover)
  })
}

/**
 * Transforms this sink's result.
 */
export function map_<R, E, I, L, Z, Z2>(
  self: Sink<R, E, I, L, Z>,
  f: (z: Z) => Z2
): Sink<R, E, I, L, Z2> {
  return new Sink(
    M.map_(self.push, (sink) => (inputs: O.Option<A.Array<I>>) =>
      T.mapError_(sink(inputs), (e) => [E.map_(e[0], f), e[1]])
    )
  )
}

/**
 * Transforms this sink's result.
 */
export function map<Z, Z2>(f: (z: Z) => Z2) {
  return <R, E, I, L>(self: Sink<R, E, I, L, Z>) => map_(self, f)
}

/**
 * Creates a sink from a Push
 */
export const fromPush = <R, E, I, L, Z>(push: Push.Push<R, E, I, L, Z>) =>
  new Sink(M.succeed(push))

/**
 * A sink that immediately ends with the specified value.
 */
export const succeed = <Z, I>(z: Z): Sink<unknown, never, I, I, Z> =>
  fromPush<unknown, never, I, I, Z>((c) => {
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
export const foldArraysM = <Z>(z: Z) => (contFn: (s: Z) => boolean) => <I, R, E>(
  f: (s: Z, i: A.Array<I>) => T.Effect<R, E, Z>
): Sink<R, E, I, I, Z> => {
  if (contFn(z)) {
    return new Sink(
      pipe(
        M.do,
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
): Sink<unknown, never, I, I, Z> =>
  foldArraysM(z)(contFn)((z, i: A.Array<I>) => T.succeed(f(z, i)))

/**
 * A sink that folds its input chunks with the provided function and initial state.
 * `f` must preserve chunking-invariance.
 */
export const foldLeftArrays = <Z>(z: Z) => <I>(f: (s: Z, i: A.Array<I>) => Z) =>
  foldArrays(z)(() => true)(f)

/**
 * A sink that collects all of its inputs into an array.
 */
export const collectAll = <A>(): Sink<unknown, never, A, A, A.Array<A>> =>
  foldLeftArrays([] as A.Array<A>)((s, i: A.Array<A>) => [...s, ...i])

/**
 * Runs both sinks in parallel on the input, returning the result or the error from the
 * one that finishes first.
 */
export const raceBoth = <R1, E1, I1, L1, Z1>(that: Sink<R1, E1, I1, L1, Z1>) => <
  R,
  E,
  I,
  L,
  Z
>(
  self: Sink<R, E, I, L, Z>
): Sink<R1 & R, E1 | E, I & I1, L1 | L, E.Either<Z, Z1>> =>
  new Sink(
    pipe(
      M.do,
      M.bind("p1", () => self.push),
      M.bind("p2", () => that.push),
      M.map(({ p1, p2 }) => (i: O.Option<A.Array<I & I1>>): T.Effect<
        R1 & R,
        readonly [E.Either<E | E1, E.Either<Z, Z1>>, A.Array<L | L1>],
        void
      > =>
        T.raceWith(
          p1(i),
          p2(i),
          (res1, fib2) =>
            Ex.foldM_(
              res1,
              (f) =>
                T.andThen_(
                  F.interrupt(fib2),
                  T.halt(
                    pipe(
                      f,
                      C.map(([r, leftover]) => [E.map_(r, E.left), leftover] as const)
                    )
                  )
                ),
              () =>
                T.mapError_(
                  F.join(fib2),
                  ([r, leftover]) => [E.map_(r, E.right), leftover] as const
                )
            ),
          (res2, fib1) =>
            Ex.foldM_(
              res2,
              (f) =>
                T.andThen_(
                  F.interrupt(fib1),
                  T.halt(
                    pipe(
                      f,
                      C.map(([r, leftover]) => [E.map_(r, E.right), leftover] as const)
                    )
                  )
                ),
              () =>
                T.mapError_(
                  F.join(fib1),
                  ([r, leftover]) => [E.map_(r, E.left), leftover] as const
                )
            )
        )
      )
    )
  )

/**
 * A sink that executes the provided effectful function for every element fed to it.
 */
export const foreach = <I, R1, E1>(f: (i: I) => T.Effect<R1, E1, any>) => {
  const go = (
    chunk: A.Array<I>,
    idx: number,
    len: number
  ): T.Effect<R1, [E.Either<E1, never>, A.Array<I>], void> => {
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

/**
 * Drops any leftover
 */
export function dropLeftover<R, E, I, L, Z>(
  self: Sink<R, E, I, L, Z>
): Sink<R, E, I, never, Z> {
  return new Sink(
    M.map_(self.push, (p) => (in_: O.Option<readonly I[]>) =>
      T.mapError_(p(in_), ([v, _]) => [v, []])
    )
  )
}

/**
 * A sink that effectfully folds its input chunks with the provided function, termination predicate and initial state.
 * `contFn` condition is checked only for the initial value and at the end of processing of each chunk.
 * `f` and `contFn` must preserve chunking-invariance.
 */
export function foldChunksM<S>(z: S) {
  return (contFn: (s: S) => boolean) => <R, E, I>(
    f: (a: S, i: readonly I[]) => T.Effect<R, E, S>
  ): Sink<R, E, I, I, S> => {
    if (contFn(z)) {
      return new Sink(
        pipe(
          M.do,
          M.bind("state", () => T.toManaged_(R.makeRef(z))),
          M.map(({ state }) => {
            return (is: O.Option<readonly I[]>) =>
              O.fold_(
                is,
                () => T.chain_(state.get, (s) => Push.emit(s, [])),
                (is) =>
                  pipe(
                    state.get,
                    T.chain((_) => f(_, is)),
                    T.mapError((e) => [E.left(e), []] as const),
                    T.chain((s) => {
                      if (contFn(s)) {
                        return T.andThen_(state.set(s), Push.more)
                      } else {
                        return Push.emit(s, [])
                      }
                    })
                  )
              )
          })
        )
      )
    } else {
      return succeed(z)
    }
  }
}

/**
 * A sink that effectfully folds its input chunks with the provided function and initial state.
 * `f` must preserve chunking-invariance.
 */
export function foldLeftChunksM<S>(z: S) {
  return <R, E, I>(
    f: (s: S, i: readonly I[]) => T.Effect<R, E, S>
  ): Sink<R, E, I, never, S> => dropLeftover(foldChunksM(z)((_) => true)(f))
}
