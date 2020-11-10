import * as Cause from "../../Cause"
import type { HasClock } from "../../Clock"
import * as T from "../../Effect"
import * as E from "../../Either"
import * as Ex from "../../Exit"
import { constVoid, flow, identity, pipe, tuple } from "../../Function"
import * as L from "../../Layer"
import * as O from "../../Option"
import * as P from "../../Promise"
import type { Schedule } from "../../Schedule"
import {
  chain,
  chain_,
  fail,
  foldCauseM_,
  map_,
  mapM_,
  provideSome_,
  useNow,
  zip_
} from "../core"
import { fromEffect } from "../fromEffect"
import type { IO, RIO, UIO } from "../managed"
import { Managed } from "../managed"
import type { ReleaseMap } from "../ReleaseMap"
import * as RM from "../ReleaseMap"
import { succeed } from "../succeed"
import { absolve } from "./absolve"
import { foldM_ } from "./foldM_"
import { gen } from "./gen"
import { halt } from "./halt"
import { releaseMap } from "./releaseMap"
import { sandbox } from "./sandbox"
import { suspend } from "./suspend"

/**
 * Unwraps the optional success of this effect, but can fail with None value.
 */
export function get<R, A>(self: Managed<R, never, O.Option<A>>) {
  return absolve(
    map_(
      self,
      E.fromOption(() => O.none)
    )
  )
}

/**
 * Returns an effect whose failure is mapped by the specified `f` function.
 */
export function mapError_<R, A, E, E2>(self: Managed<R, E, A>, f: (e: E) => E2) {
  return new Managed(T.mapError_(self.effect, f))
}

/**
 * Returns an effect whose failure is mapped by the specified `f` function.
 */
export function mapError<E, E2>(f: (e: E) => E2) {
  return <R, A>(self: Managed<R, E, A>) => mapError_(self, f)
}

/**
 * Returns an effect whose full failure is mapped by the specified `f` function.
 */
export function mapErrorCause_<R, A, E, E2>(
  self: Managed<R, E, A>,
  f: (e: Cause.Cause<E>) => Cause.Cause<E2>
) {
  return new Managed(T.mapErrorCause_(self.effect, f))
}

/**
 * Returns an effect whose full failure is mapped by the specified `f` function.
 */
export function mapErrorCause<E, E2>(f: (e: Cause.Cause<E>) => Cause.Cause<E2>) {
  return <R, A>(self: Managed<R, E, A>) => mapErrorCause_(self, f)
}

/**
 * Returns a memoized version of the specified managed.
 */
export function memoize<R, E, A>(self: Managed<R, E, A>): UIO<Managed<R, E, A>> {
  return mapM_(releaseMap, (finalizers) =>
    T.gen(function* (_) {
      const promise = yield* _(P.make<E, A>())
      const complete = yield* _(
        T.once(
          T.accessM((r: R) =>
            pipe(
              self.effect,
              T.provideAll(tuple(r, finalizers)),
              T.map(([_, a]) => a),
              T.to(promise)
            )
          )
        )
      )

      return pipe(complete, T.andThen(P.await(promise)), T.toManaged())
    })
  )
}

/**
 * Returns a new effect where the error channel has been merged into the
 * success channel to their common combined type.
 */
export function merge<R, E, A>(self: Managed<R, E, A>) {
  return foldM_(self, succeed, succeed)
}

/**
 * Returns the managed resulting from mapping the success of this managed to unit.
 */
export const unit = suspend(() => fromEffect(T.unit))

/**
 * Requires the option produced by this value to be `None`.
 */
export function none<R, E, A>(
  self: Managed<R, E, O.Option<A>>
): Managed<R, O.Option<E>, void> {
  return foldM_(
    self,
    flow(O.some, fail),
    O.fold(
      () => unit,
      () => fail(O.none)
    )
  )
}

/**
 * Folds over the failure value or the success value to yield an effect that
 * does not fail, but succeeds with the value returned by the left or right
 * function passed to `fold`.
 */
