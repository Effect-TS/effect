import * as F from "@effect-ts/system/XPure"

import type { XReaderURI } from "../../Modules"
import * as P from "../../Prelude"
import * as DSL from "../../Prelude/DSL"

export { XReaderURI } from "../../Modules"

export interface XReader<R, A> extends F.XPure<unknown, unknown, R, never, A> {}

/**
 * Lift a sync (non failable) computation
 */
export const sync: <A>(f: () => A) => XReader<unknown, A> = F.sync

/**
 * Reads the current context
 */
export const environment = <R>(): XReader<R, R> => F.environment<R>()()

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
) => <R, A>(fa: XReader<R, A>) => XReader<R & R1, readonly [A, B]> = F.zip

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
export const succeed: <A>(a: A) => XReader<unknown, A> = (a) => F.succeed(() => a)

/**
 * Run the computation
 */
export const run = <A>(self: XReader<unknown, A>): A => F.runIO(self)

/**
 * Run the computation with environment R
 */
export const runEnv = <R>(r: R) => <A>(self: XReader<R, A>): A =>
  F.runIO(F.provideAll(r)(self))

//
// Instances
//

/**
 * The `Access` instance for `Reader[-_, +_]`.
 */
export const Access = P.instance<P.FX.Access<[XReaderURI]>>({
  access: F.access
})

/**
 * The `Any` instance for `Reader[-_, +_]`.
 */
export const Any = P.instance<P.Any<[XReaderURI]>>({
  any: () => F.succeed(() => ({}))
})

/**
 * The `Covariant` instance for `Reader[-_, +_]`.
 */
export const Covariant = P.instance<P.Covariant<[XReaderURI]>>({
  map
})

/**
 * The `AssociativeBoth` instance for `Reader[-_, +_]`.
 */
export const AssociativeBoth = P.instance<P.AssociativeBoth<[XReaderURI]>>({
  both: zip
})

/**
 * The `AssociativeFlatten` instance for `Reader[-_, +_]`.
 */
export const AssociativeFlatten = P.instance<P.AssociativeFlatten<[XReaderURI]>>({
  flatten: (ffa) => F.chain_(ffa, (x) => x)
})

/**
 * The `IdentityFlatten` instance for `Reader[-_, +_]`.
 */
export const IdentityFlatten = P.instance<P.IdentityFlatten<[XReaderURI]>>({
  ...Any,
  ...AssociativeFlatten
})

/**
 * The `Monad` instance for `Reader[-_, +_]`.
 */
export const Monad = P.instance<P.Monad<[XReaderURI]>>({
  ...Any,
  ...Covariant,
  ...AssociativeFlatten
})

/**
 * The `Applicative` instance for `Reader[-_, +_]`.
 */
export const Applicative = P.instance<P.Applicative<[XReaderURI]>>({
  ...Any,
  ...Covariant,
  ...AssociativeBoth
})

/**
 * Struct based applicative for Reader[-_, +_]
 */
export const sequenceS = DSL.sequenceSF(Applicative)

/**
 * Returns a computation that effectfully "peeks" at the success of this one.
 */
export const tap: <A, R1>(
  f: (a: A) => XReader<R1, any>
) => <R>(self: XReader<R, A>) => XReader<R & R1, A> = F.tap
