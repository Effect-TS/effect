import type { Cause } from "../../Cause"
import * as T from "../../Effect"
import * as E from "../../Either"
import { flow, identity, pipe, tuple } from "../../Function"
import * as O from "../../Option"
import * as P from "../../Promise"
import {
  chain,
  chain_,
  fail,
  foldCauseM_,
  map_,
  mapM_,
  provideSome_,
  zip_
} from "../core"
import { fromEffect } from "../fromEffect"
import type { RIO, UIO } from "../managed"
import { Managed } from "../managed"
import { succeed } from "../succeed"
import { absolve } from "./absolve"
import { foldM_ } from "./foldM_"
import { gen } from "./gen"
import { halt } from "./halt"
import { releaseMap } from "./releaseMap"
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
  f: (e: Cause<E>) => Cause<E2>
) {
  return new Managed(T.mapErrorCause_(self.effect, f))
}

/**
 * Returns an effect whose full failure is mapped by the specified `f` function.
 */
export function mapErrorCause<E, E2>(f: (e: Cause<E>) => Cause<E2>) {
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
  f: (e: Cause<E>) => Managed<R2, E2, A2>
) {
  return foldCauseM_(self, f, succeed)
}

/**
 * Recovers from all errors with provided Cause.
 */
export function catchAllCause<E, R2, E2, A2>(f: (e: Cause<E>) => Managed<R2, E2, A2>) {
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
  pf: (e: Cause<E>) => O.Option<Managed<R2, E2, A2>>
): Managed<R & R2, E | E2, A | A2> {
  return catchAllCause_(self, (e) => O.getOrElse_(pf(e), () => halt<E | E2>(e)))
}

/**
 * Recovers from some or all of the error cases.
 */
export function catchSomeCause<R, E, A, R2, E2, A2>(
  pf: (e: Cause<E>) => O.Option<Managed<R2, E2, A2>>
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