export function fold_<R, E, A, B, C>(
  self: Managed<R, E, A>,
  onFail: (e: E) => B,
  onSuccess: (a: A) => C
) {
  return foldM_(self, flow(onFail, succeed), flow(onSuccess, succeed))
}

/**
 * Folds over the failure value or the success value to yield an effect that
 * does not fail, but succeeds with the value returned by the left or right
 * function passed to `fold`.
 */
export function fold<E, A, B, C>(onFail: (e: E) => B, onSuccess: (a: A) => C) {
  return <R>(self: Managed<R, E, A>) => fold_(self, onFail, onSuccess)
}

/**
 * Executes this effect, skipping the error but returning optionally the success.
 */
export function option<R, E, A>(
  self: Managed<R, E, A>
): Managed<R, never, O.Option<A>> {
  return fold_(self, () => O.none, O.some)
}

/**
 * Converts an option on errors into an option on values.
 */
export function optional<R, E, A>(
  self: Managed<R, O.Option<E>, A>
): Managed<R, E, O.Option<A>> {
  return foldM_(
    self,
    O.fold(() => succeed(O.none), fail),
    flow(O.some, succeed)
  )
}

/**
 * Keeps none of the errors, and terminates the fiber with them, using
 * the specified function to convert the `E` into a `Throwable`.
 */
export function orDieWith<E>(f: (e: E) => unknown) {
  return <R, A>(self: Managed<R, E, A>) => new Managed(T.orDieWith_(self.effect, f))
}

/**
 * Keeps none of the errors, and terminates the fiber with them, using
 * the specified function to convert the `E` into a `Throwable`.
 */
export function orDieWith_<R, E, A>(self: Managed<R, E, A>, f: (e: E) => unknown) {
  return new Managed(T.orDieWith_(self.effect, f))
}

/**
 * Translates effect failure into death of the fiber, making all failures unchecked and
 * not a part of the type of the effect.
 */
export function orDie<R, E, A>(self: Managed<R, E, A>) {
  return orDieWith_(self, identity)
}

/**
 * Executes this effect and returns its value, if it succeeds, but
 * otherwise executes the specified effect.
 */
export function orElse<R2, E2, A2>(that: () => Managed<R2, E2, A2>) {
  return <R, E, A>(self: Managed<R, E, A>) => orElse_(self, that)
}

/**
 * Executes this effect and returns its value, if it succeeds, but
 * otherwise executes the specified effect.
 */
export function orElse_<R, E, A, R2, E2, A2>(
  self: Managed<R, E, A>,
  that: () => Managed<R2, E2, A2>
) {
  return foldM_(self, () => that(), succeed)
}

/**
 * Executes this effect and returns its value, if it succeeds, but
 * otherwise fails with the specified error.
 */
export function orElseFail<E2>(e: E2) {
  return <R, E, A>(self: Managed<R, E, A>) => orElseFail_(self, e)
}

/**
 * Executes this effect and returns its value, if it succeeds, but
 * otherwise fails with the specified error.
 */
export function orElseFail_<R, E, A, E2>(self: Managed<R, E, A>, e: E2) {
  return orElse_(self, () => fail(e))
}

/**
 * Executes this effect and returns its value, if it succeeds, but
 * otherwise executes the specified effect.
 */
export function orElseEither<R2, E2, A2>(that: () => Managed<R2, E2, A2>) {
  return <R, E, A>(self: Managed<R, E, A>): Managed<R & R2, E2, E.Either<A2, A>> =>
    orElseEither_(self, that)
}

/**
 * Executes this effect and returns its value, if it succeeds, but
 * otherwise executes the specified effect.
 */
export function orElseEither_<R, E, A, R2, E2, A2>(
  self: Managed<R, E, A>,
  that: () => Managed<R2, E2, A2>
): Managed<R & R2, E2, E.Either<A2, A>> {
  return foldM_(self, () => map_(that(), E.left), flow(E.right, succeed))
}

/**
 * Returns an effect that will produce the value of this effect, unless it
 * fails with the `None` value, in which case it will produce the value of
 * the specified effect.
 */
