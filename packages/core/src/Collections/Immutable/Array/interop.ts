// ets_tracing: off

import * as T from "@effect-ts/system/Effect"
import * as S from "@effect-ts/system/Sync"

import * as A from "./operations.js"

/**
 * Applies the function f to each element of the Array<A> and returns the results in a new B[]
 */
export function mapEffect_<A, R, E, B>(
  self: A.Array<A>,
  f: (a: A) => T.Effect<R, E, B>
) {
  return T.map_(T.forEach_(self, f), A.from)
}

/**
 * Applies the function f to each element of the Array<A> and returns the results in a new B[]
 *
 * @ets_data_first mapEffect_
 */
export function mapEffect<A, R, E, B>(f: (a: A) => T.Effect<R, E, B>) {
  return (self: A.Array<A>) => mapEffect_(self, f)
}

/**
 * Applies the function f to each element of the Array<A> and returns the results in a new B[]
 */
export function mapEffectPar_<A, R, E, B>(
  self: A.Array<A>,
  f: (a: A) => T.Effect<R, E, B>
) {
  return T.map_(T.forEachPar_(self, f), A.from)
}

/**
 * Applies the function f to each element of the Array<A> and returns the results in a new B[]
 *
 * @ets_data_first mapEffectPar_
 */
export function mapEffectPar<A, R, E, B>(f: (a: A) => T.Effect<R, E, B>) {
  return (self: A.Array<A>) => mapEffectPar_(self, f)
}

/**
 * Applies the function f to each element of the Array<A> and returns the results in a new B[]
 */
export function mapEffectParN_<A, R, E, B>(
  self: A.Array<A>,
  n: number,
  f: (a: A) => T.Effect<R, E, B>
) {
  return T.map_(T.forEachParN_(self, n, f), A.from)
}

/**
 * Applies the function f to each element of the Array<A> and returns the results in a new B[]
 *
 * @ets_data_first mapEffectParN_
 */
export function mapEffectParN<A, R, E, B>(n: number, f: (a: A) => T.Effect<R, E, B>) {
  return (self: A.Array<A>) => mapEffectParN_(self, n, f)
}

/**
 * Applies the function f to each element of the Array<A> and returns the results in a new B[]
 */
export function mapSync_<A, R, E, B>(
  self: A.Array<A>,
  f: (a: A) => S.Sync<R, E, B>
): S.Sync<R, E, A.Array<B>> {
  return S.map_(S.forEach_(self, f), A.from)
}

/**
 * Applies the function f to each element of the Array<A> and returns the results in a new B[]
 *
 * @ets_data_first mapSync_
 */
export function mapSync<A, R, E, B>(f: (a: A) => S.Sync<R, E, B>) {
  return (self: A.Array<A>): S.Sync<R, E, A.Array<B>> => mapSync_(self, f)
}
