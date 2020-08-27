import { identity, tuple } from "../../Function"
import type { ReaderURI } from "../../Modules"
import * as P from "../../Prelude"
import * as DSL from "../../Prelude/DSL"

export { ReaderURI } from "../../Modules"

export type Reader<R, A> = (r: R) => A

/**
 * Lift a sync (non failable) computation
 */
export const sync: <A>(f: () => A) => Reader<unknown, A> = identity

/**
 * Reads the current context
 */
export const environment = <R>(): Reader<R, R> => identity

/**
 * Projects a value from the global context in a Reader
 */
export const access: <R, A>(f: (r: R) => A) => Reader<R, A> = identity

/**
 * Changes the value of the local context during the execution of the action `ma`
 */
export const provideSome: <Q, R>(
  f: (d: Q) => R
) => <A>(ma: Reader<R, A>) => Reader<Q, A> = (f) => (ma) => (r) => ma(f(r))

/**
 * Combines this computation with the specified computation.
 */
export const zip: <R1, B>(
  fb: Reader<R1, B>
) => <R, A>(fa: Reader<R, A>) => Reader<R & R1, readonly [A, B]> = (fb) => (fa) => (
  r
) => tuple(fa(r), fb(r))

/**
 * Extends this computation with another computation that depends on the
 * result of this computation by running the first computation, using its
 * result to generate a second computation, and running that computation.
 */
export const chain: <A, R1, B>(
  f: (a: A) => Reader<R1, B>
) => <R>(self: Reader<R, A>) => Reader<R & R1, B> = (f) => (fa) => (r) => f(fa(r))(r)

/**
 * `map` can be used to turn functions `(a: A) => B` into functions `(fa: F<A>) => F<B>`
 *  whose argument and return types use the type constructor `F` to represent
 *  some computational context.
 */
export const map: <A, B>(f: (a: A) => B) => <R>(self: Reader<R, A>) => Reader<R, B> = (
  f
) => (fa) => (r) => f(fa(r))

/**
 * Succeed with a value A
 */
export const succeed: <A>(a: A) => Reader<unknown, A> = (a) => () => a

/**
 * Run the computation
 */
export const run = <A>(self: Reader<unknown, A>): A => self({})

/**
 * Run the computation with environment R
 */
export const runEnv = <R>(r: R) => <A>(self: Reader<R, A>): A => self(r)

//
// Instances
//

/**
 * The `Access` instance for `Reader[-_, +_]`.
 */
export const Access = P.instance<P.FX.Access<[ReaderURI]>>({
  access
})

/**
 * The `Any` instance for `Reader[-_, +_]`.
 */
export const Any = P.instance<P.Any<[ReaderURI]>>({
  any: () => () => ({})
})

/**
 * The `Covariant` instance for `Reader[-_, +_]`.
 */
export const Covariant = P.instance<P.Covariant<[ReaderURI]>>({
  map
})

/**
 * The `AssociativeBoth` instance for `Reader[-_, +_]`.
 */
export const AssociativeBoth = P.instance<P.AssociativeBoth<[ReaderURI]>>({
  both: zip
})

/**
 * The `AssociativeFlatten` instance for `Reader[-_, +_]`.
 */
export const AssociativeFlatten = P.instance<P.AssociativeFlatten<[ReaderURI]>>({
  flatten: (ffa) => (r) => ffa(r)(r)
})

/**
 * The `IdentityFlatten` instance for `Reader[-_, +_]`.
 */
export const IdentityFlatten = P.instance<P.IdentityFlatten<[ReaderURI]>>({
  ...Any,
  ...AssociativeFlatten
})

/**
 * The `Monad` instance for `Reader[-_, +_]`.
 */
export const Monad = P.instance<P.Monad<[ReaderURI]>>({
  ...Any,
  ...Covariant,
  ...AssociativeFlatten
})

/**
 * The `Applicative` instance for `Reader[-_, +_]`.
 */
export const Applicative = P.instance<P.Applicative<[ReaderURI]>>({
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
export const tap: <A, R1>(
  f: (a: A) => Reader<R1, any>
) => <R>(self: Reader<R, A>) => Reader<R & R1, A> = (f) => (fa) => (r) => {
  const x = fa(r)
  f(x)(r)
  return x
}