export function orElseOptional_<R, E, A, R2, E2, A2>(
  self: Managed<R, O.Option<E>, A>,
  that: () => Managed<R2, O.Option<E2>, A2>
): Managed<R & R2, O.Option<E | E2>, A | A2> {
  return catchAll_(
    self,
    O.fold(
      () => that(),
      (e) => fail(O.some<E | E2>(e))
    )
  )
}

/**
 * Executes this effect and returns its value, if it succeeds, but
 * otherwise succeeds with the specified value.
 */
export function orElseSucceed_<R, E, A, A2>(
  self: Managed<R, O.Option<E>, A>,
  that: () => A2
): Managed<R, O.Option<E>, A | A2> {
  return orElse_(self, () => succeed(that()))
}

/**
 * Executes this effect and returns its value, if it succeeds, but
 * otherwise succeeds with the specified value.
 */
export function orElseSucceed<R, E, A, A2>(that: () => A2) {
  return (self: Managed<R, O.Option<E>, A>) => orElseSucceed_(self, that)
}

/**
 * Returns an effect that will produce the value of this effect, unless it
 * fails with the `None` value, in which case it will produce the value of
 * the specified effect.
 */
export function orElseOptional<R2, E2, A2>(that: () => Managed<R2, O.Option<E2>, A2>) {
  return <R, E, A>(self: Managed<R, O.Option<E>, A>) => orElseOptional_(self, that)
}

/**
 * Recovers from all errors.
 */
export function catchAll_<R, E, A, R2, E2, A2>(
  self: Managed<R, E, A>,
  f: (e: E) => Managed<R2, E2, A2>
) {
  return foldM_(self, f, succeed)
}

/**
 * Recovers from all errors.
 */
export function catchAll<E, R2, E2, A2>(f: (e: E) => Managed<R2, E2, A2>) {
  return <R, A>(self: Managed<R, E, A>) => catchAll_(self, f)
}

/**
 * Recovers from all errors with provided Cause.
 */
export function catchAllCause_<R, E, A, R2, E2, A2>(
  self: Managed<R, E, A>,
  f: (e: Cause.Cause<E>) => Managed<R2, E2, A2>
) {
  return foldCauseM_(self, f, succeed)
}

/**
 * Recovers from all errors with provided Cause.
 */
export function catchAllCause<E, R2, E2, A2>(
  f: (e: Cause.Cause<E>) => Managed<R2, E2, A2>
) {
  return <R, A>(self: Managed<R, E, A>) => foldCauseM_(self, f, succeed)
}

/**
 * Recovers from some or all of the error cases.
 */
export function catchSome_<R, E, A, R2, E2, A2>(
  self: Managed<R, E, A>,
  pf: (e: E) => O.Option<Managed<R2, E2, A2>>
): Managed<R & R2, E | E2, A | A2> {
  return catchAll_(self, (e) => O.getOrElse_(pf(e), () => fail<E | E2>(e)))
}

/**
 * Recovers from some or all of the error cases.
 */
export function catchSome<E, R2, E2, A2>(pf: (e: E) => O.Option<Managed<R2, E2, A2>>) {
  return <R, A>(self: Managed<R, E, A>) => catchSome_(self, pf)
}

/**
 * Recovers from some or all of the error cases.
 */
export function catchSomeCause_<R, E, A, R2, E2, A2>(
  self: Managed<R, E, A>,
  pf: (e: Cause.Cause<E>) => O.Option<Managed<R2, E2, A2>>
): Managed<R & R2, E | E2, A | A2> {
  return catchAllCause_(self, (e) => O.getOrElse_(pf(e), () => halt<E | E2>(e)))
}

/**
 * Recovers from some or all of the error cases.
 */
export function catchSomeCause<R, E, A, R2, E2, A2>(
  pf: (e: Cause.Cause<E>) => O.Option<Managed<R2, E2, A2>>
) {
  return (self: Managed<R, E, A>) => catchSomeCause_(self, pf)
}

/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * continue with the returned value.
 */
export function collectM_<R, E, A, E1, R1, E2, B>(
  self: Managed<R, E, A>,
  e: E1,
  pf: (a: A) => O.Option<Managed<R1, E2, B>>
): Managed<R & R1, E | E1 | E2, B> {
  return chain_(self, (a) => O.getOrElse_(pf(a), () => fail<E1 | E2>(e)))
}

