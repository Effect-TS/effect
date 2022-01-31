// ets_tracing: off

import type * as Tp from "@effect-ts/system/Collections/Immutable/Tuple"
import * as F from "@effect-ts/system/XPure"

import type { XState } from "./definition.js"

/**
 * Combines this computation with the specified computation.
 */
export const zip: <S, B>(
  fb: XState<S, B>
) => <A>(fa: XState<S, A>) => XState<S, Tp.Tuple<[A, B]>> = F.zip

/**
 * Extends this computation with another computation that depends on the
 * result of this computation by running the first computation, using its
 * result to generate a second computation, and running that computation.
 */
export const chain: <S, A, B>(
  f: (a: A) => XState<S, B>
) => (self: XState<S, A>) => XState<S, B> = F.chain

/**
 * `map` can be used to turn functions `(a: A) => B` into functions `(fa: F<A>) => F<B>`
 *  whose argument and return types use the type constructor `F` to represent
 *  some computational context.
 */
export const map: <A, B>(f: (a: A) => B) => <S>(self: XState<S, A>) => XState<S, B> =
  F.map

/**
 * Succeed with a value A
 */
export const succeed: <S, A>(a: A) => XState<S, A> = F.succeed

/**
 * Run the computation with input S returning updated state and output
 */
export const run =
  <S>(s: S) =>
  <A>(self: XState<S, A>): Tp.Tuple<[S, A]> =>
    F.runState_(self, s)

/**
 * Run the computation with input S returning the updated state and discarding the output
 */
export const runState =
  <S>(s: S) =>
  <A>(self: XState<S, A>): S =>
    F.runState_(self, s)[0]

/**
 * Run the computation with input S returning the state and discarding the updated state
 */
export const runResult =
  <S>(r: S) =>
  <A>(self: XState<S, A>): A =>
    F.runResult(r)(self)

/**
 * Returns a computation that effectfully "peeks" at the success of this one.
 */
export const tap: <A, S>(
  f: (a: A) => XState<S, any>
) => (self: XState<S, A>) => XState<S, A> = F.tap
