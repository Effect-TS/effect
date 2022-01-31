// ets_tracing: off

import type * as Tp from "@effect-ts/system/Collections/Immutable/Tuple"
import * as F from "@effect-ts/system/XPure"

import type { XIO } from "./definition.js"

/**
 * Lift a sync (non failable) computation
 */
export const succeedWith: <A>(f: () => A) => XIO<A> = F.succeedWith

/**
 * Combines this computation with the specified computation.
 */
export const zip: <B>(fb: XIO<B>) => <A>(fa: XIO<A>) => XIO<Tp.Tuple<[A, B]>> = F.zip

/**
 * Extends this computation with another computation that depends on the
 * result of this computation by running the first computation, using its
 * result to generate a second computation, and running that computation.
 */
export const chain: <A, B>(f: (a: A) => XIO<B>) => (self: XIO<A>) => XIO<B> = F.chain

/**
 * `map` can be used to turn functions `(a: A) => B` into functions `(fa: F<A>) => F<B>`
 *  whose argument and return types use the type constructor `F` to represent
 *  some computational context.
 */
export const map: <A, B>(f: (a: A) => B) => <R>(self: XIO<A>) => XIO<B> = F.map

/**
 * Succeed with a value A
 */
export const succeed: <A>(a: A) => XIO<A> = F.succeed

/**
 * Run the computation
 */
export const run = <A>(self: XIO<A>): A => F.run(self)

/**
 * Returns a computation that effectfully "peeks" at the success of this one.
 */
export const tap: <A>(f: (a: A) => XIO<any>) => (self: XIO<A>) => XIO<A> = F.tap