/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * continue with the returned value.
 */
export function collectM<A, E1, R1, E2, B>(
  e: E1,
  pf: (a: A) => O.Option<Managed<R1, E2, B>>
) {
  return <R, E>(self: Managed<R, E, A>) => collectM_(self, e, pf)
}

/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * succeed with the returned value.
 */
export function collect_<R, E, A, E1, B>(
  self: Managed<R, E, A>,
  e: E1,
  pf: (a: A) => O.Option<B>
): Managed<R, E | E1, B> {
  return collectM_(self, e, flow(pf, O.map(succeed)))
}

/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * succeed with the returned value.
 */
export function collect<A, E1, B>(e: E1, pf: (a: A) => O.Option<B>) {
  return <R, E>(self: Managed<R, E, A>) => collect_(self, e, pf)
}

/**
 * Provides the `Managed` effect with its required environment, which eliminates
 * its dependency on `R`.
 */
export function provideAll<R>(r: R) {
  return <E, A>(self: Managed<R, E, A>) => provideAll_(self, r)
}

/**
 * Provides the `Managed` effect with its required environment, which eliminates
 * its dependency on `R`.
 */
export function provideAll_<R, E, A>(self: Managed<R, E, A>, r: R) {
  return provideSome_(self, () => r)
}

/**
 * Accesses the whole environment of the effect.
 */
export function environment<R>() {
  return fromEffect(T.environment<R>())
}

/**
 * Executes the second effect and then provides its output as an environment to this effect
 */
export function compose<A, E2, B>(that: Managed<A, E2, B>) {
  return <R, E>(self: Managed<R, E, A>) =>
    gen(function* (_) {
      const r1 = yield* _(environment<R>())
      const r = yield* _(provideAll(r1)(self))

      return yield* _(provideAll(r)(that))
    })
}

/**
 * Returns an effect whose failure and success have been lifted into an
 * `Either`. The resulting effect cannot fail
 */
export function either<R, E, A>(
  self: Managed<R, E, A>
): Managed<R, never, E.Either<E, A>> {
  return fold_(self, E.left, E.right)
}

/**
 * Returns a ZManaged that ignores errors raised by the acquire effect and
 * runs it repeatedly until it eventually succeeds.
 */
export function eventually<R, E, A>(self: Managed<R, E, A>): Managed<R, never, A> {
  return new Managed(T.eventually(self.effect))
}

/**
 * Zips this effect with its environment
 */
export function first<R, E, A>(self: Managed<R, E, A>) {
  return zip_(self, environment<R>())
}

/**
 * Effectfully map the error channel
 */
export function chainError_<R, E, A, R2, E2>(
  self: Managed<R, E, A>,
  f: (e: E) => RIO<R2, E2>
): Managed<R & R2, E2, A> {
  return flipWith_(self, chain(f))
}

/**
 * Effectfully map the error channel
 */
export function chainError<E, R2, E2>(f: (e: E) => RIO<R2, E2>) {
  return <R, A>(self: Managed<R, E, A>) => chainError_(self, f)
}

/**
 * Flip the error and result
 */
export function flip<R, E, A>(self: Managed<R, E, A>): Managed<R, A, E> {
  return foldM_(self, succeed, fail)
}

/**
 * Flip the error and result, then apply an effectful function to the effect
 */
export function flipWith_<R, E, A, R2, E1, A1>(
  self: Managed<R, E, A>,
  f: (_: Managed<R, A, E>) => Managed<R2, A1, E1>
) {
  return flip(f(flip(self)))
}

/**
 * Flip the error and result, then apply an effectful function to the effect
 */
export function flipWith<R, E, A, R2, E1, A1>(
  f: (_: Managed<R, A, E>) => Managed<R2, A1, E1>
) {
  return (self: Managed<R, E, A>) => flipWith_(self, f)
}

