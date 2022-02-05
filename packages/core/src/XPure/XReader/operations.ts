// ets_tracing: off

import type * as Tp from "@effect-ts/system/Collections/Immutable/Tuple"
import * as F from "@effect-ts/system/XPure"

import type { XReader } from "./definition.js"

/**
 * Lift a sync (non failable) computation
 */
export const succeedWith: <A>(f: () => A) => XReader<unknown, A> = F.succeedWith

/**
 * Reads the current context
 */
export const environment = <R>(): XReader<R, R> => F.environment<R>()

/**
 * Projects a value from the global context in a Reader
 */
export const access: <R, A>(f: (r: R) => A) => XReader<R, A> = F.access

/**
 * Changes the value of the local context during the execution of the action `ma`
 */
export const provideSome: <Q, R>(
  f: (d: Q) => R
) => <A>(ma: XReader<R, A>) => XReader<Q, A> = F.provideSome

/**
 * Combines this computation with the specified computation.
 */
export const zip: <R1, B>(
  fb: XReader<R1, B>
) => <R, A>(fa: XReader<R, A>) => XReader<R & R1, Tp.Tuple<[A, B]>> = F.zip

/**
 * Extends this computation with another computation that depends on the
 * result of this computation by running the first computation, using its
 * result to generate a second computation, and running that computation.
 */
export const chain: <A, R1, B>(
  f: (a: A) => XReader<R1, B>
) => <R>(self: XReader<R, A>) => XReader<R & R1, B> = F.chain

/**
 * `map` can be used to turn functions `(a: A) => B` into functions `(fa: F<A>) => F<B>`
 *  whose argument and return types use the type constructor `F` to represent
 *  some computational context.
 */
export const map: <A, B>(f: (a: A) => B) => <R>(self: XReader<R, A>) => XReader<R, B> =
  F.map

/**
 * Succeed with a value A
 */
export const succeed: <A>(a: A) => XReader<unknown, A> = F.succeed

/**
 * Run the computation
 */
export const run = <A>(self: XReader<unknown, A>): A => F.run(self)

/**
 * Run the computation with environment R
 */
export const runEnv =
  <R>(r: R) =>
  <A>(self: XReader<R, A>): A =>
    F.run(F.provideAll_(self, r))

/**
 * Returns a computation that effectfully "peeks" at the success of this one.
 */
export const tap: <A, R1>(
  f: (a: A) => XReader<R1, any>
) => <R>(self: XReader<R, A>) => XReader<R & R1, A> = F.tap
