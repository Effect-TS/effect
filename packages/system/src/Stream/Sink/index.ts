import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import * as A from "../../Array"
import * as C from "../../Cause/core"
import type { HasClock } from "../../Clock"
import { currentTime } from "../../Clock"
import * as E from "../../Either"
import * as Ex from "../../Exit/api"
import * as F from "../../Fiber/api"
import { pipe } from "../../Function"
import * as O from "../../Option"
import * as R from "../../Ref"
import { matchTag } from "../../Utils"
import * as Push from "../Push"
import type { Transducer } from "../Transducer"
import { transducer } from "../Transducer"

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
export function collectAllWhileWith<S>(z: S) {
  return <Z>(p: (z: Z) => boolean) => (f: (s: S, z: Z) => S) => <R, E, I, L>(
    self: Sink<R, E, I, L, Z>
  ): Sink<R, E, I, L, S> =>
    new Sink(
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

                        if (A.isEmpty(leftover)) {
                          if (end) {
                            return Push.emit(s1, A.empty)
                          } else {
                            return T.as_(restart, s1)
                          }
                        } else {
                          return T.andThen_(
                            restart,
                            go(s1, O.some(leftover) as O.Option<A.Array<I>>, end)
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
 * Transforms this sink's input elements.
 */
export function contramap_<R, E, I, I2, L, Z>(
  self: Sink<R, E, I, L, Z>,
  f: (i2: I2) => I
): Sink<R, E, I2, L, Z> {
  return contramapChunks_(self, A.map(f))
}

/**
 * Transforms this sink's input elements.
 */
export function contramap<I, I2>(f: (i2: I2) => I) {
  return <R, E, L, Z>(self: Sink<R, E, I, L, Z>) => contramap_(self, f)
}

/**
 * Effectfully transforms this sink's input elements.
 */
export function contramapM_<R, R1, E, E1, I, I2, L, Z>(
  self: Sink<R, E, I, L, Z>,
  f: (i2: I2) => T.Effect<R1, E1, I>
): Sink<R & R1, E | E1, I2, L, Z> {
  const mapM = <R_, E_, A, B>(
    f: (a: A) => T.Effect<R_, E_, B>
  ): ((as: A.Array<A>) => T.Effect<R_, E_, A.Array<B>>) => {
    return (as) =>
      A.reduce_(as, T.succeed([]) as T.Effect<R_, E_, A.Array<B>>, (acc, v) =>
        T.chain_(acc, (bs) => T.map_(f(v), (b) => A.snoc_(bs, b)))
      )
  }

  return contramapChunksM_(self, mapM(f))
}

/**
 * Effectfully transforms this sink's input elements.
 */
export function contramapM<R1, E1, I, I2>(f: (i2: I2) => T.Effect<R1, E1, I>) {
  return <R, E, L, Z>(self: Sink<R, E, I, L, Z>) => contramapM_(self, f)
}

/**
 * Transforms this sink's input chunks.
 * `f` must preserve chunking-invariance
 */
export function contramapChunks_<R, E, I, I2, L, Z>(
  self: Sink<R, E, I, L, Z>,
  f: (a: A.Array<I2>) => A.Array<I>
): Sink<R, E, I2, L, Z> {
  return new Sink(M.map_(self.push, (push) => (input) => push(O.map_(input, f))))
}

/**
 * Transforms this sink's input chunks.
 * `f` must preserve chunking-invariance
 */
export function contramapChunks<I, I2>(f: (a: A.Array<I2>) => A.Array<I>) {
  return <R, E, L, Z>(self: Sink<R, E, I, L, Z>) => contramapChunks_(self, f)
}

/**
 * Effectfully transforms this sink's input chunks.
 * `f` must preserve chunking-invariance
 */
export function contramapChunksM_<R, R1, E, E1, I, I2, L, Z>(
  self: Sink<R, E, I, L, Z>,
  f: (a: A.Array<I2>) => T.Effect<R1, E1, A.Array<I>>
): Sink<R & R1, E | E1, I2, L, Z> {
  return new Sink(
    M.map_(self.push, (push) => {
      return (input: O.Option<A.Array<I2>>) =>
        O.fold_(
          input,
          () => push(O.none),
          (value) =>
            pipe(
              f(value),
              T.mapError((e: E | E1) => [E.left(e), A.empty] as const),
              T.chain((is) => push(O.some(is)))
            )
        )
    })
  )
}

/**
 * Effectfully transforms this sink's input chunks.
 * `f` must preserve chunking-invariance
 */
export function contramapChunksM<R1, E1, I, I2>(
  f: (a: A.Array<I2>) => T.Effect<R1, E1, A.Array<I>>
) {
  return <R, E, L, Z>(self: Sink<R, E, I, L, Z>) => contramapChunksM_(self, f)
}

/**
 * Transforms both inputs and result of this sink using the provided functions.
 */
export function dimap_<R, E, I, I2, L, Z, Z2>(
  self: Sink<R, E, I, L, Z>,
  f: (i2: I2) => I,
  g: (z: Z) => Z2
): Sink<R, E, I2, L, Z2> {
  return map_(contramap_(self, f), g)
}

/**
 * Transforms both inputs and result of this sink using the provided functions.
 */
export function dimap<I, I2, Z, Z2>(f: (i2: I2) => I, g: (z: Z) => Z2) {
  return <R, E, L>(self: Sink<R, E, I, L, Z>) => dimap_(self, f, g)
}

/**
 * Effectfully transforms both inputs and result of this sink using the provided functions.
 */
export function dimapM_<R, R1, E, E1, I, I2, L, Z, Z2>(
  self: Sink<R, E, I, L, Z>,
  f: (i2: I2) => T.Effect<R1, E1, I>,
  g: (z: Z) => T.Effect<R1, E1, Z2>
): Sink<R & R1, E | E1, I2, L, Z2> {
  return mapM_(contramapM_(self, f), g)
}

/**
 * Effectfully transforms both inputs and result of this sink using the provided functions.
 */
export function dimapM<R1, E1, I, I2, Z, Z2>(
  f: (i2: I2) => T.Effect<R1, E1, I>,
  g: (z: Z) => T.Effect<R1, E1, Z2>
) {
  return <R, E, L>(self: Sink<R, E, I, L, Z>) => dimapM_(self, f, g)
}

/**
 * Transforms both input chunks and result of this sink using the provided functions.
 */
export function dimapChunks_<R, E, I, I2, L, Z, Z2>(
  self: Sink<R, E, I, L, Z>,
  f: (i2: A.Array<I2>) => A.Array<I>,
  g: (z: Z) => Z2
): Sink<R, E, I2, L, Z2> {
  return map_(contramapChunks_(self, f), g)
}

/**
 * Transforms both input chunks and result of this sink using the provided functions.
 */
export function dimapChunks<I, I2, Z, Z2>(
  f: (i2: A.Array<I2>) => A.Array<I>,
  g: (z: Z) => Z2
) {
  return <R, E, L>(self: Sink<R, E, I, L, Z>) => dimapChunks_(self, f, g)
}

/**
 * Effectfully transforms both input chunks and result of this sink using the provided functions.
 * `f` and `g` must preserve chunking-invariance
 */
export function dimapChunksM_<R, R1, E, E1, I, I2, L, Z, Z2>(
  self: Sink<R, E, I, L, Z>,
  f: (i2: A.Array<I2>) => T.Effect<R1, E1, A.Array<I>>,
  g: (z: Z) => T.Effect<R1, E1, Z2>
): Sink<R & R1, E | E1, I2, L, Z2> {
  return mapM_(contramapChunksM_(self, f), g)
}

/**
 * Effectfully transforms both input chunks and result of this sink using the provided functions.
 * `f` and `g` must preserve chunking-invariance
 */
export function dimapChunksM<R1, E1, I, I2, Z, Z2>(
  f: (i2: A.Array<I2>) => T.Effect<R1, E1, A.Array<I>>,
  g: (z: Z) => T.Effect<R1, E1, Z2>
) {
  return <R, E, L>(self: Sink<R, E, I, L, Z>) => dimapChunksM_(self, f, g)
}

/**
 * Runs this sink until it yields a result, then uses that result to create another
 * sink from the provided function which will continue to run until it yields a result.
 *
 * This function essentially runs sinks in sequence.
 */
export function chain_<R, E, I, L extends I1, Z, R1, E1, I1 extends I, L1, Z1>(
  self: Sink<R, E, I, L, Z>,
  f: (z: Z) => Sink<R1, E1, I1, L1, Z1>
): Sink<R & R1, E | E1, I1, L1, Z1> {
  return foldM_(self, (e) => (fail(e) as unknown) as Sink<R1, E | E1, I1, L1, Z1>, f)
}

/**
 * Runs this sink until it yields a result, then uses that result to create another
 * sink from the provided function which will continue to run until it yields a result.
 *
 * This function essentially runs sinks in sequence.
 */
export function chain<Z, R, R1, E1, I, I1 extends I, L1, Z1>(
  f: (z: Z) => Sink<R1, E1, I1, L1, Z1>
) {
  return <E, L extends I1>(self: Sink<R, E, I, L, Z>) => chain_(self, f)
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
export function foldM_<R, R1, R2, E, E1, E2, I, I1, I2, L, L1, L2, Z, Z1, Z2>(
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
                            p(O.some(leftover) as O.Option<A.Array<I & I1 & I2>>),
                            T.when(() => A.isNonEmpty(leftover)),
                            T.andThen(p(O.none))
                          ),
                        () =>
                          pipe(
                            p(O.some(leftover) as O.Option<A.Array<I & I1 & I2>>),
                            T.when(() => A.isNonEmpty(leftover))
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
export function foldM<R1, R2, E, E1, E2, I1, I2, L1, L2, Z, Z1, Z2>(
  failure: (e: E) => Sink<R1, E1, I1, L1, Z1>,
  success: (z: Z) => Sink<R2, E2, I2, L2, Z2>
) {
  return <R, I, L>(self: Sink<R, E, I, L, Z>) => foldM_(self, failure, success)
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
 * Transforms the errors emitted by this sink using `f`.
 */
export function mapError_<R, E, E2, I, L, Z>(
  self: Sink<R, E, I, L, Z>,
  f: (e: E) => E2
): Sink<R, E | E2, I, L, Z> {
  return new Sink(
    M.map_(self.push, (p) => {
      return (in_: O.Option<A.Array<I>>) =>
        T.mapError_(p(in_), (e) => [E.mapLeft_(e[0], f), e[1]])
    })
  )
}

/**
 * Transforms the errors emitted by this sink using `f`.
 */
export function mapError<E, E2>(f: (e: E) => E2) {
  return <R, I, L, Z>(self: Sink<R, E, I, L, Z>) => mapError_(self, f)
}

/**
 * Effectfully transforms this sink's result.
 */
export function mapM_<R, R1, E, E1, I, L, Z, Z2>(
  self: Sink<R, E, I, L, Z>,
  f: (z: Z) => T.Effect<R1, E1, Z2>
): Sink<R & R1, E | E1, I, L, Z2> {
  return new Sink(
    M.map_(self.push, (push) => {
      return (inputs: O.Option<A.Array<I>>) =>
        T.catchAll_(push(inputs), ([e, left]) =>
          E.fold_(
            e,
            (e) => Push.fail(e, left),
            (z) =>
              T.foldM_(
                f(z),
                (e: E | E1) => Push.fail(e, left),
                (z2) => Push.emit(z2, left)
              )
          )
        )
    })
  )
}

/**
 * Effectfully transforms this sink's result.
 */
export function mapM<R1, E1, Z, Z2>(f: (z: Z) => T.Effect<R1, E1, Z2>) {
  return <R, E, I, L>(self: Sink<R, E, I, L, Z>) => mapM_(self, f)
}

/**
 * Runs both sinks in parallel on the input, , returning the result or the error from the
 * one that finishes first.
 */
export function race_<R, R1, E, E1, I, I1, L, L1, Z, Z1>(
  self: Sink<R, E, I, L, Z>,
  that: Sink<R1, E1, I1, L1, Z1>
): Sink<R & R1, E | E1, I & I1, L | L1, Z | Z1> {
  return map_(raceBoth_(self, that), E.merge)
}

/**
 * Runs both sinks in parallel on the input, , returning the result or the error from the
 * one that finishes first.
 */
export function race<R1, E1, I1, L1, Z1>(that: Sink<R1, E1, I1, L1, Z1>) {
  return <R, E, I, L, Z>(self: Sink<R, E, I, L, Z>) => race_(self, that)
}

/**
 * Runs both sinks in parallel on the input, returning the result or the error from the
 * one that finishes first.
 */
export function raceBoth_<R, R1, E, E1, I, I1, L, L1, Z, Z1>(
  self: Sink<R, E, I, L, Z>,
  that: Sink<R1, E1, I1, L1, Z1>
): Sink<R1 & R, E1 | E, I & I1, L1 | L, E.Either<Z, Z1>> {
  return new Sink(
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
}

/**
 * Runs both sinks in parallel on the input, returning the result or the error from the
 * one that finishes first.
 */
export function raceBoth<R1, E1, I1, L1, Z1>(that: Sink<R1, E1, I1, L1, Z1>) {
  return <R, E, I, L, Z>(self: Sink<R, E, I, L, Z>) => raceBoth_(self, that)
}

/**
 * Returns the sink that executes this one and times its execution.
 */
export function timed<R, E, I, L, Z>(
  self: Sink<R, E, I, L, Z>
): Sink<R & HasClock, E, I, L, readonly [Z, number]> {
  return new Sink(
    pipe(
      self.push,
      M.zipWith(T.toManaged_(currentTime), (push, start) => {
        return (in_: O.Option<A.Array<I>>) =>
          T.catchAll_(
            push(in_),
            ([e, leftover]): T.Effect<
              R & HasClock,
              [E.Either<E, readonly [Z, number]>, A.Array<L>],
              never
            > =>
              E.fold_(
                e,
                (e) => Push.fail(e, leftover),
                (z) =>
                  T.chain_(currentTime, (stop) =>
                    Push.emit([z, stop - start] as const, leftover)
                  )
              )
          )
      })
    )
  )
}

/**
 * Converts this sink to a transducer that feeds incoming elements to the sink
 * and emits the sink's results as outputs. The sink will be restarted when
 * it ends.
 */
export function toTransducer<R, E, I, L, Z>(
  self: Sink<R, E, I, L, Z>
): Transducer<R, E, I, Z> {
  return transducer(
    M.map_(Push.restartable(self.push), ([push, restart]) => {
      const go = (input: O.Option<A.Array<I>>): T.Effect<R, E, A.Array<Z>> =>
        T.foldM_(
          push(input),
          ([e, leftover]) =>
            E.fold_(
              e,
              (e) => T.fail(e),
              (z) =>
                T.andThen_(
                  restart,
                  A.isEmpty(leftover) || O.isNone(input)
                    ? T.succeed([z])
                    : T.map_(go(O.some(leftover) as O.Option<A.Array<I>>), (more) => [
                        z,
                        ...more
                      ])
                )
            ),
          (_) => T.succeed(A.empty)
        )

      return (input: O.Option<A.Array<I>>) => go(input)
    })
  )
}

/**
 * Feeds inputs to this sink until it yields a result, then switches over to the
 * provided sink until it yields a result, combining the two results in a tuple.
 */
export function zip_<R, R1, E, E1, I, I1 extends I, L extends I1, L1, Z, Z1>(
  self: Sink<R, E, I, L, Z>,
  that: Sink<R1, E1, I1, L1, Z1>
): Sink<R & R1, E | E1, I & I1, L | L1, readonly [Z, Z1]> {
  return zipWith_(self, that, (z, z1) => [z, z1] as const)
}

/**
 * Feeds inputs to this sink until it yields a result, then switches over to the
 * provided sink until it yields a result, combining the two results in a tuple.
 */
export function zip<R1, E1, I, I1 extends I, L1, Z1>(that: Sink<R1, E1, I1, L1, Z1>) {
  return <R, E, L extends I1, Z>(self: Sink<R, E, I, L, Z>) => zip_(self, that)
}

/**
 * Like [[zip]], but keeps only the result from the `that` sink.
 */
export function zipLeft_<R, R1, E, E1, I, I1 extends I, L extends I1, L1, Z, Z1>(
  self: Sink<R, E, I, L, Z>,
  that: Sink<R1, E1, I1, L1, Z1>
): Sink<R & R1, E | E1, I & L1 & I1, L | L1, Z> {
  return zipWith_(self, that, (z) => z)
}

/**
 * Like [[zip]], but keeps only the result from the `that` sink.
 */
export function zipLeft<R1, E1, I, I1 extends I, L1, Z1>(
  that: Sink<R1, E1, I1, L1, Z1>
) {
  return <R, E, L extends I1, Z>(self: Sink<R, E, I, L, Z>) => zipLeft_(self, that)
}

/**
 * Runs both sinks in parallel on the input and combines the results in a tuple.
 */
export function zipPar_<R, R1, E, E1, I, I1, L, L1, Z, Z1>(
  self: Sink<R, E, I, L, Z>,
  that: Sink<R1, E1, I1, L1, Z1>
): Sink<R & R1, E | E1, I & I1, L | L1, readonly [Z, Z1]> {
  return zipWithPar_(self, that, (a, b) => [a, b] as const)
}

/**
 * Runs both sinks in parallel on the input and combines the results in a tuple.
 */
export function zipPar<R1, E1, I1, L1, Z1>(that: Sink<R1, E1, I1, L1, Z1>) {
  return <R, E, I, L, Z>(self: Sink<R, E, I, L, Z>) => zipPar_(self, that)
}

/**
 * Like [[zipPar]], but keeps only the result from this sink.
 */
export function zipParLeft_<R, R1, E, E1, I, I1, L, L1, Z>(
  self: Sink<R, E, I, L, Z>,
  that: Sink<R1, E1, I1, L1, unknown>
): Sink<R & R1, E | E1, I & I1, L | L1, Z> {
  return zipWithPar_(self, that, (b, _) => b)
}

/**
 * Like [[zipPar]], but keeps only the result from this sink.
 */
export function zipParLeft<R1, E1, I1, L1>(that: Sink<R1, E1, I1, L1, unknown>) {
  return <R, E, I, L, Z>(self: Sink<R, E, I, L, Z>) => zipParLeft_(self, that)
}

/**
 * Like [[zipPar]], but keeps only the result from the `that` sink.
 */
export function zipParRight_<R, R1, E, E1, I, I1, L, L1, Z, Z1>(
  self: Sink<R, E, I, L, Z>,
  that: Sink<R1, E1, I1, L1, Z1>
): Sink<R & R1, E | E1, I & I1, L | L1, Z1> {
  return zipWithPar_(self, that, (_, c) => c)
}

/**
 * Like [[zipPar]], but keeps only the result from the `that` sink.
 */
export function zipParRight<R1, E1, I1, L1, Z1>(that: Sink<R1, E1, I1, L1, Z1>) {
  return <R, E, I, L, Z>(self: Sink<R, E, I, L, Z>) => zipParRight_(self, that)
}

/**
 * Like [[zip]], but keeps only the result from this sink.
 */
export function zipRight_<R, R1, E, E1, I, I1 extends I, L extends I1, L1, Z, Z1>(
  self: Sink<R, E, I, L, Z>,
  that: Sink<R1, E1, I1, L1, Z1>
): Sink<R & R1, E | E1, I & L1 & I1, L | L1, Z1> {
  return zipWith_(self, that, (_, z1) => z1)
}

/**
 * Like [[zip]], but keeps only the result from this sink.
 */
export function zipRight<R1, E1, I, I1 extends I, L1, Z, Z1>(
  that: Sink<R1, E1, I1, L1, Z1>
) {
  return <R, E, L extends I1>(self: Sink<R, E, I, L, Z>) => zipRight_(self, that)
}

/**
 * Feeds inputs to this sink until it yields a result, then switches over to the
 * provided sink until it yields a result, finally combining the two results with `f`.
 */
export function zipWith_<R, R1, E, E1, I, I1 extends I, L extends I1, L1, Z, Z1, Z2>(
  self: Sink<R, E, I, L, Z>,
  that: Sink<R1, E1, I1, L1, Z1>,
  f: (z: Z, z1: Z1) => Z2
): Sink<R & R1, E | E1, I & I1, L | L1, Z2> {
  return chain_(self, (z) => map_(that, (_) => f(z, _)))
}

/**
 * Feeds inputs to this sink until it yields a result, then switches over to the
 * provided sink until it yields a result, finally combining the two results with `f`.
 */
export function zipWith<R1, E1, I, I1 extends I, L1, Z, Z1, Z2>(
  that: Sink<R1, E1, I1, L1, Z1>,
  f: (z: Z, z1: Z1) => Z2
) {
  return <R, E, L extends I1>(self: Sink<R, E, I, L, Z>) => zipWith_(self, that, f)
}

interface BothRunning {
  readonly _tag: "BothRunning"
}

const bothRunning: BothRunning = { _tag: "BothRunning" }

interface LeftDone<Z> {
  readonly _tag: "LeftDone"
  readonly value: Z
}

function leftDone<Z>(z: Z): LeftDone<Z> {
  return { _tag: "LeftDone", value: z }
}

interface RightDone<Z1> {
  readonly _tag: "RightDone"
  readonly value: Z1
}

function rightDone<Z1>(z1: Z1): RightDone<Z1> {
  return { _tag: "RightDone", value: z1 }
}

type State<Z, Z1> = BothRunning | LeftDone<Z> | RightDone<Z1>

/**
 * Runs both sinks in parallel on the input and combines the results
 * using the provided function.
 */
export function zipWithPar_<R, R1, E, E1, I, I1, L, L1, Z, Z1, Z2>(
  self: Sink<R, E, I, L, Z>,
  that: Sink<R1, E1, I1, L1, Z1>,
  f: (z: Z, z1: Z1) => Z2
): Sink<R & R1, E | E1, I & I1, L | L1, Z2> {
  return new Sink(
    pipe(
      M.do,
      M.bind("ref", () => T.toManaged_(R.makeRef<State<Z, Z1>>(bothRunning))),
      M.bind("p1", () => self.push),
      M.bind("p2", () => that.push),
      M.map(({ p1, p2, ref }) => {
        return (in_: O.Option<A.Array<I & I1>>) =>
          T.chain_(ref.get, (state) => {
            const newState = pipe(
              state,
              matchTag({
                BothRunning: (): T.Effect<
                  R & R1,
                  readonly [E.Either<E | E1, Z2>, A.Array<L | L1>],
                  State<Z, Z1>
                > => {
                  const l: T.Effect<
                    R & R1,
                    readonly [E.Either<E | E1, Z2>, A.Array<L | L1>],
                    O.Option<readonly [Z, A.Array<L>]>
                  > = T.foldM_(
                    p1(in_),
                    ([e, l]) =>
                      E.fold_(
                        e,
                        (e) =>
                          Push.fail(e, l) as T.Effect<
                            R & R1,
                            [E.Either<E | E1, Z2>, A.Array<L | L1>],
                            O.Option<readonly [Z, A.Array<L>]>
                          >,
                        (z) =>
                          T.succeed(O.some([z, l] as const)) as T.Effect<
                            R & R1,
                            [E.Either<E | E1, Z2>, A.Array<L | L1>],
                            O.Option<readonly [Z, A.Array<L>]>
                          >
                      ),
                    (_) =>
                      T.succeed(O.none) as T.Effect<
                        R & R1,
                        [E.Either<E | E1, Z2>, A.Array<L | L1>],
                        O.Option<readonly [Z, A.Array<L>]>
                      >
                  )
                  const r: T.Effect<
                    R & R1,
                    readonly [E.Either<E | E1, never>, A.Array<L | L1>],
                    O.Option<readonly [Z1, A.Array<L1>]>
                  > = T.foldM_(
                    p2(in_),
                    ([e, l]) =>
                      E.fold_(
                        e,
                        (e) =>
                          Push.fail(e, l) as T.Effect<
                            R & R1,
                            [E.Either<E | E1, never>, A.Array<L | L1>],
                            O.Option<readonly [Z1, A.Array<L1>]>
                          >,
                        (z) =>
                          T.succeed(O.some([z, l] as const)) as T.Effect<
                            R & R1,
                            [E.Either<E | E1, never>, A.Array<L | L1>],
                            O.Option<readonly [Z1, A.Array<L1>]>
                          >
                      ),
                    (_) =>
                      T.succeed(O.none) as T.Effect<
                        R & R1,
                        [E.Either<E | E1, never>, A.Array<L | L1>],
                        O.Option<readonly [Z1, A.Array<L1>]>
                      >
                  )

                  return T.chain_(
                    T.zipPar_(l, r),
                    ([lr, rr]): T.Effect<
                      R & R1,
                      readonly [E.Either<E1, Z2>, A.Array<L | L1>],
                      State<Z, Z1>
                    > => {
                      if (O.isSome(lr)) {
                        const [z, l] = lr.value

                        if (O.isSome(rr)) {
                          const [z1, l1] = rr.value

                          return T.fail([
                            E.right(f(z, z1)),
                            l.length > l1.length ? l1 : l
                          ] as const)
                        } else {
                          return T.succeed(leftDone(z))
                        }
                      } else {
                        if (O.isSome(rr)) {
                          const [z1] = rr.value

                          return T.succeed(rightDone(z1))
                        } else {
                          return T.succeed(bothRunning)
                        }
                      }
                    }
                  ) as T.Effect<
                    R & R1,
                    readonly [E.Either<E1, Z2>, A.Array<L | L1>],
                    State<Z, Z1>
                  >
                },
                LeftDone: ({ value: z }) =>
                  T.as_(
                    T.catchAll_(
                      p2(in_),
                      ([e, leftover]): T.Effect<
                        R & R1,
                        readonly [E.Either<E | E1, Z2>, A.Array<L | L1>],
                        State<Z, Z1>
                      > =>
                        E.fold_(
                          e,
                          (e) => Push.fail(e, leftover),
                          (z1) => Push.emit(f(z, z1), leftover)
                        )
                    ),
                    state
                  ),
                RightDone: ({ value: z1 }) =>
                  T.as_(
                    T.catchAll_(
                      p1(in_),
                      ([e, leftover]): T.Effect<
                        R & R1,
                        readonly [E.Either<E | E1, Z2>, A.Array<L | L1>],
                        State<Z, Z1>
                      > =>
                        E.fold_(
                          e,
                          (e) => Push.fail(e, leftover),
                          (z) => Push.emit(f(z, z1), leftover)
                        )
                    ),
                    state
                  )
              })
            )

            return T.chain_(newState, (ns) => (ns === state ? T.unit : ref.set(ns)))
          })
      })
    )
  )
}

/**
 * Runs both sinks in parallel on the input and combines the results
 * using the provided function.
 */
export function zipWithPar<R1, E1, I1, L1, Z, Z1, Z2>(
  that: Sink<R1, E1, I1, L1, Z1>,
  f: (z: Z, z1: Z1) => Z2
) {
  return <R, E, I, L>(self: Sink<R, E, I, L, Z>) => zipWithPar_(self, that, f)
}

/**
 * Exposes leftover
 */
export function exposeLeftover<R, E, I, L, Z>(
  self: Sink<R, E, I, L, Z>
): Sink<R, E, I, never, readonly [Z, A.Array<L>]> {
  return new Sink(
    M.map_(self.push, (p) => {
      return (in_: O.Option<A.Array<I>>) =>
        T.mapError_(p(in_), ([v, leftover]) => {
          return [E.map_(v, (z) => [z, leftover] as const), A.empty] as const
        })
    })
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
 * Creates a sink that produces values until one verifies
 * the predicate `f`.
 */
export function untilOutputM_<R, R1, E, E1, I, L, Z>(
  self: Sink<R, E, I, L, Z>,
  f: (z: Z) => T.Effect<R1, E1, boolean>
): Sink<R & R1, E | E1, I, L, O.Option<Z>> {
  return new Sink(
    M.map_(Push.restartable(self.push), ([push, restart]) => {
      const go = (
        in_: O.Option<A.Array<I>>,
        end: boolean
      ): T.Effect<
        R & R1,
        readonly [E.Either<E | E1, O.Option<Z>>, A.Array<L>],
        void
      > => {
        return T.catchAll_(push(in_), ([e, leftover]) =>
          E.fold_(
            e,
            (e) => Push.fail(e, leftover),
            (z) =>
              T.chain_(
                T.mapError_(f(z), (err) => [E.left(err), leftover] as const),
                (satisfied) => {
                  if (satisfied) {
                    return Push.emit(O.some(z), leftover)
                  } else if (A.isEmpty(leftover)) {
                    return end
                      ? Push.emit(O.none, A.empty)
                      : T.andThen_(restart, Push.more)
                  } else {
                    return go(O.some(leftover) as O.Option<A.Array<I>>, end)
                  }
                }
              )
          )
        )
      }

      return (is: O.Option<A.Array<I>>) => go(is, O.isNone(is))
    })
  )
}

/**
 * Creates a sink that produces values until one verifies
 * the predicate `f`.
 */
export function untilOutputM<R1, E1, Z>(f: (z: Z) => T.Effect<R1, E1, boolean>) {
  return <R, E, I, L>(self: Sink<R, E, I, L, Z>) => untilOutputM_(self, f)
}

/**
 * Provides the sink with its required environment, which eliminates
 * its dependency on `R`.
 */
export function provide_<R, E, I, L, Z>(
  self: Sink<R, E, I, L, Z>,
  r: R
): Sink<unknown, E, I, L, Z> {
  return new Sink(
    M.map_(M.provide_(self.push, r), (push) => (i: O.Option<A.Array<I>>) =>
      T.provide_(push(i), r)
    )
  )
}

/**
 * Provides the sink with its required environment, which eliminates
 * its dependency on `R`.
 */
export function provide<R>(r: R) {
  return <E, I, L, Z>(self: Sink<R, E, I, L, Z>) => provide_(self, r)
}

/*












*/

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

/**
 * A sink that ignores its inputs.
 */

export const drain: Sink<unknown, never, unknown, never, void> = dropLeftover(
  foreach((_) => T.unit)
)