/**
 * Returns an effect that performs the outer effect first, followed by the
 * inner effect, yielding the value of the inner effect.
 *
 * This method can be used to "flatten" nested effects.
 */
export function flatten<R2, E2, R, E, A>(self: Managed<R2, E2, Managed<R, E, A>>) {
  return chain_(self, identity)
}

/**
 * Returns an effect that performs the outer effect first, followed by the
 * inner effect, yielding the value of the inner effect.
 *
 * This method can be used to "flatten" nested effects.
 */
export function flattenM<R2, E2, R, E, A>(self: Managed<R2, E2, T.Effect<R, E, A>>) {
  return mapM_(self, identity)
}

/**
 * A more powerful version of `fold` that allows recovering from any kind of failure except interruptions.
 */
export function foldCause_<R, E, A, B, C>(
  self: Managed<R, E, A>,
  f: (e: Cause.Cause<E>) => B,
  g: (a: A) => C
) {
  return fold_(sandbox(self), f, g)
}

/**
 * A more powerful version of `fold` that allows recovering from any kind of failure except interruptions.
 */
export function foldCause<E, A, B, C>(f: (e: Cause.Cause<E>) => B, g: (a: A) => C) {
  return <R>(self: Managed<R, E, A>) => fold_(sandbox(self), f, g)
}

/**
 * Returns a new effect that ignores the success or failure of this effect.
 */
export function ignore<R, E, A>(self: Managed<R, E, A>): Managed<R, never, void> {
  return fold_(self, constVoid, constVoid)
}

/**
 * Returns whether this managed effect is a failure.
 */
export function isFailure<R, E, A>(self: Managed<R, E, A>) {
  return fold_(
    self,
    () => true,
    () => false
  )
}

/**
 * Returns whether this managed effect is a success.
 */
export function isSuccess<R, E, A>(self: Managed<R, E, A>) {
  return fold_(
    self,
    () => false,
    () => true
  )
}

/**
 * Depending on the environment execute this or the other effect
 */
export function join<R1, E1, A1>(that: Managed<R1, E1, A1>) {
  return <R, E, A>(self: Managed<R, E, A>): Managed<E.Either<R, R1>, E | E1, A | A1> =>
    join_(self, that)
}

/**
 * Depending on the environment execute this or the other effect
 */
export function join_<R, E, A, R1, E1, A1>(
  self: Managed<R, E, A>,
  that: Managed<R1, E1, A1>
): Managed<E.Either<R, R1>, E | E1, A | A1> {
  return gen(function* (_) {
    const either = yield* _(environment<E.Either<R, R1>>())
    const a1 = yield* _(
      E.fold_(
        either,
        (r): IO<E | E1, A | A1> => provideAll(r)(self),
        (r1) => provideAll(r1)(that)
      )
    )
    return a1
  })
}

/**
 * Depending on provided environment returns either this one or the other effect.
 */
export function joinEither<R2, E2, A2>(that: Managed<R2, E2, A2>) {
  return <R, E, A>(
    self: Managed<R, E, A>
  ): Managed<E.Either<R, R2>, E | E2, E.Either<A, A2>> => joinEither_(self, that)
}

/**
 * Depending on provided environment returns either this one or the other effect.
 */
export function joinEither_<R, E, A, R2, E2, A2>(
  self: Managed<R, E, A>,
  that: Managed<R2, E2, A2>
): Managed<E.Either<R, R2>, E | E2, E.Either<A, A2>> {
  return gen(function* (_) {
    const e = yield* _(environment<E.Either<R, R2>>())
    const r = yield* _(
      E.fold_(
        e,
        (r0): IO<E | E2, E.Either<A, A2>> => provideAll_(map_(self, E.left), r0),
        (r1) => provideAll_(map_(that, E.right), r1)
      )
    )
    return r
  })
}

/**
 * Join self selectively with C
 */
export function identityLeft<C>() {
  return <R, E, A>(
    self: Managed<R, E, A>
  ): Managed<E.Either<R, C>, E, E.Either<A, C>> => joinEither_(self, environment<C>())
}

/**
 * Lifts a synchronous side-effect into a `Managed[R, E, A]`,
 * translating any thrown exceptions into typed failed effects using onThrow.
 */
