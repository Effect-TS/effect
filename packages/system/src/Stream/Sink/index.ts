// ets_tracing: off

import "../../Operator/index.js"

import * as C from "../../Cause/index.js"
import type { HasClock } from "../../Clock/index.js"
import { currentTime } from "../../Clock/index.js"
import * as A from "../../Collections/Immutable/Chunk/index.js"
import * as List from "../../Collections/Immutable/List/index.js"
import type * as MP from "../../Collections/Immutable/Map/index.js"
import * as Tp from "../../Collections/Immutable/Tuple/index.js"
import * as E from "../../Either/index.js"
import * as Ex from "../../Exit/api.js"
import { identity, pipe } from "../../Function/index.js"
import * as H from "../../Hub/index.js"
import * as L from "../../Layer/index.js"
import * as O from "../../Option/index.js"
import * as Q from "../../Queue/index.js"
import { matchTag } from "../../Utils/index.js"
import * as T from "../_internal/effect.js"
import * as F from "../_internal/fiber.js"
import * as M from "../_internal/managed.js"
import * as R from "../_internal/ref.js"
import * as Push from "../Push/index.js"
import type { Transducer } from "../Transducer/index.js"
import { transducer } from "../Transducer/index.js"

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
  return <Z>(p: (z: Z) => boolean) =>
    (f: (s: S, z: Z) => S) =>
    <R, E, I, L extends I>(self: Sink<R, E, I, L, Z>): Sink<R, E, I, L, S> =>
      new Sink(
        pipe(
          R.makeManagedRef(z),
          M.chain((acc) => {
            return pipe(
              Push.restartable(self.push),
              M.map(({ tuple: [push, restart] }) => {
                const go = (
                  s: S,
                  in_: O.Option<A.Chunk<I>>,
                  end: boolean
                ): T.Effect<R, Tp.Tuple<[E.Either<E, S>, A.Chunk<L>]>, S> =>
                  T.catchAll_(T.as_(push(in_), s), ({ tuple: [e, leftover] }) =>
                    E.fold_(
                      e,
                      (e) => Push.fail(e, leftover),
                      (z) => {
                        if (p(z)) {
                          const s1 = f(s, z)

                          if (A.isEmpty(leftover)) {
                            if (end) {
                              return Push.emit(s1, A.empty())
                            } else {
                              return T.as_(restart, s1)
                            }
                          } else {
                            return T.zipRight_(restart, go(s1, O.some(leftover), end))
                          }
                        } else {
                          return Push.emit(s, leftover)
                        }
                      }
                    )
                  )

                return (in_: O.Option<A.Chunk<I>>) =>
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
  return contramapChunksM_(self, A.mapEffect(f))
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
  f: (a: A.Chunk<I2>) => A.Chunk<I>
): Sink<R, E, I2, L, Z> {
  return new Sink(M.map_(self.push, (push) => (input) => push(O.map_(input, f))))
}

/**
 * Transforms this sink's input chunks.
 * `f` must preserve chunking-invariance
 */
export function contramapChunks<I, I2>(f: (a: A.Chunk<I2>) => A.Chunk<I>) {
  return <R, E, L, Z>(self: Sink<R, E, I, L, Z>) => contramapChunks_(self, f)
}

/**
 * Effectfully transforms this sink's input chunks.
 * `f` must preserve chunking-invariance
 */
export function contramapChunksM_<R, R1, E, E1, I, I2, L, Z>(
  self: Sink<R, E, I, L, Z>,
  f: (a: A.Chunk<I2>) => T.Effect<R1, E1, A.Chunk<I>>
): Sink<R & R1, E | E1, I2, L, Z> {
  return new Sink(
    M.map_(self.push, (push) => {
      return (input: O.Option<A.Chunk<I2>>) =>
        O.fold_(
          input,
          () => push(O.none),
          (value) =>
            pipe(
              f(value),
              T.mapError((e: E | E1) => Tp.tuple(E.left(e), A.empty<L>())),
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
  f: (a: A.Chunk<I2>) => T.Effect<R1, E1, A.Chunk<I>>
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
  f: (i2: A.Chunk<I2>) => A.Chunk<I>,
  g: (z: Z) => Z2
): Sink<R, E, I2, L, Z2> {
  return map_(contramapChunks_(self, f), g)
}

/**
 * Transforms both input chunks and result of this sink using the provided functions.
 */
export function dimapChunks<I, I2, Z, Z2>(
  f: (i2: A.Chunk<I2>) => A.Chunk<I>,
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
  f: (i2: A.Chunk<I2>) => T.Effect<R1, E1, A.Chunk<I>>,
  g: (z: Z) => T.Effect<R1, E1, Z2>
): Sink<R & R1, E | E1, I2, L, Z2> {
  return mapM_(contramapChunksM_(self, f), g)
}

/**
 * Effectfully transforms both input chunks and result of this sink using the provided functions.
 * `f` and `g` must preserve chunking-invariance
 */
export function dimapChunksM<R1, E1, I, I2, Z, Z2>(
  f: (i2: A.Chunk<I2>) => T.Effect<R1, E1, A.Chunk<I>>,
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
  return foldM_(
    self,
    (e) => fail(e)<I1>() as unknown as Sink<R1, E | E1, I1, L1, Z1>,
    f
  )
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
      M.bind("switched", () => T.toManaged(R.makeRef(false))),
      M.bind("thisPush", () => self.push),
      M.bind("thatPush", () =>
        T.toManaged(
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
        return (in_: O.Option<A.Chunk<I & I1 & I2>>) =>
          T.chain_(switched.get, (sw) => {
            if (!sw) {
              return T.catchAll_(thisPush(in_), (v) => {
                const leftover = v[1]
                const nextSink = E.fold_(v[0], failure, success)

                return pipe(
                  openThatPush(nextSink.push),
                  T.tap(thatPush.set),
                  T.chain((p) =>
                    T.zipRight_(
                      switched.set(true),
                      O.fold_(
                        in_,
                        () =>
                          pipe(
                            p(O.some(leftover) as O.Option<A.Chunk<I & I1 & I2>>),
                            T.when(() => !A.isEmpty(leftover)),
                            T.zipRight(p(O.none))
                          ),
                        () =>
                          pipe(
                            p(O.some(leftover) as O.Option<A.Chunk<I & I1 & I2>>),
                            T.when(() => !A.isEmpty(leftover))
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
    M.map_(
      self.push,
      (sink) => (inputs: O.Option<A.Chunk<I>>) =>
        T.mapError_(sink(inputs), (e) => Tp.tuple(E.map_(e.get(0), f), e.get(1)))
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
      return (in_: O.Option<A.Chunk<I>>) =>
        T.mapError_(p(in_), (e) => Tp.tuple(E.mapLeft_(e.get(0), f), e.get(1)))
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
      return (inputs: O.Option<A.Chunk<I>>) =>
        T.catchAll_(push(inputs), ({ tuple: [e, left] }) =>
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
      M.map(
        ({ p1, p2 }) =>
          (
            i: O.Option<A.Chunk<I & I1>>
          ): T.Effect<
            R1 & R,
            Tp.Tuple<[E.Either<E | E1, E.Either<Z, Z1>>, A.Chunk<L | L1>]>,
            void
          > =>
            T.raceWith_(
              p1(i),
              p2(i),
              (res1, fib2) =>
                Ex.foldM_(
                  res1,
                  (f) =>
                    T.zipRight_(
                      F.interrupt(fib2),
                      T.halt(
                        pipe(
                          f,
                          C.map(({ tuple: [r, leftover] }) =>
                            Tp.tuple(E.map_(r, E.left), leftover)
                          )
                        )
                      )
                    ),
                  () =>
                    T.mapError_(F.join(fib2), ({ tuple: [r, leftover] }) =>
                      Tp.tuple(E.map_(r, E.right), leftover)
                    )
                ),
              (res2, fib1) =>
                Ex.foldM_(
                  res2,
                  (f) =>
                    T.zipRight_(
                      F.interrupt(fib1),
                      T.halt(
                        pipe(
                          f,
                          C.map(({ tuple: [r, leftover] }) =>
                            Tp.tuple(E.map_(r, E.right), leftover)
                          )
                        )
                      )
                    ),
                  () =>
                    T.mapError_(F.join(fib1), ({ tuple: [r, leftover] }) =>
                      Tp.tuple(E.map_(r, E.left), leftover)
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
): Sink<R & HasClock, E, I, L, Tp.Tuple<[Z, number]>> {
  return new Sink(
    pipe(
      self.push,
      M.zipWith(T.toManaged(currentTime), (push, start) => {
        return (in_: O.Option<A.Chunk<I>>) =>
          T.catchAll_(
            push(in_),
            ({
              tuple: [e, leftover]
            }): T.Effect<
              R & HasClock,
              Tp.Tuple<[E.Either<E, Tp.Tuple<[Z, number]>>, A.Chunk<L>]>,
              never
            > =>
              E.fold_(
                e,
                (e) => Push.fail(e, leftover),
                (z) =>
                  T.chain_(currentTime, (stop) =>
                    Push.emit(Tp.tuple(z, stop - start), leftover)
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
export function toTransducer<R, E, I, L extends I, Z>(
  self: Sink<R, E, I, L, Z>
): Transducer<R, E, I, Z> {
  return transducer(
    M.map_(Push.restartable(self.push), ({ tuple: [push, restart] }) => {
      const go = (input: O.Option<A.Chunk<I>>): T.Effect<R, E, A.Chunk<Z>> =>
        T.foldM_(
          push(input),
          ({ tuple: [e, leftover] }) =>
            E.fold_(
              e,
              (e) => T.fail(e),
              (z) =>
                T.zipRight_(
                  restart,
                  A.isEmpty(leftover) || O.isNone(input)
                    ? T.succeed(A.single(z))
                    : T.map_(go(O.some(leftover)), (more) => A.prepend_(more, z))
                )
            ),
          (_) => T.succeed(A.empty())
        )

      return (input: O.Option<A.Chunk<I>>) => go(input)
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
): Sink<R & R1, E | E1, I & I1, L | L1, Tp.Tuple<[Z, Z1]>> {
  return zipWith_(self, that, Tp.tuple)
}

/**
 * Feeds inputs to this sink until it yields a result, then switches over to the
 * provided sink until it yields a result, combining the two results in a tuple.
 */
export function zip<R1, E1, I, I1 extends I, L1, Z1>(that: Sink<R1, E1, I1, L1, Z1>) {
  return <R, E, L extends I1, Z>(self: Sink<R, E, I, L, Z>) => zip_(self, that)
}

/**
 * Like `zip`, but keeps only the result from the `that` sink.
 */
export function zipLeft_<R, R1, E, E1, I, I1 extends I, L extends I1, L1, Z, Z1>(
  self: Sink<R, E, I, L, Z>,
  that: Sink<R1, E1, I1, L1, Z1>
): Sink<R & R1, E | E1, I & L1 & I1, L | L1, Z> {
  return zipWith_(self, that, (z) => z)
}

/**
 * Like `zip`, but keeps only the result from the `that` sink.
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
): Sink<R & R1, E | E1, I & I1, L | L1, Tp.Tuple<[Z, Z1]>> {
  return zipWithPar_(self, that, Tp.tuple)
}

/**
 * Runs both sinks in parallel on the input and combines the results in a tuple.
 */
export function zipPar<R1, E1, I1, L1, Z1>(that: Sink<R1, E1, I1, L1, Z1>) {
  return <R, E, I, L, Z>(self: Sink<R, E, I, L, Z>) => zipPar_(self, that)
}

/**
 * Like `zipPar`, but keeps only the result from this sink.
 */
export function zipParLeft_<R, R1, E, E1, I, I1, L, L1, Z>(
  self: Sink<R, E, I, L, Z>,
  that: Sink<R1, E1, I1, L1, unknown>
): Sink<R & R1, E | E1, I & I1, L | L1, Z> {
  return zipWithPar_(self, that, (b, _) => b)
}

/**
 * Like `zipPar`, but keeps only the result from this sink.
 */
export function zipParLeft<R1, E1, I1, L1>(that: Sink<R1, E1, I1, L1, unknown>) {
  return <R, E, I, L, Z>(self: Sink<R, E, I, L, Z>) => zipParLeft_(self, that)
}

/**
 * Like `zipPar`, but keeps only the result from the `that` sink.
 */
export function zipParRight_<R, R1, E, E1, I, I1, L, L1, Z, Z1>(
  self: Sink<R, E, I, L, Z>,
  that: Sink<R1, E1, I1, L1, Z1>
): Sink<R & R1, E | E1, I & I1, L | L1, Z1> {
  return zipWithPar_(self, that, (_, c) => c)
}

/**
 * Like `zipPar`, but keeps only the result from the `that` sink.
 */
export function zipParRight<R1, E1, I1, L1, Z1>(that: Sink<R1, E1, I1, L1, Z1>) {
  return <R, E, I, L, Z>(self: Sink<R, E, I, L, Z>) => zipParRight_(self, that)
}

/**
 * Like `zip`, but keeps only the result from this sink.
 */
export function zipRight_<R, R1, E, E1, I, I1 extends I, L extends I1, L1, Z, Z1>(
  self: Sink<R, E, I, L, Z>,
  that: Sink<R1, E1, I1, L1, Z1>
): Sink<R & R1, E | E1, I & L1 & I1, L | L1, Z1> {
  return zipWith_(self, that, (_, z1) => z1)
}

/**
 * Like `zip`, but keeps only the result from this sink.
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

class BothRunning {
  readonly _tag = "BothRunning"
}

const bothRunning = new BothRunning()

class LeftDone<Z> {
  readonly _tag = "LeftDone"
  constructor(readonly value: Z) {}
}

class RightDone<Z1> {
  readonly _tag = "RightDone"
  constructor(readonly value: Z1) {}
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
      M.bind("ref", () => T.toManaged(R.makeRef<State<Z, Z1>>(bothRunning))),
      M.bind("p1", () => self.push),
      M.bind("p2", () => that.push),
      M.map(({ p1, p2, ref }) => {
        return (in_: O.Option<A.Chunk<I & I1>>) =>
          T.chain_(ref.get, (state) => {
            const newState = pipe(
              state,
              matchTag({
                BothRunning: (): T.Effect<
                  R & R1,
                  Tp.Tuple<[E.Either<E | E1, Z2>, A.Chunk<L | L1>]>,
                  State<Z, Z1>
                > => {
                  const l: T.Effect<
                    R & R1,
                    Tp.Tuple<[E.Either<E | E1, Z2>, A.Chunk<L | L1>]>,
                    O.Option<Tp.Tuple<[Z, A.Chunk<L>]>>
                  > = T.foldM_(
                    p1(in_),
                    ({ tuple: [e, l] }) =>
                      E.fold_(
                        e,
                        (e) =>
                          Push.fail(e, l) as T.Effect<
                            R & R1,
                            Tp.Tuple<[E.Either<E | E1, Z2>, A.Chunk<L | L1>]>,
                            O.Option<Tp.Tuple<[Z, A.Chunk<L>]>>
                          >,
                        (z) =>
                          T.succeed(O.some(Tp.tuple(z, l))) as T.Effect<
                            R & R1,
                            Tp.Tuple<[E.Either<E | E1, Z2>, A.Chunk<L | L1>]>,
                            O.Option<Tp.Tuple<[Z, A.Chunk<L>]>>
                          >
                      ),
                    (_) =>
                      T.succeed(O.none) as T.Effect<
                        R & R1,
                        Tp.Tuple<[E.Either<E | E1, Z2>, A.Chunk<L | L1>]>,
                        O.Option<Tp.Tuple<[Z, A.Chunk<L>]>>
                      >
                  )
                  const r: T.Effect<
                    R & R1,
                    Tp.Tuple<[E.Either<E | E1, never>, A.Chunk<L | L1>]>,
                    O.Option<Tp.Tuple<[Z1, A.Chunk<L1>]>>
                  > = T.foldM_(
                    p2(in_),
                    ({ tuple: [e, l] }) =>
                      E.fold_(
                        e,
                        (e) =>
                          Push.fail(e, l) as T.Effect<
                            R & R1,
                            Tp.Tuple<[E.Either<E | E1, never>, A.Chunk<L | L1>]>,
                            O.Option<Tp.Tuple<[Z1, A.Chunk<L1>]>>
                          >,
                        (z) =>
                          T.succeed(O.some(Tp.tuple(z, l))) as T.Effect<
                            R & R1,
                            Tp.Tuple<[E.Either<E | E1, never>, A.Chunk<L | L1>]>,
                            O.Option<Tp.Tuple<[Z1, A.Chunk<L1>]>>
                          >
                      ),
                    (_) =>
                      T.succeed(O.none) as T.Effect<
                        R & R1,
                        Tp.Tuple<[E.Either<E | E1, never>, A.Chunk<L | L1>]>,
                        O.Option<Tp.Tuple<[Z1, A.Chunk<L1>]>>
                      >
                  )

                  return T.chain_(
                    T.zipPar_(l, r),
                    ({
                      tuple: [lr, rr]
                    }): T.Effect<
                      R & R1,
                      Tp.Tuple<[E.Either<E1, Z2>, A.Chunk<L | L1>]>,
                      State<Z, Z1>
                    > => {
                      if (O.isSome(lr)) {
                        const [z, l] = lr.value.tuple

                        if (O.isSome(rr)) {
                          const [z1, l1] = rr.value.tuple

                          return T.fail(
                            Tp.tuple(E.right(f(z, z1)), A.size(l) > A.size(l1) ? l1 : l)
                          )
                        } else {
                          return T.succeed(new LeftDone(z))
                        }
                      } else {
                        if (O.isSome(rr)) {
                          const [z1] = rr.value.tuple

                          return T.succeed(new RightDone(z1))
                        } else {
                          return T.succeed(bothRunning)
                        }
                      }
                    }
                  ) as T.Effect<
                    R & R1,
                    Tp.Tuple<[E.Either<E1, Z2>, A.Chunk<L | L1>]>,
                    State<Z, Z1>
                  >
                },
                LeftDone: ({ value: z }) =>
                  T.as_(
                    T.catchAll_(
                      p2(in_),
                      ({
                        tuple: [e, leftover]
                      }): T.Effect<
                        R & R1,
                        Tp.Tuple<[E.Either<E | E1, Z2>, A.Chunk<L | L1>]>,
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
                      ({
                        tuple: [e, leftover]
                      }): T.Effect<
                        R & R1,
                        Tp.Tuple<[E.Either<E | E1, Z2>, A.Chunk<L | L1>]>,
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
): Sink<R, E, I, never, Tp.Tuple<[Z, A.Chunk<L>]>> {
  return new Sink(
    M.map_(self.push, (p) => {
      return (in_: O.Option<A.Chunk<I>>) =>
        T.mapError_(p(in_), ({ tuple: [v, leftover] }) =>
          Tp.tuple(
            E.map_(v, (z) => Tp.tuple(z, leftover)),
            A.empty()
          )
        )
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
    M.map_(
      self.push,
      (p) => (in_: O.Option<A.Chunk<I>>) =>
        T.mapError_(p(in_), ({ tuple: [v, _] }) => Tp.tuple(v, A.empty()))
    )
  )
}

function untilOutputMGo<E, I, R, R1, E1, L, Z>(
  in_: O.Option<A.Chunk<I>>,
  end: boolean,
  push: Push.Push<R, E, I, L, Z>,
  restart: T.Effect<R, never, void>,
  f: (z: Z) => T.Effect<R1, E1, boolean>
): T.Effect<R & R1, Tp.Tuple<[E.Either<E | E1, O.Option<Z>>, A.Chunk<L>]>, void> {
  return T.catchAll_(push(in_), ({ tuple: [e, leftover] }) =>
    E.fold_(
      e,
      (e) => Push.fail(e, leftover),
      (z) =>
        T.chain_(
          T.mapError_(f(z), (err) => Tp.tuple(E.left(err), leftover)),
          (satisfied) => {
            if (satisfied) {
              return Push.emit(O.some(z), leftover)
            } else if (A.isEmpty(leftover)) {
              return end
                ? Push.emit(O.none, A.empty())
                : T.zipRight_(restart, Push.more)
            } else {
              return untilOutputMGo(
                O.some(leftover) as O.Option<A.Chunk<I>>,
                end,
                push,
                restart,
                f
              )
            }
          }
        )
    )
  )
}

/**
 * Creates a sink that produces values until one verifies
 * the predicate `f`.
 */
export function untilOutputM_<R, R1, E, E1, I, L extends I, Z>(
  self: Sink<R, E, I, L, Z>,
  f: (z: Z) => T.Effect<R1, E1, boolean>
): Sink<R & R1, E | E1, I, L, O.Option<Z>> {
  return new Sink(
    M.map_(
      Push.restartable(self.push),
      ({ tuple: [push, restart] }) =>
        (is: O.Option<A.Chunk<I>>) =>
          untilOutputMGo(is, O.isNone(is), push, restart, f)
    )
  )
}

/**
 * Creates a sink that produces values until one verifies
 * the predicate `f`.
 */
export function untilOutputM<R1, E1, Z>(f: (z: Z) => T.Effect<R1, E1, boolean>) {
  return <R, E, I, L extends I>(self: Sink<R, E, I, L, Z>) => untilOutputM_(self, f)
}

/**
 * Provides the sink with its required environment, which eliminates
 * its dependency on `R`.
 */
export function provideAll_<R, E, I, L, Z>(
  self: Sink<R, E, I, L, Z>,
  r: R
): Sink<unknown, E, I, L, Z> {
  return new Sink(
    M.map_(
      M.provideAll_(self.push, r),
      (push) => (i: O.Option<A.Chunk<I>>) => T.provideAll_(push(i), r)
    )
  )
}

/**
 * Provides the sink with its required environment, which eliminates
 * its dependency on `R`.
 */
export function provideAll<R>(r: R) {
  return <E, I, L, Z>(self: Sink<R, E, I, L, Z>) => provideAll_(self, r)
}

/**
 * Provides some of the environment required to run this effect,
 * leaving the remainder `R0`.
 */
export function provideSome_<R0, R, E, I, L, Z>(
  self: Sink<R, E, I, L, Z>,
  f: (r0: R0) => R
) {
  return new Sink(
    M.map_(
      M.provideSome_(self.push, f),
      (push) => (i: O.Option<A.Chunk<I>>) => T.provideSome_(push(i), f)
    )
  )
}

/**
 * Provides some of the environment required to run this effect,
 * leaving the remainder `R0`.
 */
export function provideSome<R0, R>(f: (r0: R0) => R) {
  return <E, I, L, Z>(self: Sink<R, E, I, L, Z>) => provideSome_(self, f)
}

/**
 * Provides a layer to the `Managed`, which translates it to another level.
 */
export function provideLayer<R2, R>(layer: L.Layer<R2, never, R>) {
  return <E, I, L, Z>(self: Sink<R, E, I, L, Z>) => provideLayer_(self, layer)
}

/**
 * Provides a layer to the `Managed`, which translates it to another level.
 */
export function provideLayer_<R, E, I, L, Z, R2>(
  self: Sink<R, E, I, L, Z>,
  layer: L.Layer<R2, never, R>
) {
  return new Sink<R2, E, I, L, Z>(
    M.chain_(L.build(layer), (r) =>
      M.map_(
        M.provideAll_(self.push, r),
        (push) => (i: O.Option<A.Chunk<I>>) => T.provideAll_(push(i), r)
      )
    )
  )
}

/**
 * Splits the environment into two parts, providing one part using the
 * specified layer and leaving the remainder `R0`.
 */
export function provideSomeLayer<R2, R>(layer: L.Layer<R2, never, R>) {
  return <R0, E, I, L, Z>(self: Sink<R & R0, E, I, L, Z>): Sink<R0 & R2, E, I, L, Z> =>
    provideLayer(layer["+++"](L.identity<R0>()))(self)
}

/**
 * Creates a Sink from a managed `Push`
 */
export function managedPush<R, E, I, L, Z>(
  push: M.Managed<R, never, Push.Push<R, E, I, L, Z>>
): Sink<R, E, I, L, Z> {
  return new Sink(push)
}

/**
 * Accesses the environment of the sink in the context of a sink.
 */
export function accessM<R, R2, E, I, L, Z>(
  f: (r: R) => Sink<R2, E, I, L, Z>
): Sink<R & R2, E, I, L, Z> {
  return new Sink(M.chain_(M.environment<R>(), (env) => f(env).push))
}

/**
 * A sink that collects all of its inputs into an array.
 */
export function collectAll<A>(): Sink<unknown, never, A, never, A.Chunk<A>> {
  return reduceLeftChunks(A.empty<A>())((s, i: A.Chunk<A>) => A.concat_(s, i))
}

/**
 * A sink that collects all of its inputs into an list.
 */
export function collectAllToList<A>(): Sink<unknown, never, A, never, List.List<A>> {
  return reduceLeftChunks(List.empty<A>())((s, i: A.Chunk<A>) =>
    List.concat_(s, List.from(i))
  )
}

/**
 * A sink that collects all of its inputs into a map. The keys are extracted from inputs
 * using the keying function `key`; if multiple inputs use the same key, they are merged
 * using the `f` function.
 */
export function collectAllToMap<A, K>(key: (a: A) => K) {
  return (f: (a: A, a1: A) => A): Sink<unknown, never, A, never, MP.Map<K, A>> =>
    new Sink(
      M.suspend(
        () =>
          reduceLeftChunks<Map<K, A>>(new Map())((acc, as: A.Chunk<A>) =>
            A.reduce_(as, acc, (acc, a) => {
              const k = key(a)
              const v = acc.get(k)

              return acc.set(k, v ? f(v, a) : a)
            })
          ).push
      )
    )
}

/**
 * A sink that collects all of its inputs into a set.
 */
export function collectAllToSet<A>(): Sink<unknown, never, A, never, Set<A>> {
  return map_(collectAll<A>(), (as) => new Set(as))
}

/**
 * A sink that counts the number of elements fed to it.
 */
export const count: Sink<unknown, never, unknown, never, number> = reduceLeft(0)(
  (s, _) => s + 1
)

/**
 * Creates a sink halting with the specified `Throwable`.
 */
export function die(e: unknown): Sink<unknown, never, unknown, never, never> {
  return halt(C.die(e))
}

/**
 * Creates a sink halting with the specified message, wrapped in a
 * `RuntimeException`.
 */
export function dieMessage(m: string): Sink<unknown, never, unknown, never, never> {
  return halt(C.die(new C.RuntimeError(m)))
}

/**
 * A sink that ignores its inputs.
 */
export const drain: Sink<unknown, never, unknown, never, void> = dropLeftover(
  forEach((_) => T.unit)
)

/**
 * A sink that always fails with the specified error.
 */
export function fail<E>(e: E) {
  return <I>(): Sink<unknown, E, I, I, never> =>
    fromPush((c) => {
      const leftover: A.Chunk<I> = O.fold_(
        c,
        () => A.empty(),
        (x) => x
      )

      return Push.fail(e, leftover)
    })
}

const reduceChunkGo = <S, I>(
  s: S,
  chunk: A.Chunk<I>,
  idx: number,
  len: number,
  contFn: (s: S) => boolean,
  f: (s: S, i: I) => S
): readonly [S, O.Option<A.Chunk<I>>] => {
  if (idx === len) {
    return [s, O.none] as const
  } else {
    const s1 = f(s, A.unsafeGet_(chunk, idx))

    if (contFn(s1)) {
      return reduceChunkGo(s1, chunk, idx + 1, len, contFn, f)
    } else {
      return [s1, O.some(A.drop_(chunk, idx + 1))] as const
    }
  }
}

/**
 * A sink that folds its inputs with the provided function, termination predicate and initial state.
 */
export function reduce<S, I>(
  z: S,
  contFn: (s: S) => boolean,
  f: (s: S, i: I) => S
): Sink<unknown, never, I, I, S> {
  if (contFn(z)) {
    return new Sink(
      pipe(
        M.do,
        M.bind("state", () => T.toManaged(R.makeRef(z))),
        M.map(
          ({ state }) =>
            (is: O.Option<A.Chunk<I>>) =>
              O.fold_(
                is,
                () => T.chain_(state.get, (s) => Push.emit(s, A.empty())),
                (is) =>
                  T.chain_(state.get, (s) => {
                    const [st, l] = reduceChunkGo(s, is, 0, A.size(is), contFn, f)

                    return O.fold_(
                      l,
                      () => T.zipRight_(state.set(st), Push.more),
                      (leftover) => Push.emit(st, leftover)
                    )
                  })
              )
        )
      )
    )
  } else {
    return succeed(z)
  }
}

/**
 * A sink that folds its input chunks with the provided function, termination predicate and initial state.
 * `contFn` condition is checked only for the initial value and at the end of processing of each chunk.
 * `f` and `contFn` must preserve chunking-invariance.
 */
export function reduceChunks<Z>(z: Z) {
  return (contFn: (s: Z) => boolean) =>
    <I>(f: (s: Z, i: A.Chunk<I>) => Z): Sink<unknown, never, I, I, Z> =>
      reduceChunksM(z)(contFn)((z, i: A.Chunk<I>) => T.succeed(f(z, i)))
}

/**
 * A sink that effectfully folds its input chunks with the provided function, termination predicate and initial state.
 * `contFn` condition is checked only for the initial value and at the end of processing of each chunk.
 * `f` and `contFn` must preserve chunking-invariance.
 */
export function reduceChunksM<S>(z: S) {
  return (contFn: (s: S) => boolean) =>
    <R, E, I>(f: (a: S, i: A.Chunk<I>) => T.Effect<R, E, S>): Sink<R, E, I, I, S> => {
      if (contFn(z)) {
        return new Sink(
          pipe(
            M.do,
            M.bind("state", () => T.toManaged(R.makeRef(z))),
            M.map(({ state }) => {
              return (is: O.Option<A.Chunk<I>>) =>
                O.fold_(
                  is,
                  () => T.chain_(state.get, (s) => Push.emit(s, A.empty<I>())),
                  (is) =>
                    pipe(
                      state.get,
                      T.chain((_) => f(_, is)),
                      T.mapError((e) => Tp.tuple(E.left(e), A.empty<I>())),
                      T.chain((s) => {
                        if (contFn(s)) {
                          return T.zipRight_(state.set(s), Push.more)
                        } else {
                          return Push.emit(s, A.empty<I>())
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

function reduceMGo<R, E, S, I>(
  s: S,
  chunk: A.Chunk<I>,
  idx: number,
  len: number,
  contFn: (s: S) => boolean,
  f: (s: S, i: I) => T.Effect<R, E, S>
): T.Effect<R, readonly [E, A.Chunk<I>], readonly [S, O.Option<A.Chunk<I>>]> {
  if (idx === len) {
    return T.succeed([s, O.none] as const)
  } else {
    return T.foldM_(
      f(s, A.unsafeGet_(chunk, idx)),
      (e) => T.fail([e, A.drop_(chunk, idx + 1)] as const),
      (s1) =>
        contFn(s1)
          ? reduceMGo(s1, chunk, idx + 1, len, contFn, f)
          : T.succeed([s1, O.some(A.drop_(chunk, idx + 1))])
    )
  }
}

/**
 * A sink that effectfully folds its inputs with the provided function, termination predicate and initial state.
 *
 * This sink may terminate in the middle of a chunk and discard the rest of it. See the discussion on the
 * ZSink class scaladoc on sinks vs. transducers.
 */
export function reduceM<S, R, E, I>(
  z: S,
  contFn: (s: S) => boolean,
  f: (s: S, i: I) => T.Effect<R, E, S>
): Sink<R, E, I, I, S> {
  if (contFn(z)) {
    return new Sink(
      pipe(
        M.do,
        M.bind("state", () => T.toManaged(R.makeRef(z))),
        M.map(
          ({ state }) =>
            (is: O.Option<A.Chunk<I>>) =>
              O.fold_(
                is,
                () => T.chain_(state.get, (s) => Push.emit(s, A.empty())),
                (is) =>
                  T.chain_(state.get, (s) =>
                    T.foldM_(
                      reduceMGo(s, is, 0, A.size(is), contFn, f),
                      (err) => Push.fail(...err),
                      ([st, l]) =>
                        O.fold_(
                          l,
                          () => T.zipRight_(state.set(st), Push.more),
                          (leftover) => Push.emit(st, leftover)
                        )
                    )
                  )
              )
        )
      )
    )
  } else {
    return succeed(z)
  }
}

/**
 * A sink that folds its inputs with the provided function and initial state.
 */
export function reduceLeft<S>(z: S) {
  return <I>(f: (s: S, i: I) => S): Sink<unknown, never, I, never, S> =>
    dropLeftover(reduce(z, (_) => true, f))
}

/**
 * A sink that folds its input chunks with the provided function and initial state.
 * `f` must preserve chunking-invariance.
 */
export function reduceLeftChunks<S>(z: S) {
  return <I>(f: (s: S, i: A.Chunk<I>) => S): Sink<unknown, never, I, never, S> =>
    dropLeftover(reduceChunks(z)(() => true)(f))
}

/**
 * A sink that effectfully folds its input chunks with the provided function and initial state.
 * `f` must preserve chunking-invariance.
 */
export function reduceLeftChunksM<S>(z: S) {
  return <R, E, I>(
    f: (s: S, i: A.Chunk<I>) => T.Effect<R, E, S>
  ): Sink<R, E, I, never, S> => dropLeftover(reduceChunksM(z)((_) => true)(f))
}

/**
 * A sink that effectfully folds its inputs with the provided function and initial state.
 */
export function reduceLeftM<S>(z: S) {
  return <R, E, I>(f: (s: S, i: I) => T.Effect<R, E, S>): Sink<R, E, I, never, S> =>
    dropLeftover(reduceM(z, (_) => true, f))
}

function forEachGo<I, R1, E1, X>(
  chunk: A.Chunk<I>,
  idx: number,
  len: number,
  f: (i: I) => T.Effect<R1, E1, X>
): T.Effect<R1, Tp.Tuple<[E.Either<E1, never>, A.Chunk<I>]>, void> {
  if (idx === len) {
    return Push.more
  } else {
    return pipe(
      f(A.unsafeGet_(chunk, idx)),
      T.foldM(
        (e) => Push.fail(e, A.drop_(chunk, idx + 1)),
        () => forEachGo(chunk, idx + 1, len, f)
      )
    )
  }
}

/**
 * A sink that executes the provided effectful function for every element fed to it.
 */
export function forEach<I, R1, E1, X>(f: (i: I) => T.Effect<R1, E1, X>) {
  return fromPush(
    O.fold(
      () => Push.emit<never, void>(undefined, A.empty()),
      (is: A.Chunk<I>) => forEachGo(is, 0, A.size(is), f)
    )
  )
}

/**
 * A sink that executes the provided effectful function for every chunk fed to it.
 */
export function forEachChunk<R, E, I, X>(
  f: (a: A.Chunk<I>) => T.Effect<R, E, X>
): Sink<R, E, I, never, void> {
  return fromPush((in_: O.Option<A.Chunk<I>>) =>
    O.fold_(
      in_,
      () => Push.emit<never, void>(undefined, A.empty()),
      (is) =>
        T.zipRight_(
          T.mapError_(f(is), (e) => Tp.tuple(E.left(e), A.empty())),
          Push.more
        )
    )
  )
}

/**
 * A sink that executes the provided effectful function for every element fed to it
 * until `f` evaluates to `false`.
 */
export function forEachWhile<R, E, I>(
  f: (i: I) => T.Effect<R, E, boolean>
): Sink<R, E, I, I, void> {
  const go = (
    chunk: A.Chunk<I>,
    idx: number,
    len: number
  ): T.Effect<R, Tp.Tuple<[E.Either<E, void>, A.Chunk<I>]>, void> => {
    if (idx === len) {
      return Push.more
    } else {
      return T.foldM_(
        f(A.unsafeGet_(chunk, idx)),
        (e) => Push.fail(e, A.drop_(chunk, idx + 1)),
        (b) => {
          if (b) {
            return go(chunk, idx + 1, len)
          } else {
            return Push.emit<I, void>(undefined, A.drop_(chunk, idx))
          }
        }
      )
    }
  }

  return fromPush((in_: O.Option<A.Chunk<I>>) =>
    O.fold_(
      in_,
      () => Push.emit<never, void>(undefined, A.empty()),
      (is) => go(is, 0, A.size(is))
    )
  )
}

/**
 * Creates a single-value sink produced from an effect
 */
export function fromEffect<R, E, Z>(b: T.Effect<R, E, Z>) {
  return <I>(): Sink<R, E, I, I, Z> =>
    fromPush<R, E, I, I, Z>((in_: O.Option<A.Chunk<I>>) => {
      const leftover = O.fold_(in_, () => A.empty<I>(), identity)

      return T.foldM_(
        b,
        (e) => Push.fail(e, leftover),
        (z) => Push.emit(z, leftover)
      )
    })
}

/**
 * Creates a sink from a Push
 */
export function fromPush<R, E, I, L, Z>(push: Push.Push<R, E, I, L, Z>) {
  return new Sink(M.succeed(push))
}

/**
 * Creates a sink halting with a specified cause.
 */
export function halt<E>(e: C.Cause<E>): Sink<unknown, E, unknown, never, never> {
  return fromPush((_) => Push.halt(e))
}

/**
 * Creates a sink containing the first value.
 */
export function head<I>(): Sink<unknown, never, I, I, O.Option<I>> {
  return new Sink(
    M.succeed((in_: O.Option<A.Chunk<I>>) =>
      O.fold_(
        in_,
        () => Push.emit(O.none, A.empty()),
        (ch) => (A.isEmpty(ch) ? Push.more : Push.emit(A.head(ch), A.empty()))
      )
    )
  )
}

/**
 * Creates a sink containing the last value.
 */
export function last<I>(): Sink<unknown, never, I, never, O.Option<I>> {
  return new Sink(
    pipe(
      M.do,
      M.bind("state", () => T.toManaged(R.makeRef<O.Option<I>>(O.none))),
      M.map(
        ({ state }) =>
          (is: O.Option<A.Chunk<I>>) =>
            T.chain_(state.get, (last) =>
              O.fold_(
                is,
                () => Push.emit(last, A.empty()),
                (ch) =>
                  O.fold_(
                    A.last(ch),
                    () => Push.more,
                    (l) => T.zipRight_(state.set(O.some(l)), Push.more)
                  )
              )
            )
      )
    )
  )
}

/**
 * A sink that depends on another managed value
 * `resource` will be finalized after the processing.
 *
 * @deprecated Use unwrapManaged
 */
export function managed_<R, E, A, I, L extends I, Z>(
  resource: M.Managed<R, E, A>,
  fn: (a: A) => Sink<R, E, I, L, Z>
) {
  return M.chain_(
    M.fold_(
      resource,
      (err) => fail(err)<I>() as Sink<R, E, I, I, Z>,
      (m) => fn(m)
    ),
    (_) => _.push
  )
}

/**
 * A sink that depends on another managed value
 * `resource` will be finalized after the processing.
 *
 * @deprecated Use unwrapManaged
 */
export function managed<R, E, A>(resource: M.Managed<R, E, A>) {
  return <I, L extends I, Z>(fn: (a: A) => Sink<R, E, I, L, Z>) =>
    managed_(resource, fn)
}

/**
 * A sink that immediately ends with the specified value.
 */
export function succeed<Z, I>(z: Z): Sink<unknown, never, I, I, Z> {
  return fromPush<unknown, never, I, I, Z>((c) => {
    const leftover = O.fold_(
      c,
      () => A.empty<I>(),
      (x) => x
    )

    return Push.emit(z, leftover)
  })
}

/**
 * A sink that sums incoming numeric values.
 */
export const sum: Sink<unknown, never, number, never, number> = reduceLeft(0)(
  (a, b) => a + b
)

/**
 * A sink that takes the specified number of values.
 */
export function take<I>(n: number): Sink<unknown, never, I, I, A.Chunk<I>> {
  return new Sink(
    pipe(
      M.do,
      M.bind("state", () => T.toManaged(R.makeRef<A.Chunk<I>>(A.empty()))),
      M.map(({ state }) => {
        return (is: O.Option<A.Chunk<I>>) =>
          T.chain_(state.get, (take) =>
            O.fold_(
              is,
              () => {
                if (n >= 0) {
                  return Push.emit(take, A.empty() as A.Chunk<I>)
                } else {
                  return Push.emit(A.empty(), take)
                }
              },
              (ch) => {
                const remaining = n - A.size(take)

                if (remaining <= A.size(ch)) {
                  const {
                    tuple: [chunk, leftover]
                  } = A.splitAt_(ch, remaining)

                  return T.zipRight_(
                    state.set(A.empty()),
                    Push.emit(A.concat_(take, chunk), leftover)
                  )
                } else {
                  return T.zipRight_(state.set(A.concat_(take, ch)), Push.more)
                }
              }
            )
          )
      })
    )
  )
}

/**
 * A sink with timed execution.
 */
export const timedDrain: Sink<HasClock, never, unknown, never, number> = map_(
  timed(drain),
  (_) => _.get(1)
)

/**
 * A sink that executes the provided effectful function for every chunk fed to it.
 */
export function foreachChunk<R, E, I, A>(
  f: (c: A.Chunk<I>) => T.Effect<R, E, A>
): Sink<R, E, I, never, void> {
  return fromPush((o) =>
    O.fold_(
      o,
      () => Push.emit(undefined, A.empty<never>()),
      (is) =>
        pipe(
          f(is),
          T.mapError((e) => Tp.tuple(E.left(e), A.empty<never>())),
          T.zipRight(Push.more)
        )
    )
  )
}

/**
 * Create a sink which enqueues each element into the specified queue.
 */
export function fromQueue<R, E, I, A>(
  queue: Q.XQueue<R, never, E, unknown, I, A>
): Sink<R, E, I, never, void> {
  return forEachChunk((x) => Q.offerAll_(queue, x))
}

/**
 * Create a sink which enqueues each element into the specified queue.
 * The queue will be shutdown once the stream is closed.
 */
export function fromQueueWithShutdown<R, E, I, A>(
  queue: Q.XQueue<R, never, E, unknown, I, A>
): Sink<R, E, I, never, void> {
  return new Sink(
    pipe(
      M.make_(T.succeed(queue), Q.shutdown),
      M.map(fromQueue),
      M.chain((_) => _.push)
    )
  )
}

/**
 * Create a sink which publishes each element to the specified hub.
 */
export function fromHub<R, E, I, A>(
  hub: H.XHub<R, never, E, unknown, I, A>
): Sink<R, E, I, never, void> {
  return fromQueue(H.toQueue(hub))
}

/**
 * Create a sink which publishes each element to the specified hub.
 * The hub will be shutdown once the stream is closed.
 */
export function fromHubWithShutdown<R, E, I, A>(
  hub: H.XHub<R, never, E, unknown, I, A>
): Sink<R, E, I, never, void> {
  return fromQueueWithShutdown(H.toQueue(hub))
}

/**
 * Creates a sink produced from an effect.
 */
export function unwrap<R, E, I, L extends I, Z>(
  effect: T.Effect<R, E, Sink<R, E, I, L, Z>>
): Sink<R, E, I, I, Z> {
  return unwrapManaged(T.toManaged(effect))
}

/**
 * Creates a sink produced from a managed effect.
 */
export function unwrapManaged<R, E, I, L extends I, Z>(
  managed: M.Managed<R, E, Sink<R, E, I, L, Z>>
): Sink<R, E, I, I, Z> {
  return new Sink(
    M.chain_(
      M.fold_(
        managed,
        (err): Sink<R, E, I, I, Z> => fail<E>(err)<I>(),
        (_) => _
      ),
      (_) => _.push
    )
  )
}
