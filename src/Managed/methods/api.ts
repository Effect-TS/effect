import type { Cause } from "../../Cause"
import * as T from "../../Effect"
import * as E from "../../Either"
import { pipe, tuple } from "../../Function"
import * as O from "../../Option"
import * as P from "../../Promise"
import { map_, mapM_ } from "../core"
import type { UIO } from "../managed"
import { Managed } from "../managed"
import { absolve } from "./absolve"
import { releaseMap } from "./releaseMap"

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
