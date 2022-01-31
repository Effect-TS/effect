// ets_tracing: off

import type { Cause } from "../../Cause/index.js"
import * as C from "../../Cause/index.js"
import { RuntimeError } from "../../Cause/index.js"
import type { HasClock } from "../../Clock/index.js"
import * as A from "../../Collections/Immutable/Array/index.js"
import * as Chunk from "../../Collections/Immutable/Chunk/index.js"
import * as R from "../../Collections/Immutable/Dictionary/index.js"
import * as NA from "../../Collections/Immutable/NonEmptyArray/index.js"
import * as SS from "../../Collections/Immutable/SortedSet/index.js"
import * as Tp from "../../Collections/Immutable/Tuple/index.js"
import type { Effect } from "../../Effect/index.js"
import * as T from "../../Effect/index.js"
import { ITracer } from "../../Effect/primitives.js"
import * as E from "../../Either/index.js"
import * as Ex from "../../Exit/index.js"
import type { FiberID } from "../../Fiber/index.js"
import * as F from "../../Fiber/index.js"
import { constVoid, identity, pipe } from "../../Function/index.js"
import { NoSuchElementException } from "../../GlobalExceptions/index.js"
import type { Has, Tag } from "../../Has/index.js"
import { mergeEnvironments } from "../../Has/index.js"
import * as I from "../../Iterable/index.js"
import * as L from "../../Layer/index.js"
import type { Option } from "../../Option/index.js"
import * as O from "../../Option/index.js"
import * as P from "../../Promise/index.js"
import type { Schedule } from "../../Schedule/index.js"
import { track } from "../../Supervisor/index.js"
import type { UnionToIntersection } from "../../Utils/index.js"
import * as core from "../core.js"
import * as forEach from "../forEach.js"
import { fromEffect } from "../fromEffect.js"
import { makeExit_ } from "../makeExit.js"
import type { IO, Managed, RIO, UIO } from "../managed.js"
import { managedApply } from "../managed.js"
import * as add from "../ReleaseMap/add.js"
import type * as RM from "../ReleaseMap/index.js"
import * as makeReleaseMap from "../ReleaseMap/makeReleaseMap.js"
import * as releaseAll from "../ReleaseMap/releaseAll.js"
import { succeed } from "../succeed.js"
import { absolve } from "./absolve.js"
import { environment } from "./environment.js"
import { foldM_ } from "./foldM.js"
import { halt } from "./halt.js"
import { releaseMap } from "./releaseMap.js"
import { suspend } from "./suspend.js"

/**
 * Attempts to convert defects into a failure, throwing away all information
 * about the cause of the failure.
 *
 * @ets_data_first absorb_
 */
export function absorb<E>(f: (e: E) => unknown, __trace?: string) {
  return <R, A>(self: Managed<R, E, A>) => absorb_(self, f, __trace)
}

/**
 * Attempts to convert defects into a failure, throwing away all information
 * about the cause of the failure.
 */
export function absorb_<R, A, E>(
  self: Managed<R, E, A>,
  f: (e: E) => unknown,
  __trace?: string
) {
  return foldM_(sandbox(self), (c) => core.fail(C.squash(f)(c)), succeed, __trace)
}

/**
 * Unwraps the optional success of this effect, but can fail with None value.
 */
export function get<R, A>(self: Managed<R, never, O.Option<A>>, __trace?: string) {
  return absolve(
    core.map_(
      self,
      E.fromOption(() => O.none)
    ),
    __trace
  )
}

/**
 * Returns an effect whose failure is mapped by the specified `f` function.
 */
export function mapError_<R, A, E, E2>(
  self: Managed<R, E, A>,
  f: (e: E) => E2,
  __trace?: string
) {
  return managedApply(T.mapError_(self.effect, f, __trace))
}

/**
 * Returns an effect whose failure is mapped by the specified `f` function.
 *
 * @ets_data_first mapError_
 */
export function mapError<E, E2>(f: (e: E) => E2, __trace?: string) {
  return <R, A>(self: Managed<R, E, A>) => mapError_(self, f, __trace)
}

/**
 * Returns an effect whose full failure is mapped by the specified `f` function.
 */
export function mapErrorCause_<R, A, E, E2>(
  self: Managed<R, E, A>,
  f: (e: C.Cause<E>) => C.Cause<E2>,
  __trace?: string
) {
  return managedApply(T.mapErrorCause_(self.effect, f, __trace))
}

/**
 * Returns an effect whose full failure is mapped by the specified `f` function.
 *
 * @ets_data_first mapErrorCause_
 */
export function mapErrorCause<E, E2>(
  f: (e: C.Cause<E>) => C.Cause<E2>,
  __trace?: string
) {
  return <R, A>(self: Managed<R, E, A>) => mapErrorCause_(self, f, __trace)
}

/**
 * Returns a memoized version of the specified managed.
 */
export function memoize<R, E, A>(
  self: Managed<R, E, A>,
  __trace?: string
): UIO<Managed<R, E, A>> {
  return core.mapM_(
    releaseMap,
    (finalizers) =>
      pipe(
        T.do,
        T.bind("promise", () => P.make<E, A>()),
        T.bind("complete", ({ promise }) =>
          T.once(
            T.accessM((r: R) =>
              pipe(
                self.effect,
                T.provideAll(Tp.tuple(r, finalizers)),
                T.map((_) => _.get(1)),
                T.to(promise)
              )
            )
          )
        ),
        T.map(({ complete, promise }) =>
          pipe(complete, T.zipRight(P.await(promise)), T.toManaged)
        )
      ),
    __trace
  )
}

/**
 * Returns a new effect where the error channel has been merged into the
 * success channel to their common combined type.
 */
export function merge<R, E, A>(self: Managed<R, E, A>, __trace?: string) {
  return foldM_(self, succeed, succeed, __trace)
}

/**
 * Returns the managed resulting from mapping the success of this managed to unit.
 */
export const unit = suspend(() => fromEffect(T.unit))

/**
 * Requires the option produced by this value to be `None`.
 */