export function effectPartial<E>(onThrow: (u: unknown) => E) {
  return <A>(f: () => A): Managed<unknown, E, A> =>
    fromEffect(T.effectPartial(onThrow)(f))
}

/**
 * Returns an effect whose success is mapped by the specified side effecting
 * `f` function, translating any thrown exceptions into typed failed effects.
 */
export function mapEffectWith<E2, A, B>(onThrow: (u: unknown) => E2, f: (a: A) => B) {
  return <R, E>(self: Managed<R, E, A>): Managed<R, E | E2, B> =>
    mapEffectWith_(self, onThrow, f)
}

/**
 * Returns an effect whose success is mapped by the specified side effecting
 * `f` function, translating any thrown exceptions into typed failed effects.
 */
export function mapEffectWith_<R, E, E2, A, B>(
  self: Managed<R, E, A>,
  onThrow: (u: unknown) => E2,
  f: (a: A) => B
): Managed<R, E | E2, B> {
  return foldM_(
    self,
    (e) => fail(e),
    (a) => effectPartial(onThrow)(() => f(a))
  )
}

/**
 * Returns an effect whose success is mapped by the specified side effecting
 * `f` function, translating any thrown exceptions into typed failed effects.
 */
export function mapEffect_<R, E, A, B>(
  self: Managed<R, E, A>,
  f: (a: A) => B
): Managed<R, unknown, B> {
  return mapEffectWith_(self, identity, f)
}

/**
 * Returns an effect whose success is mapped by the specified side effecting
 * `f` function, translating any thrown exceptions into typed failed effects.
 */
export function mapEffect<A, B>(f: (a: A) => B) {
  return <R, E>(self: Managed<R, E, A>): Managed<R, unknown, B> => mapEffect_(self, f)
}

/**
 * Preallocates the managed resource, resulting in a Managed that reserves
 * and acquires immediately and cannot fail. You should take care that you
 * are not interrupted between running preallocate and actually acquiring
 * the resource as you might leak otherwise.
 */
export function preallocate<R, E, A>(self: Managed<R, E, A>): T.Effect<R, E, UIO<A>> {
  return T.uninterruptibleMask(({ restore }) =>
    T.gen(function* (_) {
      const releaseMap = yield* _(RM.makeReleaseMap)
      const tp = yield* _(
        T.result(restore(T.provideSome_(self.effect, (r: R) => tuple(r, releaseMap))))
      )
      const preallocated = yield* _(
        Ex.foldM_(
          tp,
          (c) =>
            pipe(
              releaseMap,
              RM.releaseAll(Ex.fail(c), T.sequential),
              T.andThen(T.halt(c))
            ),
          ([release, a]) =>
            T.succeed(
              new Managed(
                T.accessM(([_, releaseMap]: readonly [unknown, ReleaseMap]) =>
                  T.map_(RM.add(release)(releaseMap), (_) => tuple(_, a))
                )
              )
            )
        )
      )

      return preallocated
    })
  )
}

/**
 * Preallocates the managed resource inside an outer managed, resulting in a
 * Managed that reserves and acquires immediately and cannot fail.
 */
export function preallocateManaged<R, E, A>(
  self: Managed<R, E, A>
): Managed<R, E, UIO<A>> {
  return new Managed(
    T.map_(self.effect, ([release, a]) =>
      tuple(
        release,
        new Managed(
          T.accessM(([_, releaseMap]: readonly [unknown, ReleaseMap]) =>
            T.map_(RM.add(release)(releaseMap), (_) => tuple(_, a))
          )
        )
      )
    )
  )
}

/**
 * Provides a layer to the `Managed`, which translates it to another level.
 */
export function provideLayer<R2, E2, R>(layer: L.Layer<R2, E2, R>) {
  return <E, A>(self: Managed<R, E, A>): Managed<R2, E2 | E, A> =>
    chain_(L.build(layer), (r) => provideAll_(self, r))
}

/**
 * Provides a layer to the `Managed`, which translates it to another level.
 */
