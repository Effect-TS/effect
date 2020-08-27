import * as F from "@effect-ts/system/XPure"

import { constant } from "../../Function"
import type { XStateURI } from "../../Modules"
import * as P from "../../Prelude"
import * as DSL from "../../Prelude/DSL"

export { XStateURI } from "../../Modules"

export type V = P.V<"S", "_">

export interface XState<S, A> extends F.XPure<S, S, unknown, never, A> {}

/**
 * Combines this computation with the specified computation.
 */
export const zip: <S, B>(
  fb: XState<S, B>
) => <A>(fa: XState<S, A>) => XState<S, readonly [A, B]> = F.zip

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
export const succeed: <S, A>(a: A) => XState<S, A> = (a) => F.succeed(() => a)

/**
 * Run the computation with input S returning updated state and output
 */
export const run = <S>(r: S) => <A>(self: XState<S, A>): readonly [S, A] =>
  F.runStateResult(r)(self)

/**
 * Run the computation with input S returning the updated state and discarding the output
 */
export const runState = <S>(r: S) => <A>(self: XState<S, A>): S => F.runState(r)(self)

/**
 * Run the computation with input S returning the state and discarding the updated state
 */
export const runResult = <S>(r: S) => <A>(self: XState<S, A>): A => F.runResult(r)(self)

//
// Instances
//

/**
 * The `Any` instance for `Reader[-_, +_]`.
 */
export const Any = P.instance<P.Any<[XStateURI], V>>({
  any: () => F.succeed(constant({}))
})

/**
 * The `Covariant` instance for `Reader[-_, +_]`.
 */
export const Covariant = P.instance<P.Covariant<[XStateURI], V>>({
  map
})

/**
 * The `AssociativeBoth` instance for `Reader[-_, +_]`.
 */
export const AssociativeBoth = P.instance<P.AssociativeBoth<[XStateURI], V>>({
  both: zip
})

/**
 * The `AssociativeFlatten` instance for `Reader[-_, +_]`.
 */
export const AssociativeFlatten = P.instance<P.AssociativeFlatten<[XStateURI], V>>({
  flatten: (ffa) => F.chain_(ffa, (x) => x)
})

/**
 * The `IdentityFlatten` instance for `Reader[-_, +_]`.
 */
export const IdentityFlatten = P.instance<P.IdentityFlatten<[XStateURI], V>>({
  ...Any,
  ...AssociativeFlatten
})

/**
 * The `Monad` instance for `Reader[-_, +_]`.
 */
export const Monad = P.instance<P.Monad<[XStateURI], V>>({
  ...Any,
  ...Covariant,
  ...AssociativeFlatten
})

/**
 * The `Applicative` instance for `Reader[-_, +_]`.
 */
export const Applicative = P.instance<P.Applicative<[XStateURI], V>>({
  ...Any,
  ...Covariant,
  ...AssociativeBoth
})

/**
 * Struct based applicative for Reader[-_, +_]
 */
export const struct = DSL.structF(Applicative)

/**
 * Returns a computation that effectfully "peeks" at the success of this one.
 */
export const tap: <A, S>(
  f: (a: A) => XState<S, any>
) => (self: XState<S, A>) => XState<S, A> = F.tap
