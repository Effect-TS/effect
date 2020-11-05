import type { Cause } from "../../Cause"
import * as T from "../../Effect"
import * as E from "../../Either"
import { flow, pipe, tuple } from "../../Function"
import * as O from "../../Option"
import * as P from "../../Promise"
import { fail, map_, mapM_ } from "../core"
import { fromEffect } from "../fromEffect"
import type { UIO } from "../managed"
import { Managed } from "../managed"
import { succeed } from "../succeed"
import { absolve } from "./absolve"
import { foldM_ } from "./foldM_"
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
