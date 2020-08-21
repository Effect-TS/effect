import * as F from "@effect-ts/system/XPure"

import * as P from "../../Prelude"
import * as DSL from "../../Prelude/DSL"

export interface IO<A> extends F.XPure<unknown, unknown, unknown, never, A> {}

export const IOURI = "IO"
export type IOURI = typeof IOURI

declare module "../../Prelude/HKT" {
  interface URItoKind<D, N extends string, K, SI, SO, X, I, S, R, E, A> {
    [IOURI]: IO<A>
  }
}

/**
 * Combines this computation with the specified computation.
 */
export const zip: <B>(fb: IO<B>) => <A>(fa: IO<A>) => IO<readonly [A, B]> = F.zip

/**
 * Extends this computation with another computation that depends on the
 * result of this computation by running the first computation, using its
 * result to generate a second computation, and running that computation.
 */
export const chain: <A, B>(f: (a: A) => IO<B>) => (self: IO<A>) => IO<B> = F.chain

/**
 * `map` can be used to turn functions `(a: A) => B` into functions `(fa: F<A>) => F<B>`
 *  whose argument and return types use the type constructor `F` to represent
 *  some computational context.
 */
export const map: <A, B>(f: (a: A) => B) => <R>(self: IO<A>) => IO<B> = F.map

/**
 * Succeed with a value A
 */
export const succeed: <A>(a: A) => IO<A> = (a) => F.succeed(() => a)

/**
 * Run the computation
 */
export const run = <A>(self: IO<A>): A => F.runIO(self)

/**
 * Run the computation with environment R
 */
export const runEnv = <R>(r: R) => <A>(self: IO<A>): A => F.runIO(F.provideAll(r)(self))

//
// Instances
//

/**
 * The `Any` instance for `IO[-_, +_]`.
 */
export const Any = P.instance<P.Any<[IOURI]>>({
  any: () => F.succeed(() => ({}))
})

/**
 * The `Covariant` instance for `IO[-_, +_]`.
 */
export const Covariant = P.instance<P.Covariant<[IOURI]>>({
  map
})

/**
 * The `AssociativeBoth` instance for `IO[-_, +_]`.
 */
export const AssociativeBoth = P.instance<P.AssociativeBoth<[IOURI]>>({
  both: zip
})

/**
 * The `AssociativeFlatten` instance for `IO[-_, +_]`.
 */
export const AssociativeFlatten = P.instance<P.AssociativeFlatten<[IOURI]>>({
  flatten: (ffa) => F.chain_(ffa, (x) => x)
})

/**
 * The `IdentityFlatten` instance for `IO[-_, +_]`.
 */
export const IdentityFlatten = P.instance<P.IdentityFlatten<[IOURI]>>({
  ...Any,
  ...AssociativeFlatten
})

/**
 * The `Monad` instance for `IO[-_, +_]`.
 */
export const Monad = P.instance<P.Monad<[IOURI]>>({
  ...Any,
  ...Covariant,
  ...AssociativeFlatten
})

/**
 * The `Applicative` instance for `IO[-_, +_]`.
 */
export const Applicative = P.instance<P.Applicative<[IOURI]>>({
  ...Any,
  ...Covariant,
  ...AssociativeBoth
})

/**
 * Struct based applicative for IO[-_, +_]
 */
export const sequenceS = DSL.sequenceSF(Applicative)

/**
 * Returns a computation that effectfully "peeks" at the success of this one.
 */
export const tap: <A>(f: (a: A) => IO<any>) => <R>(self: IO<A>) => IO<A> = F.tap