export function none<R, E, A>(
  self: Managed<R, E, O.Option<A>>,
  __trace?: string
): Managed<R, O.Option<E>, void> {
  return foldM_(
    self,
    (x) => pipe(x, O.some, core.fail),
    O.fold(
      () => unit,
      () => core.fail(O.none)
    ),
    __trace
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
  onSuccess: (a: A) => C,
  __trace?: string
) {
  return foldM_(
    self,
    (x) => pipe(x, onFail, succeed),
    (x) => pipe(x, onSuccess, succeed),
    __trace
  )
}

/**
 * Folds over the failure value or the success value to yield an effect that
 * does not fail, but succeeds with the value returned by the left or right
 * function passed to `fold`.
 *
 * @ets_data_first fold_
 */
export function fold<E, A, B, C>(
  onFail: (e: E) => B,
  onSuccess: (a: A) => C,
  __trace?: string
) {
  return <R>(self: Managed<R, E, A>) => fold_(self, onFail, onSuccess, __trace)
}

/**
 * Executes this effect, skipping the error but returning optionally the success.
 */
export function option<R, E, A>(
  self: Managed<R, E, A>,
  __trace?: string
): Managed<R, never, O.Option<A>> {
  return fold_(self, () => O.none, O.some, __trace)
}

/**
 * Converts an option on errors into an option on values.
 */
export function optional<R, E, A>(
  self: Managed<R, O.Option<E>, A>,
  __trace?: string
): Managed<R, E, O.Option<A>> {
  return foldM_(
    self,
    O.fold(() => succeed(O.none), core.fail),
    (x) => pipe(x, O.some, succeed),
    __trace
  )
}

/**
 * Keeps none of the errors, and terminates the fiber with them, using
 * the specified function to convert the `E` into a `Throwable`.
 *
 * @ets_data_first orDieWith_
 */
export function orDieWith<E>(f: (e: E) => unknown, __trace?: string) {
  return <R, A>(self: Managed<R, E, A>) => orDieWith_(self, f, __trace)
}

/**
 * Keeps none of the errors, and terminates the fiber with them, using
 * the specified function to convert the `E` into a `Throwable`.
 */
export function orDieWith_<R, E, A>(
  self: Managed<R, E, A>,
  f: (e: E) => unknown,
  __trace?: string
) {
  return managedApply(T.orDieWith_(self.effect, f, __trace))
}

/**
 * Translates effect failure into death of the fiber, making all failures unchecked and
 * not a part of the type of the effect.
 */
export function orDie<R, E, A>(self: Managed<R, E, A>, __trace?: string) {
  return orDieWith_(self, identity, __trace)
}

/**
 * Executes this effect and returns its value, if it succeeds, but
 * otherwise executes the specified effect.
 *
 * @ets_data_first orElse_
 */
export function orElse<R2, E2, A2>(that: () => Managed<R2, E2, A2>, __trace?: string) {
  return <R, E, A>(self: Managed<R, E, A>) => orElse_(self, that, __trace)
}

/**
 * Executes this effect and returns its value, if it succeeds, but
 * otherwise executes the specified effect.
 */
export function orElse_<R, E, A, R2, E2, A2>(
  self: Managed<R, E, A>,
  that: () => Managed<R2, E2, A2>,
  __trace?: string
) {
  return foldM_(self, () => that(), succeed, __trace)
}

/**
 * Executes this effect and returns its value, if it succeeds, but
 * otherwise fails with the specified error.
 *
 * @ets_data_first orElseFail_
 */
export function orElseFail<E2>(e: E2, __trace?: string) {
  return <R, E, A>(self: Managed<R, E, A>) => orElseFail_(self, e, __trace)
}

/**
 * Executes this effect and returns its value, if it succeeds, but
 * otherwise fails with the specified error.
 */
export function orElseFail_<R, E, A, E2>(
  self: Managed<R, E, A>,
  e: E2,
  __trace?: string
) {
  return orElse_(self, () => core.fail(e), __trace)
}

/**
 * Executes this effect and returns its value, if it succeeds, but
 * otherwise executes the specified effect.
 *
 * @ets_data_first orElseEither_
 */
export function orElseEither<R2, E2, A2>(
  that: () => Managed<R2, E2, A2>,
  __trace?: string
) {
  return <R, E, A>(self: Managed<R, E, A>): Managed<R & R2, E2, E.Either<A2, A>> =>
    orElseEither_(self, that, __trace)
}

/**
 * Executes this effect and returns its value, if it succeeds, but
 * otherwise executes the specified effect.
 */
export function orElseEither_<R, E, A, R2, E2, A2>(
  self: Managed<R, E, A>,
  that: () => Managed<R2, E2, A2>,
  __trace?: string
): Managed<R & R2, E2, E.Either<A2, A>> {
  return foldM_(
    self,
    () => core.map_(that(), E.left),
    (x) => pipe(x, E.right, succeed),
    __trace
  )
}

/**
 * Returns an effect that will produce the value of this effect, unless it
 * fails with the `None` value, in which case it will produce the value of
 * the specified effect.
 */
export function orElseOptional_<R, E, A, R2, E2, A2>(
  self: Managed<R, O.Option<E>, A>,
  that: () => Managed<R2, O.Option<E2>, A2>,
  __trace?: string
): Managed<R & R2, O.Option<E | E2>, A | A2> {
  return catchAll_(
    self,
    O.fold(
      () => that(),
      (e) => core.fail(O.some<E | E2>(e))
    ),
    __trace
  )
}

/**
 * Returns an effect that will produce the value of this effect, unless it
 * fails with the `None` value, in which case it will produce the value of
 * the specified effect.
 *
 * @ets_data_first orElseOptional_
 */
export function orElseOptional<R2, E2, A2>(
  that: () => Managed<R2, O.Option<E2>, A2>,
  __trace?: string
) {
  return <R, E, A>(self: Managed<R, O.Option<E>, A>) =>
    orElseOptional_(self, that, __trace)
}

/**
 * Executes this effect and returns its value, if it succeeds, but
 * otherwise succeeds with the specified value.
 */
export function orElseSucceed_<R, E, A, A2>(
  self: Managed<R, O.Option<E>, A>,
  that: () => A2,
  __trace?: string
): Managed<R, O.Option<E>, A | A2> {
  return orElse_(self, () => succeed(that()), __trace)
}

/**
 * Executes this effect and returns its value, if it succeeds, but
 * otherwise succeeds with the specified value.
 *
 * @ets_data_first orElseSucceed_
 */
export function orElseSucceed<R, E, A, A2>(that: () => A2, __trace?: string) {
  return (self: Managed<R, O.Option<E>, A>) => orElseSucceed_(self, that, __trace)
}

/**
 * Recovers from all errors.
 */
export function catchAll_<R, E, A, R2, E2, A2>(
  self: Managed<R, E, A>,
  f: (e: E) => Managed<R2, E2, A2>,
  __trace?: string
) {
  return foldM_(self, f, succeed, __trace)
}

/**
 * Recovers from all errors.
 *
 * @ets_data_first catchAll_
 */
export function catchAll<E, R2, E2, A2>(
  f: (e: E) => Managed<R2, E2, A2>,
  __trace?: string
) {
  return <R, A>(self: Managed<R, E, A>) => catchAll_(self, f, __trace)
}

/**
 * Recovers from all errors with provided Cause.
 */
export function catchAllCause_<R, E, A, R2, E2, A2>(
  self: Managed<R, E, A>,
  f: (e: C.Cause<E>) => Managed<R2, E2, A2>,
  __trace?: string
) {
  return core.foldCauseM_(self, f, succeed, __trace)
}

/**
 * Recovers from all errors with provided Cause.
 *
 * @ets_data_first catchAllCause_
 */
export function catchAllCause<E, R2, E2, A2>(
  f: (e: C.Cause<E>) => Managed<R2, E2, A2>,
  __trace?: string
) {
  return <R, A>(self: Managed<R, E, A>) => core.foldCauseM_(self, f, succeed, __trace)
}

/**
 * Recovers from some or all of the error cases.
 */
export function catchSome_<R, E, A, R2, E2, A2>(
  self: Managed<R, E, A>,
  pf: (e: E) => O.Option<Managed<R2, E2, A2>>,
  __trace?: string
): Managed<R & R2, E | E2, A | A2> {
  return catchAll_(
    self,
    (e) => O.getOrElse_(pf(e), () => core.fail<E | E2>(e)),
    __trace
  )
}

/**
 * Recovers from some or all of the error cases.
 *
 * @ets_data_first catchSome_
 */
export function catchSome<E, R2, E2, A2>(
  pf: (e: E) => O.Option<Managed<R2, E2, A2>>,
  __trace?: string
) {
  return <R, A>(self: Managed<R, E, A>) => catchSome_(self, pf, __trace)
}

/**
 * Recovers from some or all of the error cases.
 */
export function catchSomeCause_<R, E, A, R2, E2, A2>(
  self: Managed<R, E, A>,
  pf: (e: C.Cause<E>) => O.Option<Managed<R2, E2, A2>>,
  __trace?: string
): Managed<R & R2, E | E2, A | A2> {
  return catchAllCause_(
    self,
    (e) => O.getOrElse_(pf(e), () => halt<E | E2>(e)),
    __trace
  )
}

/**
 * Recovers from some or all of the error cases.
 *
 * @ets_data_first catchSomeCause_
 */
export function catchSomeCause<R, E, A, R2, E2, A2>(
  pf: (e: C.Cause<E>) => O.Option<Managed<R2, E2, A2>>,
  __trace?: string
) {
  return (self: Managed<R, E, A>) => catchSomeCause_(self, pf, __trace)
}

/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * continue with the returned value.
 */
export function continueOrFailM_<R, E, A, E1, R1, E2, B>(
  self: Managed<R, E, A>,
  e: () => E1,
  pf: (a: A) => O.Option<Managed<R1, E2, B>>,
  __trace?: string
): Managed<R & R1, E | E1 | E2, B> {
  return core.chain_(
    self,
    (a) => O.getOrElse_(pf(a), () => core.fail<E1 | E2>(e())),
    __trace
  )
}

/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * continue with the returned value.
 *
 * @ets_data_first continueOrFailM_
 */
export function continueOrFailM<A, E1, R1, E2, B>(
  e: () => E1,
  pf: (a: A) => O.Option<Managed<R1, E2, B>>,
  __trace?: string
) {
  return <R, E>(self: Managed<R, E, A>) => continueOrFailM_(self, e, pf, __trace)
}

/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * succeed with the returned value.
 */
export function continueOrFail_<R, E, A, E1, B>(
  self: Managed<R, E, A>,
  e: () => E1,
  pf: (a: A) => O.Option<B>,
  __trace?: string
): Managed<R, E | E1, B> {
  return continueOrFailM_(self, e, (x) => pipe(x, pf, O.map(succeed)), __trace)
}

/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * succeed with the returned value.
 *
 * @ets_data_first continueOrFail_
 */
export function continueOrFail<A, E1, B>(
  e: () => E1,
  pf: (a: A) => O.Option<B>,
  __trace?: string
) {
  return <R, E>(self: Managed<R, E, A>) => continueOrFail_(self, e, pf, __trace)
}

/**
 * Provides some of the environment required to run this effect,
 * leaving the remainder `R0` and combining it automatically using spread.
 */
export function provide<R>(r: R, __trace?: string) {
  return <E, A, R0>(next: Managed<R & R0, E, A>): Managed<R0, E, A> =>
    core.provideSome_(next, (r0: R0) => ({ ...r0, ...r }), __trace)
}

/**
 * Executes the second effect and then provides its output as an environment to this effect
 *
 * @ets_data_first compose_
 */
export function compose<A, E2, B>(that: Managed<A, E2, B>, __trace?: string) {
  return <R, E>(self: Managed<R, E, A>) => compose_(self, that, __trace)
}

/**
 * Executes the second effect and then provides its output as an environment to this effect
 */
export function compose_<R, E, A, E2, B>(
  self: Managed<R, E, A>,
  that: Managed<A, E2, B>,
  __trace?: string
) {
  return pipe(
    environment<R>(),
    core.chain((r1) =>
      pipe(
        core.provideAll_(self, r1),
        core.chain((r) => core.provideAll_(that, r))
      )
    )
  )
}

/**
 * Returns an effect whose failure and success have been lifted into an
 * `Either`. The resulting effect cannot fail
 */
export function either<R, E, A>(
  self: Managed<R, E, A>,
  __trace?: string
): Managed<R, never, E.Either<E, A>> {
  return fold_(self, E.left, E.right, __trace)
}

/**
 * Returns a Managed that ignores errors raised by the acquire effect and
 * runs it repeatedly until it eventually succeeds.
 */
export function eventually<R, E, A>(
  self: Managed<R, E, A>,
  __trace?: string
): Managed<R, never, A> {
  return managedApply(T.eventually(self.effect, __trace))
}

/**
 * Zips this effect with its environment
 */
export function first<R, E, A>(self: Managed<R, E, A>, __trace?: string) {
  return core.zip_(self, environment<R>(), __trace)
}

/**
 * Effectfully map the error channel
 */
export function chainError_<R, E, A, R2, E2>(
  self: Managed<R, E, A>,
  f: (e: E) => RIO<R2, E2>,
  __trace?: string
): Managed<R & R2, E2, A> {
  return flipWith_(self, core.chain(f, __trace))
}

/**
 * Effectfully map the error channel
 *
 * @ets_data_first chainError_
 */
export function chainError<E, R2, E2>(f: (e: E) => RIO<R2, E2>, __trace?: string) {
  return <R, A>(self: Managed<R, E, A>) => chainError_(self, f, __trace)
}

/**
 * Flip the error and result
 */
export function flip<R, E, A>(
  self: Managed<R, E, A>,
  __trace?: string
): Managed<R, A, E> {
  return foldM_(self, succeed, core.fail, __trace)
}

/**
 * Flip the error and result, then apply an effectful function to the effect
 */
export function flipWith_<R, E, A, R2, E1, A1>(
  self: Managed<R, E, A>,
  f: (_: Managed<R, A, E>) => Managed<R2, A1, E1>,
  __trace?: string
) {
  return flip(f(flip(self)), __trace)
}

/**
 * Flip the error and result, then apply an effectful function to the effect
 *
 * @ets_data_first flipWith_
 */
export function flipWith<R, E, A, R2, E1, A1>(
  f: (_: Managed<R, A, E>) => Managed<R2, A1, E1>,
  __trace?: string
) {
  return (self: Managed<R, E, A>) => flipWith_(self, f, __trace)
}

/**
 * Returns an effect that performs the outer effect first, followed by the
 * inner effect, yielding the value of the inner effect.
 *
 * This method can be used to "flatten" nested effects.
 */
export function flatten<R2, E2, R, E, A>(
  self: Managed<R2, E2, Managed<R, E, A>>,
  __trace?: string
) {
  return core.chain_(self, identity, __trace)
}

/**
 * Returns an effect that performs the outer effect first, followed by the
 * inner effect, yielding the value of the inner effect.
 *
 * This method can be used to "flatten" nested effects.
 */
export function flattenM<R2, E2, R, E, A>(
  self: Managed<R2, E2, T.Effect<R, E, A>>,
  __trace?: string
) {
  return core.mapM_(self, identity, __trace)
}

/**
 * A more powerful version of `fold` that allows recovering from any kind of failure except interruptions.
 */
export function foldCause_<R, E, A, B, C>(
  self: Managed<R, E, A>,
  f: (e: C.Cause<E>) => B,
  g: (a: A) => C,
  __trace?: string
) {
  return fold_(sandbox(self), f, g, __trace)
}

/**
 * A more powerful version of `fold` that allows recovering from any kind of failure except interruptions.
 *
 * @ets_data_first foldCause_
 */
export function foldCause<E, A, B, C>(
  f: (e: C.Cause<E>) => B,
  g: (a: A) => C,
  __trace?: string
) {
  return <R>(self: Managed<R, E, A>) => fold_(sandbox(self), f, g, __trace)
}

/**
 * Returns a new effect that ignores the success or failure of this effect.
 */
export function ignore<R, E, A>(
  self: Managed<R, E, A>,
  __trace?: string
): Managed<R, never, void> {
  return fold_(self, constVoid, constVoid, __trace)
}

/**
 * Returns whether this managed effect is a failure.
 */
export function isFailure<R, E, A>(self: Managed<R, E, A>, __trace?: string) {
  return fold_(
    self,
    () => true,
    () => false,
    __trace
  )
}

/**
 * Returns whether this managed effect is a success.
 */
export function isSuccess<R, E, A>(self: Managed<R, E, A>, __trace?: string) {
  return fold_(
    self,
    () => false,
    () => true,
    __trace
  )
}

/**
 * Depending on the environment execute this or the other effect
 *
 * @ets_data_first join_
 */
export function join<R1, E1, A1>(that: Managed<R1, E1, A1>, __trace?: string) {
  return <R, E, A>(self: Managed<R, E, A>): Managed<E.Either<R, R1>, E | E1, A | A1> =>
    join_(self, that, __trace)
}

/**
 * Depending on the environment execute this or the other effect
 */
export function join_<R, E, A, R1, E1, A1>(
  self: Managed<R, E, A>,
  that: Managed<R1, E1, A1>,
  __trace?: string
): Managed<E.Either<R, R1>, E | E1, A | A1> {
  return pipe(
    environment<E.Either<R, R1>>(),
    core.chain(
      E.fold(
        (r): IO<E | E1, A | A1> => core.provideAll_(self, r),
        (r1) => core.provideAll_(that, r1)
      ),
      __trace
    )
  )
}

/**
 * Depending on provided environment returns either this one or the other effect.
 *
 * @ets_data_first joinEither_
 */
export function joinEither<R2, E2, A2>(that: Managed<R2, E2, A2>, __trace?: string) {
  return <R, E, A>(
    self: Managed<R, E, A>
  ): Managed<E.Either<R, R2>, E | E2, E.Either<A, A2>> =>
    joinEither_(self, that, __trace)
}

/**
 * Depending on provided environment returns either this one or the other effect.
 */
export function joinEither_<R, E, A, R2, E2, A2>(
  self: Managed<R, E, A>,
  that: Managed<R2, E2, A2>,
  __trace?: string
): Managed<E.Either<R, R2>, E | E2, E.Either<A, A2>> {
  return pipe(
    environment<E.Either<R, R2>>(),
    core.chain(
      E.fold(
        (r0): IO<E | E2, E.Either<A, A2>> =>
          core.provideAll_(core.map_(self, E.left), r0),
        (r1) => core.provideAll_(core.map_(that, E.right), r1)
      ),
      __trace
    )
  )
}

/**
 * Join self selectively with C
 */
export function identityLeft<C>(__trace?: string) {
  return <R, E, A>(
    self: Managed<R, E, A>
  ): Managed<E.Either<R, C>, E, E.Either<A, C>> =>
    joinEither_(self, environment<C>(), __trace)
}

/**
 * Lifts a synchronous side-effect into a `Managed[R, E, A]`,
 * translating any thrown exceptions into typed failed effects using onThrow.
 */
export function tryCatch<E, A>(
  f: () => A,
  onThrow: (u: unknown) => E,
  __trace?: string
): Managed<unknown, E, A> {
  return fromEffect(T.tryCatch(f, onThrow), __trace)
}

/**
 * Returns an effect whose success is mapped by the specified side effecting
 * `f` function, translating any thrown exceptions into typed failed effects.
 *
 * @ets_data_first mapTryCatch_
 */
export function mapTryCatch<E2, A, B>(
  onThrow: (u: unknown) => E2,
  f: (a: A) => B,
  __trace?: string
) {
  return <R, E>(self: Managed<R, E, A>): Managed<R, E | E2, B> =>
    mapTryCatch_(self, onThrow, f, __trace)
}

/**
 * Returns an effect whose success is mapped by the specified side effecting
 * `f` function, translating any thrown exceptions into typed failed effects.
 */
export function mapTryCatch_<R, E, E2, A, B>(
  self: Managed<R, E, A>,
  onThrow: (u: unknown) => E2,
  f: (a: A) => B,
  __trace?: string
): Managed<R, E | E2, B> {
  return foldM_(
    self,
    (e) => core.fail(e),
    (a) => tryCatch(() => f(a), onThrow),
    __trace
  )
}

/**
 * Returns an effect whose success is mapped by the specified side effecting
 * `f` function, translating any thrown exceptions into typed failed effects.
 */
export function mapEffect_<R, E, A, B>(
  self: Managed<R, E, A>,
  f: (a: A) => B,
  __trace?: string
): Managed<R, unknown, B> {
  return mapTryCatch_(self, identity, f, __trace)
}

/**
 * Returns an effect whose success is mapped by the specified side effecting
 * `f` function, translating any thrown exceptions into typed failed effects.
 *
 * @ets_data_first mapEffect_
 */
export function mapEffect<A, B>(f: (a: A) => B, __trace?: string) {
  return <R, E>(self: Managed<R, E, A>): Managed<R, unknown, B> =>
    mapEffect_(self, f, __trace)
}

/**
 * Preallocates the managed resource, resulting in a Managed that reserves
 * and acquires immediately and cannot fail. You should take care that you
 * are not interrupted between running preallocate and actually acquiring
 * the resource as you might leak otherwise.
 */
export function preallocate<R, E, A>(
  self: Managed<R, E, A>,
  __trace?: string
): T.Effect<R, E, UIO<A>> {
  return T.uninterruptibleMask(({ restore }) =>
    pipe(
      T.do,
      T.bind("releaseMap", () => makeReleaseMap.makeReleaseMap),
      T.bind("tp", ({ releaseMap }) =>
        T.result(
          restore(
            T.provideSome_(self.effect, (r: R) => Tp.tuple(r, releaseMap)),
            __trace
          )
        )
      ),
      T.bind("preallocated", ({ releaseMap, tp }) =>
        Ex.foldM_(
          tp,
          (c) =>
            pipe(
              releaseMap,
              releaseAll.releaseAll(Ex.fail(c), T.sequential),
              T.zipRight(T.halt(c))
            ),
          ({ tuple: [release, a] }) =>
            T.succeed(
              managedApply(
                T.accessM(
                  ({ tuple: [_, releaseMap] }: Tp.Tuple<[unknown, RM.ReleaseMap]>) =>
                    T.map_(add.add(release)(releaseMap), (_) => Tp.tuple(_, a))
                )
              )
            )
        )
      ),
      T.map(({ preallocated }) => preallocated)
    )
  )
}

/**
 * Preallocates the managed resource inside an outer managed, resulting in a
 * Managed that reserves and acquires immediately and cannot fail.
 */
export function preallocateManaged<R, E, A>(
  self: Managed<R, E, A>,
  __trace?: string
): Managed<R, E, UIO<A>> {
  return managedApply(
    T.map_(
      self.effect,
      ({ tuple: [release, a] }) =>
        Tp.tuple(
          release,
          managedApply(
            T.accessM(
              ({ tuple: [_, releaseMap] }: Tp.Tuple<[unknown, RM.ReleaseMap]>) =>
                T.map_(add.add(release)(releaseMap), (_) => Tp.tuple(_, a))
            )
          )
        ),
      __trace
    )
  )
}

/**
 * Provides a layer to the `Managed`, which translates it to another level.
 *
 * @ets_data_first provideLayer_
 */
export function provideLayer<R2, E2, R>(layer: L.Layer<R2, E2, R>, __trace?: string) {
  return <E, A>(self: Managed<R, E, A>): Managed<R2, E2 | E, A> =>
    provideLayer_(self, layer, __trace)
}

/**
 * Provides a layer to the `Managed`, which translates it to another level.
 */
export function provideLayer_<R, E, A, R2, E2>(
  self: Managed<R, E, A>,
  layer: L.Layer<R2, E2, R>,
  __trace?: string
): Managed<R2, E | E2, A> {
  return core.chain_(L.build(layer), (r) => core.provideAll_(self, r), __trace)
}

/**
 * Splits the environment into two parts, providing one part using the
 * specified layer and leaving the remainder `R0`.
 */
export function provideSomeLayer<R2, E2, R>(
  layer: L.Layer<R2, E2, R>,
  __trace?: string
) {
  return <R0, E, A>(self: Managed<R & R0, E, A>): Managed<R0 & R2, E | E2, A> =>
    provideLayer_(self, layer["+++"](L.identity<R0>()), __trace)
}

/**
 * Keeps some of the errors, and terminates the fiber with the rest, using
 * the specified function to convert the `E` into a `Throwable`.
 *
 * @ets_data_first refineOrDieWith_
 */
export function refineOrDieWith<E, E1>(
  pf: (e: E) => O.Option<E1>,
  f: (e: E) => unknown,
  __trace?: string
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
  f: (e: E) => unknown,
  __trace?: string
) {
  return catchAll_(self, (e) =>
    pipe(
      e,
      pf,
      O.fold(
        () => die(f(e), __trace),
        (e1) => core.fail(e1, __trace)
      )
    )
  )
}

/**
 * Keeps some of the errors, and terminates the fiber with the rest
 *
 * @ets_data_first refineOrDie_
 */
export function refineOrDie<E, E1>(pf: (e: E) => O.Option<E1>, __trace?: string) {
  return <R, A>(self: Managed<R, E, A>) => refineOrDie_(self, pf, __trace)
}

/**
 * Keeps some of the errors, and terminates the fiber with the rest
 */
export function refineOrDie_<R, A, E, E1>(
  self: Managed<R, E, A>,
  pf: (e: E) => O.Option<E1>,
  __trace?: string
) {
  return refineOrDieWith_(self, pf, identity, __trace)
}

/**
 * Returns a managed that dies with the specified `unknown`. This method
 * can be used for terminating a fiber because a defect has been
 * detected in the code.
 */
export function die(e: unknown, __trace?: string) {
  return fromEffect(T.die(e, __trace))
}

/**
 * Returns a managed that dies with the specified `unknown`. This method
 * can be used for terminating a fiber because a defect has been
 * detected in the code.
 */
export function dieWith(e: () => unknown, __trace?: string) {
  return fromEffect(T.dieWith(e, __trace))
}

/**
 * Returns an effect that dies with a [[java.lang.RuntimeException]] having the
 * specified text message. This method can be used for terminating a fiber
 * because a defect has been detected in the code.
 */
export function dieMessage(message: string, __trace?: string) {
  return die(new RuntimeError(message), __trace)
}

/**
 * Continue with the returned computation if the `PartialFunction` matches,
 * translating the successful match into a failure, otherwise continue with
 * our held value.
 *
 * @ets_data_first rejectM_
 */
export function rejectM<A, R1, E1>(
  pf: (a: A) => O.Option<Managed<R1, E1, E1>>,
  __trace?: string
) {
  return <R, E>(self: Managed<R, E, A>): Managed<R & R1, E | E1, A> =>
    rejectM_(self, pf, __trace)
}

/**
 * Continue with the returned computation if the `PartialFunction` matches,
 * translating the successful match into a failure, otherwise continue with
 * our held value.
 */
export function rejectM_<R, E, A, R1, E1>(
  self: Managed<R, E, A>,
  pf: (a: A) => O.Option<Managed<R1, E1, E1>>,
  __trace?: string
) {
  return core.chain_(self, (a) =>
    O.fold_(
      pf(a),
      () => succeed(a, __trace),
      (_) => core.chain_(_, (e1) => core.fail(e1), __trace)
    )
  )
}

/**
 * Fail with the returned value if the `PartialFunction` matches, otherwise
 * continue with our held value.
 *
 * @ets_data_first reject_
 */
export function reject<A, E1>(pf: (a: A) => O.Option<E1>, __trace?: string) {
  return <R, E>(self: Managed<R, E, A>) => reject_(self, pf, __trace)
}

/**
 * Fail with the returned value if the `PartialFunction` matches, otherwise
 * continue with our held value.
 */
export function reject_<R, E, A, E1>(
  self: Managed<R, E, A>,
  pf: (a: A) => O.Option<E1>,
  __trace?: string
) {
  return rejectM_(self, (x) => pipe(x, pf, O.map(core.fail)), __trace)
}

/**
 * Runs all the finalizers associated with this scope. This is useful to
 * conceptually "close" a scope when composing multiple managed effects.
 * Note that this is only safe if the result of this managed effect is valid
 * outside its scope.
 */
export function release<R, E, A>(self: Managed<R, E, A>, __trace?: string) {
  return fromEffect(core.useNow(self), __trace)
}

/**
 * Returns an effect that retries this effect with the specified schedule when it fails, until
 * the schedule is done, then both the value produced by the schedule together with the last
 * error are passed to the specified recovery function.
 */
export function retryOrElseEither_<R, E, A, R1, O, R2, E2, A2>(
  self: Managed<R, E, A>,
  policy: Schedule<R1, E, O>,
  orElse: (e: E, o: O) => Managed<R2, E2, A2>,
  __trace?: string
): Managed<R & R1 & R2 & HasClock, E2, E.Either<A2, A>> {
  return managedApply(
    T.map_(
      T.accessM(
        ({
          tuple: [env, releaseMap]
        }: Tp.Tuple<[R & R1 & R2 & HasClock, RM.ReleaseMap]>) =>
          T.provideAll_(
            T.retryOrElseEither_(
              T.provideAll_(self.effect, Tp.tuple(env, releaseMap)),
              policy,
              (e, o) => T.provideAll_(orElse(e, o).effect, Tp.tuple(env, releaseMap)),
              __trace
            ),
            env
          )
      ),
      E.fold(
        ({ tuple: [f, a] }) => Tp.tuple<[RM.Finalizer, E.Either<A2, A>]>(f, E.left(a)),
        ({ tuple: [f, a] }) => Tp.tuple<[RM.Finalizer, E.Either<A2, A>]>(f, E.right(a))
      )
    )
  )
}

/**
 * Returns an effect that retries this effect with the specified schedule when it fails, until
 * the schedule is done, then both the value produced by the schedule together with the last
 * error are passed to the specified recovery function.
 *
 * @ets_data_first retryOrElseEither_
 */
export function retryOrElseEither<E, R1, O, R2, E2, A2>(
  policy: Schedule<R1, E, O>,
  orElse: (e: E, o: O) => Managed<R2, E2, A2>,
  __trace?: string
) {
  return <R, A>(self: Managed<R, E, A>) =>
    retryOrElseEither_(self, policy, orElse, __trace)
}

/**
 * Retries with the specified schedule, until it fails, and then both the
 * value produced by the schedule together with the last error are passed to
 * the recovery function.
 */
export function retryOrElse_<R, E, A, R1, O, R2, E2, A2>(
  self: Managed<R, E, A>,
  policy: Schedule<R1, E, O>,
  orElse: (e: E, o: O) => Managed<R2, E2, A2>,
  __trace?: string
): Managed<R & R1 & R2 & HasClock, E2, A | A2> {
  return core.map_(
    retryOrElseEither_(self, policy, orElse, __trace),
    E.fold(identity, identity)
  )
}

/**
 * Retries with the specified schedule, until it fails, and then both the
 * value produced by the schedule together with the last error are passed to
 * the recovery function.
 *
 * @ets_data_first retryOrElse_
 */
export function retryOrElse<E, R1, O, R2, E2, A2>(
  policy: Schedule<R1, E, O>,
  orElse: (e: E, o: O) => Managed<R2, E2, A2>,
  __trace?: string
) {
  return <R, A>(self: Managed<R, E, A>) => retryOrElse_(self, policy, orElse, __trace)
}

/**
 * Retries with the specified retry policy.
 * Retries are done following the failure of the original `io` (up to a fixed maximum with
 * `once` or `recurs` for example), so that that `io.retry(Schedule.once)` means
 * "execute `io` and in case of failure, try again once".
 */
export function retry_<R, E, A, R1, O>(
  self: Managed<R, E, A>,
  policy: Schedule<R1, E, O>,
  __trace?: string
): Managed<R & R1 & HasClock, E, A> {
  return retryOrElse_(self, policy, (e, _) => core.fail(e), __trace)
}

/**
 * Retries with the specified retry policy.
 * Retries are done following the failure of the original `io` (up to a fixed maximum with
 * `once` or `recurs` for example), so that that `io.retry(Schedule.once)` means
 * "execute `io` and in case of failure, try again once".
 *
 * @ets_data_first retry_
 */
export function retry<R1, E, O>(policy: Schedule<R1, E, O>, __trace?: string) {
  return <R, A>(self: Managed<R, E, A>): Managed<R & R1 & HasClock, E, A> =>
    retry_(self, policy, __trace)
}

/**
 * Returns an effect that semantically runs the effect on a fiber,
 * producing an `Exit` for the completion value of the fiber.
 */
export function result<R, E, A>(
  self: Managed<R, E, A>,
  __trace?: string
): Managed<R, never, Ex.Exit<E, A>> {
  return core.foldCauseM_(
    self,
    (x) => pipe(x, Ex.halt, succeed),
    (x) => pipe(x, Ex.succeed, succeed),
    __trace
  )
}

/**
 * Exposes the full cause of failure of this effect.
 */
export function sandbox<R, E, A>(self: Managed<R, E, A>, __trace?: string) {
  return managedApply(T.sandbox(self.effect, __trace))
}

/**
 * The inverse operation to `sandbox`. Submerges the full cause of failure.
 */
export function unsandbox<R, E, A>(self: Managed<R, C.Cause<E>, A>) {
  return mapErrorCause_(self, C.flatten)
}

/**
 * Companion helper to `sandbox`. Allows recovery, and partial recovery, from
 * errors and defects alike.
 *
 * @ets_data_first sandboxWith_
 */
export function sandboxWith<R, E, A, R2, E2, B>(
  f: (_: Managed<R, C.Cause<E>, A>) => Managed<R2, C.Cause<E2>, B>
) {
  return (self: Managed<R, E, A>) => sandboxWith_(self, f)
}

/**
 * Companion helper to `sandbox`. Allows recovery, and partial recovery, from
 * errors and defects alike.
 */
export function sandboxWith_<R, E, A, R2, E2, B>(
  self: Managed<R, E, A>,
  f: (_: Managed<R, C.Cause<E>, A>) => Managed<R2, C.Cause<E2>, B>
) {
  return unsandbox(f(sandbox(self)))
}

/**
 * Zips this effect with its environment
 */
export function second<R, E, A>(self: Managed<R, E, A>) {
  return core.zip_(environment<R>(), self)
}

/**
 * Converts an option on values into an option on errors.
 */
export function some<R, E, A>(
  self: Managed<R, E, O.Option<A>>
): Managed<R, O.Option<E>, A> {
  return foldM_(
    self,
    (x) => pipe(x, O.some, core.fail),
    O.fold(() => core.fail(O.none), succeed)
  )
}

/**
 * Extracts the optional value, or returns the given 'orElse'.
 *
 * @ets_data_first someOrElse_
 */
export function someOrElse<B>(orElse: () => B) {
  return <R, E, A>(self: Managed<R, E, O.Option<A>>): Managed<R, E, A | B> =>
    someOrElse_(self, orElse)
}

/**
 * Extracts the optional value, or returns the given 'orElse'.
 */
export function someOrElse_<R, E, A, B>(
  self: Managed<R, E, O.Option<A>>,
  orElse: () => B
) {
  return core.map_(self, O.getOrElse(orElse))
}

/**
 * Extracts the optional value, or executes the effect 'orElse'.
 *
 * @ets_data_first someOrElseM_
 */
export function someOrElseM<R1, E1, B>(orElse: Managed<R1, E1, B>) {
  return <R, E, A>(self: Managed<R, E, O.Option<A>>) => someOrElseM_(self, orElse)
}

/**
 * Extracts the optional value, or executes the effect 'orElse'.
 */
export function someOrElseM_<R, E, A, R1, E1, B>(
  self: Managed<R, E, O.Option<A>>,
  orElse: Managed<R1, E1, B>
) {
  return core.chain_(
    self,
    O.fold((): Managed<R1, E1, A | B> => orElse, succeed)
  )
}

/**
 * Extracts the optional value, or fails with the given error 'e'.
 *
 * @ets_data_first someOrFail_
 */
export function someOrFail<E1>(e: () => E1) {
  return <R, E, A>(self: Managed<R, E, O.Option<A>>): Managed<R, E1 | E, A> =>
    someOrFail_(self, e)
}

/**
 * Extracts the optional value, or fails with the given error 'e'.
 */
export function someOrFail_<R, E, A, E1>(
  self: Managed<R, E, O.Option<A>>,
  e: () => E1
) {
  return core.chain_(
    self,
    O.fold(() => core.fail(e()), succeed)
  )
}

/**
 * Extracts the optional value, or fails with a `NoSuchElementException`
 */
export function someOrFailException<R, E, A>(
  self: Managed<R, E, O.Option<A>>
): Managed<R, E | NoSuchElementException, A> {
  return someOrFail_(self, () => new NoSuchElementException())
}

/**
 * Returns an effect that effectfully peeks at the failure or success of the acquired resource.
 */
export function tapBoth_<R, E, A, R1, E1, R2, E2, X, Y>(
  self: Managed<R, E, A>,
  f: (e: E) => Managed<R1, E1, X>,
  g: (a: A) => Managed<R2, E2, Y>
): Managed<R & R1 & R2, E | E1 | E2, A> {
  return foldM_(
    self,
    (e) => core.chain_(f(e), () => core.fail(e)),
    (a) => core.map_(g(a), () => a)
  )
}

/**
 * Returns an effect that effectfully peeks at the failure or success of the acquired resource.
 *
 * @ets_data_first tapBoth_
 */
export function tapBoth<E, A, R1, E1, R2, E2, X, Y>(
  f: (e: E) => Managed<R1, E1, X>,
  g: (a: A) => Managed<R2, E2, Y>
) {
  return <R>(self: Managed<R, E, A>) => tapBoth_(self, f, g)
}

/**
 * Returns an effect that effectually peeks at the cause of the failure of
 * the acquired resource.
 */
export function tapCause_<R, E, A, R1, E1, X>(
  self: Managed<R, E, A>,
  f: (c: Cause<E>) => Managed<R1, E1, X>
): Managed<R & R1, E | E1, A> {
  return catchAllCause_(self, (c) => core.chain_(f(c), () => halt(c)))
}

/**
 * Returns an effect that effectually peeks at the cause of the failure of
 * the acquired resource.
 *
 * @ets_data_first tapCause_
 */
export function tapCause<E, R1, E1, X>(f: (c: Cause<E>) => Managed<R1, E1, X>) {
  return <R, A>(self: Managed<R, E, A>): Managed<R & R1, E | E1, A> =>
    tapCause_(self, f)
}

/**
 * Returns an effect that effectfully peeks at the failure of the acquired resource.
 */
export function tapError_<R, E, A, R1, E1, X>(
  self: Managed<R, E, A>,
  f: (e: E) => Managed<R1, E1, X>
): Managed<R & R1, E | E1, A> {
  return tapBoth_(self, f, succeed)
}

/**
 * Returns an effect that effectfully peeks at the failure of the acquired resource.
 *
 * @ets_data_first tapError_
 */
export function tapError<E, R1, E1, X>(f: (e: E) => Managed<R1, E1, X>) {
  return <R, A>(self: Managed<R, E, A>) => tapError_(self, f)
}

/**
 * Like `tap`, but uses a function that returns a Effect value rather than a
 * Managed value.
 *
 * @ets_data_first tapM_
 */
export function tapM<A, R1, E1, X>(f: (a: A) => Effect<R1, E1, X>) {
  return <R, E>(self: Managed<R, E, A>): Managed<R & R1, E | E1, A> => tapM_(self, f)
}

/**
 * Like `tap`, but uses a function that returns a Effect value rather than a
 * Managed value.
 */
export function tapM_<R, E, A, R1, E1, X>(
  self: Managed<R, E, A>,
  f: (a: A) => Effect<R1, E1, X>
) {
  return core.mapM_(self, (a) => T.as_(f(a), a))
}

/**
 * Returns a new effect that executes this one and times the acquisition of the resource.
 */
export function timed<R, E, A>(
  self: Managed<R, E, A>
): Managed<R & HasClock, E, Tp.Tuple<[number, A]>> {
  return managedApply(
    T.chain_(
      T.environment<Tp.Tuple<[R, RM.ReleaseMap]>>(),
      ({ tuple: [r, releaseMap] }) =>
        T.provideSome_(
          T.map_(
            T.timed(T.provideAll_(self.effect, Tp.tuple(r, releaseMap))),
            ({
              tuple: [
                duration,
                {
                  tuple: [fin, a]
                }
              ]
            }) => Tp.tuple(fin, Tp.tuple(duration, a))
          ),
          (r: Tp.Tuple<[R & HasClock, RM.ReleaseMap]>) => r.get(0)
        )
    )
  )
}

/**
 * Returns an effect that will timeout this resource, returning `None` if the
 * timeout elapses before the resource was reserved and acquired.
 * If the reservation completes successfully (even after the timeout) the release action will be run on a new fiber.
 * `Some` will be returned if acquisition and reservation complete in time
 */
export function timeout_<R, E, A>(self: Managed<R, E, A>, d: number) {
  return managedApply(
    T.uninterruptibleMask(({ restore }) =>
      T.gen(function* (_) {
        const env = yield* _(T.environment<Tp.Tuple<[R & HasClock, RM.ReleaseMap]>>())
        const {
          tuple: [r, outerReleaseMap]
        } = env
        const innerReleaseMap = yield* _(makeReleaseMap.makeReleaseMap)
        const earlyRelease = yield* _(
          add.add((exit) => releaseAll.releaseAll(exit, T.sequential)(innerReleaseMap))(
            outerReleaseMap
          )
        )
        const raceResult: E.Either<
          F.Fiber<E, Tp.Tuple<[RM.Finalizer, A]>>,
          A
        > = yield* _(
          restore(
            T.provideAll_(
              T.raceWith_(
                T.provideAll_(self.effect, Tp.tuple(r, innerReleaseMap)),
                T.as_(T.sleep(d), O.none),
                (result, sleeper) =>
                  T.zipRight_(
                    F.interrupt(sleeper),
                    T.done(Ex.map_(result, (tp) => E.right(tp.get(1))))
                  ),
                (_, resultFiber) => T.succeed(E.left(resultFiber))
              ),
              r
            )
          )
        )
        const a = yield* _(
          E.fold_(
            raceResult,
            (f) =>
              T.as_(
                T.chain_(T.fiberId, (id) =>
                  T.forkDaemon(
                    T.ensuring_(
                      F.interrupt(f),
                      releaseAll.releaseAll(
                        Ex.interrupt(id),
                        T.sequential
                      )(innerReleaseMap)
                    )
                  )
                ),
                O.none
              ),
            (v) => T.succeed(O.some(v))
          )
        )

        return Tp.tuple(earlyRelease, a)
      })
    )
  )
}

/**
 * Returns an effect that will timeout this resource, returning `None` if the
 * timeout elapses before the resource was reserved and acquired.
 * If the reservation completes successfully (even after the timeout) the release action will be run on a new fiber.
 * `Some` will be returned if acquisition and reservation complete in time
 *
 * @ets_data_first timeout_
 */
export function timeout(d: number) {
  return <R, E, A>(self: Managed<R, E, A>): Managed<R & HasClock, E, O.Option<A>> =>
    timeout_(self, d)
}

/**
 * Constructs a layer from this managed resource.
 *
 * @ets_data_first toLayer_
 */
export function toLayer<A>(
  tag: Tag<A>
): <R, E>(self: Managed<R, E, A>) => L.Layer<R, E, Has<A>> {
  return L.fromManaged(tag)
}

/**
 * Constructs a layer from this managed resource.
 */
export function toLayer_<R, E, A>(
  self: Managed<R, E, A>,
  tag: Tag<A>
): L.Layer<R, E, Has<A>> {
  return toLayer(tag)(self)
}

/**
 * Constructs a layer from this managed resource, which must return one or
 * more services.
 */
export function toLayerMany<Tags extends Tag<any>[]>(...tags: Tags) {
  return <R, E>(
    self: Managed<
      R,
      E,
      UnionToIntersection<
        {
          [k in keyof Tags & number]: [Tags[k]] extends [Tag<infer A>] ? Has<A> : never
        }[number]
      >
    >
  ) =>
    L.fromRawManaged(
      core.map_(
        self,
        (
          r
        ): UnionToIntersection<
          {
            [k in keyof Tags & number]: [Tags[k]] extends [Tag<infer A>]
              ? Has<A>
              : never
          }[number]
        > => {
          const env: any = {}
          for (const tag of tags) {
            env[tag.key] = tag.read(r as any)
          }
          return env
        }
      )
    )
}

/**
 * Return unit while running the effect
 */
export function asUnit<R, E, A>(self: Managed<R, E, A>): Managed<R, E, void> {
  return as_(self, undefined)
}

/**
 * The moral equivalent of `if (!p) exp` when `p` has side-effects
 *
 * @ets_data_first unlessM_
 */
export function unlessM<R1, E1>(b: Managed<R1, E1, boolean>) {
  return <R, E, A>(self: Managed<R, E, A>): Managed<R1 & R, E1 | E, void> =>
    unlessM_(self, b)
}

/**
 * The moral equivalent of `if (!p) exp` when `p` has side-effects
 */
export function unlessM_<R, E, A, R1, E1>(
  self: Managed<R, E, A>,
  b: Managed<R1, E1, boolean>
): Managed<R1 & R, E1 | E, void> {
  return core.chain_(b, (b) => (b ? unit : asUnit(self)))
}

/**
 * The moral equivalent of `if (!p) exp`
 *
 * @ets_data_first unless_
 */
export function unless(b: () => boolean) {
  return unlessM(core.succeedWith(b))
}

/**
 * The moral equivalent of `if (!p) exp`
 */
export function unless_<R, E, A>(self: Managed<R, E, A>, b: () => boolean) {
  return unless(b)(self)
}

/**
 * Maps this effect to the specified constant while preserving the
 * effects of this effect.
 */
export function as_<R, E, A, B>(self: Managed<R, E, A>, b: B) {
  return core.map_(self, () => b)
}

/**
 * Maps this effect to the specified constant while preserving the
 * effects of this effect.
 *
 * @ets_data_first as_
 */
export function as<B>(b: B) {
  return <R, E, A>(self: Managed<R, E, A>) => as_(self, b)
}

/**
 * Maps the success value of this effect to an optional value.
 */
export function asSome<R, E, A>(self: Managed<R, E, A>) {
  return core.map_(self, O.some)
}

/**
 * Maps the error value of this effect to an optional value.
 */
export function asSomeError<R, E, A>(self: Managed<R, E, A>) {
  return mapError_(self, O.some)
}

/**
 * Maps the success value of this effect to a service.
 *
 * @ets_data_first asService_
 */
export function asService<A>(tag: Tag<A>) {
  return <R, E>(self: Managed<R, E, A>) => asService_(self, tag)
}

/**
 * Maps the success value of this effect to a service.
 */
export function asService_<R, E, A>(self: Managed<R, E, A>, tag: Tag<A>) {
  return core.map_(self, tag.has)
}

/**
 * Executes the this effect and then provides its output as an environment to the second effect
 */
export function andThen_<R, E, A, E1, B>(
  self: Managed<R, E, A>,
  that: Managed<A, E1, B>
) {
  return core.chain_(self, (a) => core.provideAll_(that, a))
}

/**
 * Executes the this effect and then provides its output as an environment to the second effect
 *
 * @ets_data_first andThen_
 */
export function andThen<A, E1, B>(that: Managed<A, E1, B>) {
  return <R, E>(self: Managed<R, E, A>) => andThen_(self, that)
}

/**
 * Returns an effect whose failure and success channels have been mapped by
 * the specified pair of functions, `f` and `g`.
 *
 * @ets_data_first bimap_
 */
export function bimap<E, A, E1, A1>(f: (e: E) => E1, g: (a: A) => A1) {
  return <R>(self: Managed<R, E, A>) => bimap_(self, f, g)
}

/**
 * Returns an effect whose failure and success channels have been mapped by
 * the specified pair of functions, `f` and `g`.
 */
export function bimap_<R, E, A, E1, A1>(
  self: Managed<R, E, A>,
  f: (e: E) => E1,
  g: (a: A) => A1
) {
  return core.map_(mapError_(self, f), g)
}

/**
 * Joins with environment passing self selectively on the right side
 */
export function right<C>() {
  return <R, E, A>(self: Managed<R, E, A>) => joinEither_(environment<C>(), self)
}

/**
 * Joins with environment passing self selectively on the left side
 */
export function left<C>() {
  return <R, E, A>(self: Managed<R, E, A>) => joinEither_(self, environment<C>())
}

/**
 * Effectfully accesses the environment of the effect.
 */
export function access<R0, A>(f: (_: R0) => A, __trace?: string): RIO<R0, A> {
  return fromEffect(T.access(f), __trace)
}

/**
 * Effectfully accesses the environment of the effect.
 */
export function accessManaged<R0, R, E, A>(
  f: (_: R0) => Managed<R, E, A>
): Managed<R & R0, E, A> {
  return core.chain_(environment<R0>(), f)
}

/**
 * Effectfully accesses the environment of the effect.
 */
export function accessM<R0, R, E, A>(
  f: (_: R0) => Effect<R, E, A>
): Managed<R & R0, E, A> {
  return core.mapM_(environment<R0>(), f)
}

/**
 * Access a record of services with the required Service Entries
 */
export function accessServicesM<SS extends Record<string, Tag<any>>>(s: SS) {
  return <R = unknown, E = never, B = unknown>(
    f: (a: {
      [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown
    }) => Managed<R, E, B>
  ) =>
    accessManaged(
      (
        r: UnionToIntersection<
          {
            [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : unknown
          }[keyof SS]
        >
      ) => f(R.map_(s, (v) => r[v.key]) as any)
    )
}

/**
 * Access a tuple of services with the required Service Entries monadically
 */
export function accessServicesTM<SS extends Tag<any>[]>(...s: SS) {
  return <R = unknown, E = never, B = unknown>(
    f: (
      ...a: {
        [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown
      }
    ) => Managed<R, E, B>
  ) =>
    accessManaged(
      (
        r: UnionToIntersection<
          {
            [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : never
          }[keyof SS & number]
        >
      ) => f(...(A.map_(s, (v) => r[v.key]) as any))
    )
}

/**
 * Access a tuple of services with the required Service Entries
 */
export function accessServicesT<SS extends Tag<any>[]>(...s: SS) {
  return <B = unknown>(
    f: (
      ...a: {
        [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown
      }
    ) => B
  ) =>
    access(
      (
        r: UnionToIntersection<
          {
            [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : never
          }[keyof SS & number]
        >
      ) => f(...(A.map_(s, (v) => r[v.key]) as any))
    )
}

/**
 * Access a record of services with the required Service Entries
 */
export function accessServices<SS extends Record<string, Tag<any>>>(s: SS) {
  return <B>(
    f: (a: {
      [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown
    }) => B
  ) =>
    access(
      (
        r: UnionToIntersection<
          {
            [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : unknown
          }[keyof SS]
        >
      ) => f(R.map_(s, (v) => r[v.key]) as any)
    )
}

/**
 * Access a service with the required Service Entry
 */
export function accessServiceM<T>(s: Tag<T>) {
  return <R, E, B>(f: (a: T) => Managed<R, E, B>) =>
    accessManaged((r: Has<T>) => f(r[s.key as any]))
}

/**
 * Access a service with the required Service Entry
 */
export function accessService<T>(s: Tag<T>) {
  return <B>(f: (a: T) => B) => accessServiceM(s)((a) => succeed(f(a)))
}

/**
 * Accesses the specified service in the environment of the effect.
 */
export function service<T>(s: Tag<T>) {
  return accessServiceM(s)((a) => succeed(a))
}

/**
 * Accesses the specified services in the environment of the effect.
 */
export function services<Ts extends readonly Tag<any>[]>(...s: Ts) {
  return access(
    (
      r: UnionToIntersection<
        { [k in keyof Ts]: [Ts[k]] extends [Tag<infer T>] ? Has<T> : never }[number]
      >
    ): Readonly<{ [k in keyof Ts]: [Ts[k]] extends [Tag<infer T>] ? T : never }> =>
      s.map((tag) => tag.read(r as any)) as any
  )
}

/**
 * Provides the service with the required Service Entry
 */
export function provideServiceM<T>(_: Tag<T>) {
  return <R, E>(f: Managed<R, E, T>) =>
    <R1, E1, A1>(ma: Managed<R1 & Has<T>, E1, A1>): Managed<R & R1, E | E1, A1> =>
      accessManaged((r: R & R1) =>
        core.chain_(f, (t) => core.provideAll_(ma, mergeEnvironments(_, r, t)))
      )
}

/**
 * Provides the service with the required Service Entry
 */
export function provideService<T>(_: Tag<T>) {
  return (f: T) =>
    <R1, E1, A1>(ma: Managed<R1 & Has<T>, E1, A1>): Managed<R1, E1, A1> =>
      provideServiceM(_)(succeed(f))(ma)
}

/**
 * Replaces the service with the required Service Entry
 *
 * @ets_data_first replaceServiceM_
 */
export function replaceServiceM<R, E, T>(_: Tag<T>, f: (_: T) => Managed<R, E, T>) {
  return <R1, E1, A1>(
    ma: Managed<R1 & Has<T>, E1, A1>
  ): Managed<R & R1 & Has<T>, E | E1, A1> =>
    accessServiceM(_)((t) => provideServiceM(_)(f(t))(ma))
}

/**
 * Replaces the service with the required Service Entry
 */
export function replaceServiceM_<R, E, T, R1, E1, A1>(
  ma: Managed<R1 & Has<T>, E1, A1>,
  _: Tag<T>,
  f: (_: T) => Managed<R, E, T>
): Managed<R & R1 & Has<T>, E | E1, A1> {
  return accessServiceM(_)((t) => provideServiceM(_)(f(t))(ma))
}

/**
 * Replaces the service with the required Service Entry
 *
 * @ets_data_first replaceService_
 */
export function replaceService<T>(_: Tag<T>, f: (_: T) => T) {
  return <R1, E1, A1>(ma: Managed<R1 & Has<T>, E1, A1>): Managed<R1 & Has<T>, E1, A1> =>
    accessServiceM(_)((t) => provideServiceM(_)(succeed(f(t)))(ma))
}

/**
 * Replaces the service with the required Service Entry
 */
export function replaceService_<R1, E1, A1, T>(
  ma: Managed<R1 & Has<T>, E1, A1>,
  _: Tag<T>,
  f: (_: T) => T
): Managed<R1 & Has<T>, E1, A1> {
  return accessServiceM(_)((t) => provideServiceM(_)(succeed(f(t)))(ma))
}

/**
 * The moral equivalent of `if (p) exp` when `p` has side-effects
 */
export function whenM<R1, E1>(b: Managed<R1, E1, boolean>) {
  return unlessM(core.map_(b, (b) => !b))
}

/**
 * The moral equivalent of `if (p) exp`
 */
export function when(b: () => boolean) {
  return unless(() => !b())
}

/**
 * A more powerful version of `withEarlyRelease` that allows specifying an
 * exit value in the event of early release.
 */
export function withEarlyReleaseExit_<R, E, A>(
  self: Managed<R, E, A>,
  exit: Ex.Exit<E, A>
): Managed<R, E, Tp.Tuple<[T.UIO<any>, A]>> {
  return managedApply(
    T.map_(self.effect, (tp) =>
      Tp.tuple(tp.get(0), Tp.tuple(T.uninterruptible(tp.get(0)(exit)), tp.get(1)))
    )
  )
}

/**
 * A more powerful version of `withEarlyRelease` that allows specifying an
 * exit value in the event of early release.
 *
 * @ets_data_first withEarlyReleaseExit_
 */
export function withEarlyReleaseExit<E, A>(exit: Ex.Exit<E, A>) {
  return <R>(self: Managed<R, E, A>) => withEarlyReleaseExit_(self, exit)
}

/**
 * Returns an effect that succeeds with the `Fiber.Id` of the caller.
 */
export const fiberId = fromEffect(T.fiberId)

/**
 * Modifies this `Managed` to provide a canceler that can be used to eagerly
 * execute the finalizer of this `Managed`. The canceler will run
 * uninterruptibly with an exit value indicating that the effect was
 * interrupted, and if completed will cause the regular finalizer to not run.
 */
export function withEarlyRelease<R, E, A>(
  self: Managed<R, E, A>
): Managed<R, E, Tp.Tuple<[T.UIO<any>, A]>> {
  return core.chain_(fiberId, (id) => withEarlyReleaseExit_(self, Ex.interrupt(id)))
}

/**
 * Sequentially zips this effect with the specified effect
 * returning the left side
 */
export function zipLeft_<R, E, A, R2, E2, A2>(
  a: Managed<R, E, A>,
  b: Managed<R2, E2, A2>
): Managed<R & R2, E | E2, A> {
  return core.zipWith_(a, b, (a) => a)
}

/**
 * Sequentially zips this effect with the specified effect
 * returning the left side
 *
 * @ets_data_first zipLeft_
 */
export function zipLeft<R2, E2, A2>(b: Managed<R2, E2, A2>) {
  return <R, E, A>(a: Managed<R, E, A>) => zipLeft_(a, b)
}

/**
 * Parallelly zips this effect with the specified effect
 * returning the left side
 */
export function zipLeftPar_<R, E, A, R2, E2, A2>(
  a: Managed<R, E, A>,
  b: Managed<R2, E2, A2>
): Managed<R & R2, E | E2, A> {
  return core.zipWithPar_(a, b, (a) => a)
}

/**
 * Parallelly zips this effect with the specified effect
 * returning the left side
 *
 * @ets_data_first zipLeftPar_
 */
export function zipLeftPar<R2, E2, A2>(b: Managed<R2, E2, A2>) {
  return <R, E, A>(a: Managed<R, E, A>) => zipLeftPar_(a, b)
}

/**
 * Sequentially zips this effect with the specified effect
 * returning the right side
 */
export function zipRight_<R, E, A, R2, E2, A2>(
  a: Managed<R, E, A>,
  b: Managed<R2, E2, A2>
): Managed<R & R2, E | E2, A2> {
  return core.zipWith_(a, b, (_, a) => a)
}

/**
 * Sequentially zips this effect with the specified effect
 * returning the right side
 *
 * @ets_data_first zipRight_
 */
export function zipRight<R2, E2, A2>(b: Managed<R2, E2, A2>) {
  return <R, E, A>(a: Managed<R, E, A>) => zipRight_(a, b)
}

/**
 * Parallelly zips this effect with the specified effect
 * returning the right side
 */
export function zipRightPar_<R, E, A, R2, E2, A2>(
  a: Managed<R, E, A>,
  b: Managed<R2, E2, A2>
): Managed<R & R2, E | E2, A2> {
  return core.zipWithPar_(a, b, (_, a) => a)
}

/**
 * Parallelly zips this effect with the specified effect
 * returning the right side
 *
 * @ets_data_first zipRightPar_
 */
export function zipRightPar<R2, E2, A2>(b: Managed<R2, E2, A2>) {
  return <R, E, A>(a: Managed<R, E, A>) => zipRightPar_(a, b)
}

/**
 * Parallely zips this effects
 */
export function zipPar_<R, E, A, R2, E2, A2>(
  a: Managed<R, E, A>,
  b: Managed<R2, E2, A2>
): Managed<R & R2, E | E2, [A, A2]> {
  return core.zipWithPar_(a, b, (a, b) => [a, b])
}

/**
 * Parallely zips this effects
 *
 * @ets_data_first zipPar_
 */
export function zipPar<R2, E2, A2>(b: Managed<R2, E2, A2>) {
  return <R, E, A>(a: Managed<R, E, A>): Managed<R & R2, E | E2, [A, A2]> =>
    zipPar_(a, b)
}

/**
 * Creates new `Managed` from a `Effect` value that uses a `ReleaseMap` and returns
 * a resource and a finalizer.
 *
 * The correct usage of this constructor consists of:
 * - Properly registering a finalizer in the ReleaseMap as part of the `Effect` value;
 * - Managing interruption safety - take care to use `uninterruptible` or
 *   `uninterruptibleMask` to verify that the finalizer is registered in the
 *   `ReleaseMap` after acquiring the value;
 * - Returning the finalizer returned from `ReleaseMap#add`. This is important
 *   to prevent double-finalization.
 */
export function create<R, E, A>(
  effect: T.Effect<Tp.Tuple<[R, RM.ReleaseMap]>, E, Tp.Tuple<[RM.Finalizer, A]>>
) {
  return managedApply(effect)
}

/**
 * Evaluate the predicate,
 * return the given A as success if predicate returns true, and the given E as error otherwise
 */
export function cond_<E, A>(pred: boolean, result: () => A, error: () => E): IO<E, A> {
  return pred ? succeed(result()) : core.fail(error())
}

/**
 * Evaluate the predicate,
 * return the given A as success if predicate returns true, and the given E as error otherwise
 *
 * @ets_data_first cond_
 */
export function cond<E, A>(
  result: () => A,
  error: () => E
): (pred: boolean) => IO<E, A> {
  return (pred) => cond_(pred, result, error)
}

/**
 * Applies the function `f` to each element of the `Iterable[A]` and runs
 * produced effects in parallel, discarding the results.
 *
 * For a sequential version of this method, see `forEachUnit_`.
 */
export function forEachUnitPar_<R, E, A, B>(
  as: Iterable<A>,
  f: (a: A) => Managed<R, E, B>,
  __trace?: string
): Managed<R, E, void> {
  return core.mapM_(
    core.makeManagedReleaseMap(T.parallel, __trace),
    (parallelReleaseMap) => {
      const makeInnerMap = T.provideSome_(
        T.map_(core.makeManagedReleaseMap(T.sequential).effect, (_) => _.get(1)),
        (r) => Tp.tuple(r, parallelReleaseMap)
      )
      return T.forEachUnitPar_(as, (a) =>
        T.chain_(makeInnerMap, (innerMap) =>
          T.provideSome_(
            T.map_(f(a).effect, (_) => _.get(1)),
            (r: R) => Tp.tuple(r, innerMap)
          )
        )
      )
    }
  )
}

/**
 * Applies the function `f` to each element of the `Iterable[A]` and runs
 * produced effects in parallel, discarding the results.
 *
 * For a sequential version of this method, see `forEachUnit_`.
 *
 * @ets_data_first forEachUnitPar_
 */
export function forEachUnitPar<R, E, A, B>(
  f: (a: A) => Managed<R, E, B>,
  __trace?: string
) {
  return (as: Iterable<A>) => forEachUnitPar_(as, f, __trace)
}

/**
 * Applies the function `f` to each element of the `Iterable[A]` and runs
 * produced effects in parallel, discarding the results.
 *
 * For a sequential version of this method, see `forEachUnit_`.
 */
export function forEachUnitParN_<R, E, A, B>(
  as: Iterable<A>,
  n: number,
  f: (a: A) => Managed<R, E, B>,
  __trace?: string
): Managed<R, E, void> {
  return core.mapM_(
    core.makeManagedReleaseMap(T.parallel, __trace),
    (parallelReleaseMap) => {
      const makeInnerMap = T.provideSome_(
        T.map_(core.makeManagedReleaseMap(T.sequential).effect, (_) => _.get(1)),
        (r) => Tp.tuple(r, parallelReleaseMap)
      )

      return T.forEachUnitParN_(as, n, (a) =>
        T.chain_(makeInnerMap, (innerMap) =>
          T.provideSome_(
            T.map_(f(a).effect, (_) => _.get(1)),
            (r: R) => Tp.tuple(r, innerMap)
          )
        )
      )
    }
  )
}

/**
 * Applies the function `f` to each element of the `Iterable[A]` and runs
 * produced effects in parallel, discarding the results.
 *
 * For a sequential version of this method, see `forEachUnit_`.
 *
 * @ets_data_first forEachUnitParN_
 */
export function forEachUnitParN<R, E, A, B>(n: number, f: (a: A) => Managed<R, E, B>) {
  return (as: Iterable<A>): Managed<R, E, void> => forEachUnitParN_(as, n, f)
}

/**
 * Evaluate each effect in the structure from left to right, collecting the
 * the successful values and discarding the empty cases. For a parallel version, see `collectPar`.
 *
 * @ets_data_first collect_
 */
export function collect<A, R, E, B>(f: (a: A) => Managed<R, Option<E>, B>) {
  return (self: Iterable<A>): Managed<R, E, Chunk.Chunk<B>> => collect_(self, f)
}

/**
 * Evaluate each effect in the structure from left to right, collecting the
 * the successful values and discarding the empty cases. For a parallel version, see `collectPar`.
 */
export function collect_<A, R, E, B>(
  self: Iterable<A>,
  f: (a: A) => Managed<R, Option<E>, B>
): Managed<R, E, Chunk.Chunk<B>> {
  return core.map_(
    forEach.forEach_(self, (a) => optional(f(a))),
    Chunk.compact
  )
}

/**
 * Evaluate each effect in the structure in parallel, collecting the
 * the successful values and discarding the empty cases.
 *
 * @ets_data_first collectPar_
 */
export function collectPar<A, R, E, B>(f: (a: A) => Managed<R, Option<E>, B>) {
  return (self: Iterable<A>): Managed<R, E, Chunk.Chunk<B>> => collectPar_(self, f)
}

/**
 * Evaluate each effect in the structure in parallel, collecting the
 * the successful values and discarding the empty cases.
 */
export function collectPar_<A, R, E, B>(
  self: Iterable<A>,
  f: (a: A) => Managed<R, Option<E>, B>
): Managed<R, E, Chunk.Chunk<B>> {
  return core.map_(
    forEach.forEachPar_(self, (a) => optional(f(a))),
    Chunk.compact
  )
}

/**
 * Evaluate each effect in the structure in parallel, collecting the
 * the successful values and discarding the empty cases.
 *
 * Unlike `collectPar`, this method will use at most up to `n` fibers.
 */
export function collectParN_<A, R, E, B>(
  self: Iterable<A>,
  n: number,
  f: (a: A) => Managed<R, Option<E>, B>
): Managed<R, E, Chunk.Chunk<B>> {
  return core.map_(
    forEach.forEachParN_(self, n, (a) => optional(f(a))),
    Chunk.compact
  )
}

/**
 * Evaluate each effect in the structure in parallel, collecting the
 * the successful values and discarding the empty cases.
 *
 * Unlike `collectPar`, this method will use at most up to `n` fibers.
 *
 * @ets_data_first collectParN_
 */
export function collectParN<A, R, E, B>(
  n: number,
  f: (a: A) => Managed<R, Option<E>, B>
): (self: Iterable<A>) => Managed<R, E, Chunk.Chunk<B>> {
  return (self) => collectParN_(self, n, f)
}

/**
 * Evaluate each effect in the structure from left to right, and collect the
 * results. For a parallel version, see `collectAllPar`.
 */
export function collectAll<R, E, A>(as: Iterable<Managed<R, E, A>>, __trace?: string) {
  return forEach.forEach_(as, identity, __trace)
}

/**
 * Evaluate each effect in the structure in parallel, and collect the
 * results. For a sequential version, see `collectAll`.
 */
export function collectAllPar<R, E, A>(
  as: Iterable<Managed<R, E, A>>,
  __trace?: string
) {
  return forEach.forEachPar_(as, identity, __trace)
}

/**
 * Evaluate each effect in the structure in parallel, and collect the
 * results. For a sequential version, see `collectAll`.
 *
 * Unlike `collectAllPar`, this method will use at most `n` fibers.
 *
 * @ets_data_first collectAllParN_
 */
export function collectAllParN(n: number, __trace?: string) {
  return <R, E, A>(as: Iterable<Managed<R, E, A>>) =>
    forEach.forEachParN_(as, n, identity, __trace)
}

/**
 * Evaluate each effect in the structure in parallel, and collect the
 * results. For a sequential version, see `collectAll`.
 *
 * Unlike `collectAllPar`, this method will use at most `n` fibers.
 */
export function collectAllParN_<R, E, A>(
  as: Iterable<Managed<R, E, A>>,
  n: number,
  __trace?: string
) {
  return forEach.forEachParN_(as, n, identity, __trace)
}

/**
 * Evaluate each effect in the structure from left to right, and discard the
 * results. For a parallel version, see `collectAllUnitPar`.
 */
export function collectAllUnit<R, E, A>(
  as: Iterable<Managed<R, E, A>>,
  __trace?: string
) {
  return forEach.forEachUnit_(as, identity, __trace)
}

/**
 * Evaluate each effect in the structure in parallel, and discard the
 * results. For a sequential version, see `collectAllUnit`.
 */
export function collectAllUnitPar<R, E, A>(
  as: Iterable<Managed<R, E, A>>,
  __trace?: string
) {
  return forEachUnitPar_(as, identity, __trace)
}

/**
 * Evaluate each effect in the structure in parallel, and discard the
 * results. For a sequential version, see `collectAllUnit`.
 *
 * Unlike `collectAllUnitPar`, this method will use at most `n` fibers.
 *
 * @ets_data_first collectAllUnitParN_
 */
export function collectAllUnitParN(n: number, __trace?: string) {
  return <R, E, A>(as: Iterable<Managed<R, E, A>>) =>
    forEachUnitParN_(as, n, identity, __trace)
}

/**
 * Evaluate each effect in the structure in parallel, and discard the
 * results. For a sequential version, see `collectAllUnit`.
 *
 * Unlike `collectAllUnitPar`, this method will use at most `n` fibers.
 */
export function collectAllUnitParN_<R, E, A>(
  as: Iterable<Managed<R, E, A>>,
  n: number,
  __trace?: string
) {
  return forEachUnitParN_(as, n, identity, __trace)
}

/**
 * Evaluate each effect in the structure with `collectAll`, and collect
 * the results with given partial function.
 */
export function collectAllWith_<R, E, A, B>(
  as: Iterable<Managed<R, E, A>>,
  pf: (a: A) => O.Option<B>,
  __trace?: string
): Managed<R, E, Chunk.Chunk<B>> {
  return core.map_(collectAll(as, __trace), Chunk.collect(pf))
}

/**
 * Evaluate each effect in the structure with `collectAll`, and collect
 * the results with given partial function.
 *
 * @ets_data_first collectAllWith_
 */
export function collectAllWith<A, B>(pf: (a: A) => O.Option<B>, __trace?: string) {
  return <R, E>(as: Iterable<Managed<R, E, A>>) => collectAllWith_(as, pf, __trace)
}

/**
 * Evaluate each effect in the structure with `collectAll`, and collect
 * the results with given partial function.
 */
export function collectAllWithPar_<R, E, A, B>(
  as: Iterable<Managed<R, E, A>>,
  pf: (a: A) => O.Option<B>,
  __trace?: string
): Managed<R, E, Chunk.Chunk<B>> {
  return core.map_(collectAllPar(as, __trace), Chunk.collect(pf))
}

/**
 * Evaluate each effect in the structure with `collectAll`, and collect
 * the results with given partial function.
 *
 * @ets_data_first collectAllWithPar_
 */
export function collectAllWithPar<A, B>(pf: (a: A) => O.Option<B>, __trace?: string) {
  return <R, E>(as: Iterable<Managed<R, E, A>>) => collectAllWithPar_(as, pf, __trace)
}

/**
 * Evaluate each effect in the structure with `collectAllPar`, and collect
 * the results with given partial function.
 *
 * Unlike `collectAllWithPar`, this method will use at most up to `n` fibers.
 */
export function collectAllWithParN_<R, E, A, B>(
  as: Iterable<Managed<R, E, A>>,
  n: number,
  pf: (a: A) => O.Option<B>,
  __trace?: string
): Managed<R, E, Chunk.Chunk<B>> {
  return core.map_(collectAllParN_(as, n, __trace), Chunk.collect(pf))
}

/**
 * Evaluate each effect in the structure with `collectAllPar`, and collect
 * the results with given partial function.
 *
 * Unlike `collectAllWithPar`, this method will use at most up to `n` fibers.
 *
 * @ets_data_first collectAllWithParN_
 */
export function collectAllWithParN<A, B>(
  n: number,
  pf: (a: A) => O.Option<B>,
  __trace?: string
): <R, E>(as: Iterable<Managed<R, E, A>>) => Managed<R, E, Chunk.Chunk<B>> {
  return (as) => collectAllWithParN_(as, n, pf, __trace)
}

/**
 * Evaluate and run each effect in the structure and collect discarding failed ones.
 */
export function collectAllSuccesses<R, E, A>(
  as: Iterable<Managed<R, E, A>>,
  __trace?: string
) {
  return collectAllWith_(
    I.map_(as, (x) => result(x)),
    (e) => (e._tag === "Success" ? O.some(e.value) : O.none),
    __trace
  )
}

/**
 * Evaluate and run each effect in the structure in parallel, and collect discarding failed ones.
 */
export function collectAllSuccessesPar<R, E, A>(
  as: Iterable<Managed<R, E, A>>,
  __trace?: string
) {
  return collectAllWithPar_(
    I.map_(as, (x) => result(x)),
    (e) => (e._tag === "Success" ? O.some(e.value) : O.none),
    __trace
  )
}

/**
 * Evaluate and run each effect in the structure in parallel, and collect discarding failed ones.
 *
 * Unlike `collectAllSuccessesPar`, this method will use at most up to `n` fibers.
 *
 * @ets_data_first collectAllSuccessesParN_
 */
export function collectAllSuccessesParN(n: number, __trace?: string) {
  return <R, E, A>(as: Iterable<Managed<R, E, A>>) =>
    collectAllSuccessesParN_(as, n, __trace)
}

/**
 * Evaluate and run each effect in the structure in parallel, and collect discarding failed ones.
 *
 * Unlike `collectAllSuccessesPar`, this method will use at most up to `n` fibers.
 */
export function collectAllSuccessesParN_<R, E, A>(
  as: Iterable<Managed<R, E, A>>,
  n: number,
  __trace?: string
) {
  return collectAllWithParN_(
    I.map_(as, (x) => result(x)),
    n,
    (e) => (e._tag === "Success" ? O.some(e.value) : O.none),
    __trace
  )
}

/**
 * Creates an effect that only executes the provided function as its
 * release action.
 */
export function finalizerExit<R, X>(
  f: (exit: Ex.Exit<any, any>) => T.RIO<R, X>,
  __trace?: string
): RIO<R, void> {
  return makeExit_(T.unit, (_, e) => f(e), __trace)
}

/**
 * Creates an effect that only executes the provided finalizer as its
 * release action.
 */
export function finalizer<R, X>(f: T.RIO<R, X>, __trace?: string): RIO<R, void> {
  return finalizerExit(() => f, __trace)
}

/**
 * Folds an Iterable[A] using an effectual function f, working sequentially from left to right.
 */
export function reduce_<A, Z, R, E>(
  i: Iterable<A>,
  zero: Z,
  f: (z: Z, a: A) => Managed<R, E, Z>,
  __trace?: string
): Managed<R, E, Z> {
  return suspend(
    () =>
      A.reduce_(Array.from(i), succeed(zero) as Managed<R, E, Z>, (acc, el) =>
        core.chain_(acc, (a) => f(a, el))
      ),
    __trace
  )
}

/**
 * Folds an Iterable[A] using an effectual function f, working sequentially from left to right.
 *
 * @ets_data_first reduce_
 */
export function reduce<Z, R, E, A>(
  zero: Z,
  f: (z: Z, a: A) => Managed<R, E, Z>,
  __trace?: string
) {
  return (i: Iterable<A>) => reduce_(i, zero, f, __trace)
}

/**
 * Folds an Iterable[A] using an effectual function f, working sequentially from left to right.
 */
export function reduceRight_<A, Z, R, E>(
  i: Iterable<A>,
  zero: Z,
  f: (a: A, z: Z) => Managed<R, E, Z>,
  __trace?: string
): Managed<R, E, Z> {
  return suspend(
    () =>
      A.reduceRight_(Array.from(i), succeed(zero) as Managed<R, E, Z>, (el, acc) =>
        core.chain_(acc, (a) => f(el, a))
      ),
    __trace
  )
}

/**
 * Folds an Iterable[A] using an effectual function f, working sequentially from left to right.
 *
 * @ets_data_first reduceRight_
 */
export function reduceRight<Z, R, E, A>(zero: Z, f: (a: A, z: Z) => Managed<R, E, Z>) {
  return (i: Iterable<A>) => reduceRight_(i, zero, f)
}

/**
 * Reduces an `Iterable[IO]` to a single `IO`, working sequentially.
 */
export function reduceAll_<R, E, A>(
  as: NA.NonEmptyArray<Managed<R, E, A>>,
  f: (acc: A, a: A) => A
): Managed<R, E, A> {
  return A.reduce_(NA.tail(as), NA.head(as), (acc, a) => core.zipWith_(acc, a, f))
}

/**
 * Reduces an `Iterable[IO]` to a single `IO`, working sequentially.
 *
 * @ets_data_first reduceAll_
 */
export function reduceAll<A>(f: (acc: A, a: A) => A) {
  return <R, E>(as: NA.NonEmptyArray<Managed<R, E, A>>) => reduceAll_(as, f)
}

/**
 * Reduces an `Iterable[IO]` to a single `IO`, working in parallel.
 */
export function reduceAllPar_<R, E, A>(
  as: NA.NonEmptyArray<Managed<R, E, A>>,
  f: (acc: A, a: A) => A
): Managed<R, E, A> {
  return core.mapM_(core.makeManagedReleaseMap(T.parallel), (parallelReleaseMap) =>
    T.provideSome_(
      T.reduceAllPar_(
        NA.map_(as, (_) => T.map_(_.effect, (_) => _.get(1))),
        f
      ),
      (r: R) => Tp.tuple(r, parallelReleaseMap)
    )
  )
}

/**
 * Reduces an `Iterable[IO]` to a single `IO`, working in parallel.
 *
 * @ets_data_first reduceAllPar_
 */
export function reduceAllPar<A>(f: (acc: A, a: A) => A) {
  return <R, E>(as: NA.NonEmptyArray<Managed<R, E, A>>) => reduceAllPar_(as, f)
}

/**
 * Reduces an `Iterable[IO]` to a single `IO`, working in up to `n` fibers in parallel.
 */
export function reduceAllParN_<R, E, A>(
  as: NA.NonEmptyArray<Managed<R, E, A>>,
  n: number,
  f: (acc: A, a: A) => A
): Managed<R, E, A> {
  return core.mapM_(core.makeManagedReleaseMap(T.parallel), (parallelReleaseMap) =>
    T.provideSome_(
      T.reduceAllParN_(
        NA.map_(as, (_) => T.map_(_.effect, (_) => _.get(1))),
        n,
        f
      ),
      (r: R) => Tp.tuple(r, parallelReleaseMap)
    )
  )
}

/**
 * Reduces an `Iterable[IO]` to a single `IO`, working in up to `n` fibers in parallel.
 *
 * @ets_data_first reduceAllParN_
 */
export function reduceAllParN<A>(n: number, f: (acc: A, a: A) => A) {
  return <R, E>(as: NA.NonEmptyArray<Managed<R, E, A>>): Managed<R, E, A> =>
    reduceAllParN_(as, n, f)
}

/**
 * Merges an `Iterable[IO]` to a single IO, working sequentially.
 *
 * @ets_data_first mergeAll_
 */
export function mergeAll<A, B>(zero: B, f: (b: B, a: A) => B) {
  return <R, E>(as: Iterable<Managed<R, E, A>>): Managed<R, E, B> =>
    mergeAll_(as, zero, f)
}

/**
 * Merges an `Iterable[IO]` to a single IO, working sequentially.
 */
export function mergeAll_<R, E, A, B>(
  as: Iterable<Managed<R, E, A>>,
  zero: B,
  f: (b: B, a: A) => B
) {
  return I.reduce_(as, succeed(zero) as Managed<R, E, B>, (b, a) =>
    core.zipWith_(b, a, f)
  )
}

/**
 * Merges an `Iterable[IO]` to a single IO, working in parallel.
 *
 * Due to the parallel nature of this combinator, `f` must be both:
 * - commutative: `f(a, b) == f(b, a)`
 * - associative: `f(a, f(b, c)) == f(f(a, b), c)`
 *
 * It's unsafe to execute side effects inside `f`, as `f` may be executed
 * more than once for some of `in` elements during effect execution.
 *
 * @ets_data_first mergeAllPar_
 */
export function mergeAllPar<A, B>(zero: B, f: (b: B, a: A) => B) {
  return <R, E>(as: Iterable<Managed<R, E, A>>): Managed<R, E, B> =>
    mergeAllPar_(as, zero, f)
}

/**
 * Merges an `Iterable[IO]` to a single IO, working in parallel.
 *
 * Due to the parallel nature of this combinator, `f` must be both:
 * - commutative: `f(a, b) == f(b, a)`
 * - associative: `f(a, f(b, c)) == f(f(a, b), c)`
 *
 * It's unsafe to execute side effects inside `f`, as `f` may be executed
 * more than once for some of `in` elements during effect execution.
 */
export function mergeAllPar_<R, E, A, B>(
  as: Iterable<Managed<R, E, A>>,
  zero: B,
  f: (b: B, a: A) => B
) {
  return core.mapM_(core.makeManagedReleaseMap(T.parallel), (parallelReleaseMap) =>
    T.provideSome_(
      T.mergeAllPar_(
        I.map_(as, (_) => T.map_(_.effect, (_) => _.get(1))),
        zero,
        f
      ),
      (r: R) => Tp.tuple(r, parallelReleaseMap)
    )
  )
}

/**
 * Merges an `Iterable[IO]` to a single IO, working in with up to `n` fibers in parallel.
 *
 * Due to the parallel nature of this combinator, `f` must be both:
 * - commutative: `f(a, b) == f(b, a)`
 * - associative: `f(a, f(b, c)) == f(f(a, b), c)`
 *
 * It's unsafe to execute side effects inside `f`, as `f` may be executed
 * more than once for some of `in` elements during effect execution.
 *
 * @ets_data_first mergeAllParN_
 */
export function mergeAllParN<A, B>(n: number, zero: B, f: (b: B, a: A) => B) {
  return <R, E>(as: Iterable<Managed<R, E, A>>): Managed<R, E, B> =>
    mergeAllParN_(as, n, zero, f)
}

/**
 * Merges an `Iterable[IO]` to a single IO, working in with up to `n` fibers in parallel.
 *
 * Due to the parallel nature of this combinator, `f` must be both:
 * - commutative: `f(a, b) == f(b, a)`
 * - associative: `f(a, f(b, c)) == f(f(a, b), c)`
 *
 * It's unsafe to execute side effects inside `f`, as `f` may be executed
 * more than once for some of `in` elements during effect execution.
 */
export function mergeAllParN_<R, E, A, B>(
  as: Iterable<Managed<R, E, A>>,
  n: number,
  zero: B,
  f: (b: B, a: A) => B
): Managed<R, E, B> {
  return core.mapM_(core.makeManagedReleaseMap(T.parallel), (parallelReleaseMap) =>
    T.provideSome_(
      T.mergeAllParN_(
        I.map_(as, (_) => T.map_(_.effect, (_) => _.get(1))),
        n,
        zero,
        f
      ),
      (r: R) => Tp.tuple(r, parallelReleaseMap)
    )
  )
}

/**
 * A scope in which Managed values can be safely allocated. Passing a managed
 * resource to the `apply` method will return an effect that allocates the resource
 * and returns it with an early-release handle.
 */
export interface Scope {
  <R, E, A>(ma: Managed<R, E, A>): T.Effect<R, E, Tp.Tuple<[RM.Finalizer, A]>>
}

/**
 * Creates a scope in which resources can be safely allocated into together with a release action.
 */
export const scope: Managed<unknown, never, Scope> = core.map_(
  releaseMap,
  (finalizers) =>
    <R, E, A>(ma: Managed<R, E, A>): T.Effect<R, E, Tp.Tuple<[RM.Finalizer, A]>> =>
      T.chain_(T.environment<R>(), (r) =>
        T.provideAll_(ma.effect, Tp.tuple(r, finalizers))
      )
)

/**
 * Locally installs a supervisor and an effect that succeeds with all the
 * children that have been forked in the returned effect.
 */
export function withChildren<R, E, A>(
  get: (
    io: T.Effect<unknown, never, SS.SortedSet<F.Runtime<any, any>>>
  ) => Managed<R, E, A>
): Managed<R, E, A> {
  return unwrap(
    T.map_(track, (supervisor) =>
      managedApply(
        T.supervised(supervisor)(
          get(
            T.chain_(supervisor.value, (children) =>
              T.map_(T.descriptor, (d) => SS.filter_(children, (_) => _.id !== d.id))
            )
          ).effect
        )
      )
    )
  )
}

/**
 * Unwraps a `Managed` that is inside an `Effect`.
 */
export function unwrap<R, E, A>(
  fa: T.Effect<R, E, Managed<R, E, A>>
): Managed<R, E, A> {
  return flatten(fromEffect(fa))
}

/**
 * Creates a `Managed` from an `AutoCloseable` resource. The resource's `close`
 * method will be used as the release action.
 */
export function fromAutoClosable<R, E, A extends { readonly close: () => void }>(
  fa: T.Effect<R, E, A>
) {
  return core.make_(fa, (a) => T.succeedWith(() => a.close()))
}

/**
 * Creates a `Managed` from an `AutoCloseable` resource. The resource's `close`
 * method will be used as the release action.
 */
export function fromAutoClosableM<
  R,
  E,
  R1,
  A extends { readonly close: T.Effect<R1, never, any> }
>(fa: T.Effect<R, E, A>) {
  return core.make_(fa, (a) => a.close)
}

/**
 * Returns an effect that is interrupted as if by the fiber calling this
 * method.
 */
export const interrupt = core.chain_(fromEffect(T.descriptor), (d) => interruptAs(d.id))

/**
 * Returns an effect that is interrupted as if by the specified fiber.
 */
export function interruptAs(id: FiberID) {
  return halt(C.interrupt(id))
}

/**
 * Low level expose internal trace pusher
 */
export function exposeTracer<R, E, A>(
  f: (tracer: (trace?: string) => void) => Managed<R, E, A>
): Managed<R, E, A> {
  return managedApply(new ITracer((tracer) => f(tracer).effect))
}