export function provideLayer_<R, E, A, R2, E2>(
  self: Managed<R, E, A>,
  layer: L.Layer<R2, E2, R>
): Managed<R2, E | E2, A> {
  return chain_(L.build(layer), (r) => provideAll_(self, r))
}

/**
 * Splits the environment into two parts, providing one part using the
 * specified layer and leaving the remainder `R0`.
 */
export function provideSomeLayer<R2, E2, R>(layer: L.Layer<R2, E2, R>) {
  return <R0, E, A>(self: Managed<R & R0, E, A>): Managed<R0 & R2, E | E2, A> =>
    provideLayer(layer["+++"](L.identity<R0>()))(self)
}

/**
 * Splits the environment into two parts, providing one part using the
 * specified layer and leaving the remainder `R0`.
 */
export function provideSomeLayer_<R0, E, A, R2, E2, R>(
  self: Managed<R & R0, E, A>,
  layer: L.Layer<R2, E2, R>
): Managed<R0 & R2, E | E2, A> {
  return provideSomeLayer(layer)(self)
}

/**
 * Keeps some of the errors, and terminates the fiber with the rest, using
 * the specified function to convert the `E` into a `Throwable`.
 */
export function refineOrDieWith<E, E1>(
  pf: (e: E) => O.Option<E1>,
  f: (e: E) => unknown
) {
  return <R, A>(self: Managed<R, E, A>) => refineOrDieWith_(self, pf, f)
}

/**
 * Keeps some of the errors, and terminates the fiber with the rest, using
 * the specified function to convert the `E` into a `Throwable`.
 */
export function refineOrDieWith_<R, A, E, E1>(
  self: Managed<R, E, A>,
  pf: (e: E) => O.Option<E1>,
  f: (e: E) => unknown
) {
  return catchAll_(self, (e) =>
    pipe(
      e,
      pf,
      O.fold(
        () => die(f(e)),
        (e1) => fail(e1)
      )
    )
  )
}

/**
 * Keeps some of the errors, and terminates the fiber with the rest
 */
export function refineOrDie<E, E1>(pf: (e: E) => O.Option<E1>) {
  return refineOrDieWith(pf, identity)
}

/**
 * Keeps some of the errors, and terminates the fiber with the rest
 */
export function refineOrDie_<R, A, E, E1>(
  self: Managed<R, E, A>,
  pf: (e: E) => O.Option<E1>
) {
  return refineOrDie(pf)(self)
}

/**
 * Returns a managed that dies with the specified `unknown`. This method
 * can be used for terminating a fiber because a defect has been
 * detected in the code.
 */
export function die(e: unknown) {
  return halt(Cause.Die(e))
}

/**
 * Continue with the returned computation if the `PartialFunction` matches,
 * translating the successful match into a failure, otherwise continue with
 * our held value.
 */
export function rejectM<A, R1, E1>(pf: (a: A) => O.Option<Managed<R1, E1, E1>>) {
  return <R, E>(self: Managed<R, E, A>): Managed<R & R1, E | E1, A> =>
    rejectM_(self, pf)
}

/**
 * Continue with the returned computation if the `PartialFunction` matches,
 * translating the successful match into a failure, otherwise continue with
 * our held value.
 */
export function rejectM_<R, E, A, R1, E1>(
  self: Managed<R, E, A>,
  pf: (a: A) => O.Option<Managed<R1, E1, E1>>
) {
  return chain_(self, (a) =>
    O.fold_(
      pf(a),
      () => succeed(a),
      (_) => chain_(_, (e1) => fail(e1))
    )
  )
}

/**
 * Fail with the returned value if the `PartialFunction` matches, otherwise
 * continue with our held value.
 */
export function reject<A, E1>(pf: (a: A) => O.Option<E1>) {
  return <R, E>(self: Managed<R, E, A>) => reject_(self, pf)
}

/**
 * Fail with the returned value if the `PartialFunction` matches, otherwise
 * continue with our held value.
 */
export function reject_<R, E, A, E1>(
  self: Managed<R, E, A>,
  pf: (a: A) => O.Option<E1>
) {
  return rejectM_(self, flow(pf, O.map(fail)))
}

/**
 * Runs all the finalizers associated with this scope. This is useful to
 * conceptually "close" a scope when composing multiple managed effects.
 * Note that this is only safe if the result of this managed effect is valid
 * outside its scope.
 */
export function release<R, E, A>(self: Managed<R, E, A>) {
  return fromEffect(useNow(self))
}

/**
 * Returns an effect that retries this effect with the specified schedule when it fails, until
 * the schedule is done, then both the value produced by the schedule together with the last
 * error are passed to the specified recovery function.
 */
export function retryOrElseEither_<R, E, A, R1, O, R2, E2, A2>(
  self: Managed<R, E, A>,
  policy: Schedule<R1, E, O>,
  orElse: (e: E, o: O) => Managed<R2, E2, A2>
): Managed<R & R1 & R2 & HasClock, E2, E.Either<A2, A>> {
  return new Managed(
    T.map_(
      T.accessM(([env, releaseMap]: readonly [R & R1 & R2 & HasClock, ReleaseMap]) =>
        T.provideAll_(
          T.retryOrElseEither_(
            T.provideAll_(self.effect, tuple(env, releaseMap)),
            policy,
            (e, o) => T.provideAll_(orElse(e, o).effect, tuple(env, releaseMap))
          ),
          env
        )
      ),
      E.fold(
        ([f, a]) => tuple<[RM.Finalizer, E.Either<A2, A>]>(f, E.left(a)),
        ([f, a]) => tuple<[RM.Finalizer, E.Either<A2, A>]>(f, E.right(a))
      )
    )
  )
}

/**
 * Returns an effect that retries this effect with the specified schedule when it fails, until
 * the schedule is done, then both the value produced by the schedule together with the last
 * error are passed to the specified recovery function.
 */
export function retryOrElseEither<E, R1, O, R2, E2, A2>(
  policy: Schedule<R1, E, O>,
  orElse: (e: E, o: O) => Managed<R2, E2, A2>
) {
  return <R, A>(self: Managed<R, E, A>) => retryOrElseEither_(self, policy, orElse)
}

/**
 * Retries with the specified schedule, until it fails, and then both the
 * value produced by the schedule together with the last error are passed to
 * the recovery function.
 */
export function retryOrElse_<R, E, A, R1, O, R2, E2, A2>(
  self: Managed<R, E, A>,
  policy: Schedule<R1, E, O>,
  orElse: (e: E, o: O) => Managed<R2, E2, A2>
): Managed<R & R1 & R2 & HasClock, E2, A | A2> {
  return map_(retryOrElseEither_(self, policy, orElse), E.fold(identity, identity))
}

/**
 * Retries with the specified schedule, until it fails, and then both the
 * value produced by the schedule together with the last error are passed to
 * the recovery function.
 */
export function retryOrElse<E, R1, O, R2, E2, A2>(
  policy: Schedule<R1, E, O>,
  orElse: (e: E, o: O) => Managed<R2, E2, A2>
) {
  return <R, A>(self: Managed<R, E, A>) => retryOrElse_(self, policy, orElse)
}

/**
 * Retries with the specified retry policy.
 * Retries are done following the failure of the original `io` (up to a fixed maximum with
 * `once` or `recurs` for example), so that that `io.retry(Schedule.once)` means
 * "execute `io` and in case of failure, try again once".
 */
export function retry_<R, E, A, R1, O>(
  self: Managed<R, E, A>,
  policy: Schedule<R1, E, O>
): Managed<R & R1 & HasClock, E, A> {
  return retryOrElse_(self, policy, (e, _) => fail(e))
}

/**
 * Retries with the specified retry policy.
 * Retries are done following the failure of the original `io` (up to a fixed maximum with
 * `once` or `recurs` for example), so that that `io.retry(Schedule.once)` means
 * "execute `io` and in case of failure, try again once".
 */
export function retry<R1, E, O>(policy: Schedule<R1, E, O>) {
  return <R, A>(self: Managed<R, E, A>): Managed<R & R1 & HasClock, E, A> =>
    retry_(self, policy)
}
