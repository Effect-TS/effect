import { intersect } from "../Utils"
import { makeAny } from "../_abstract/Any"
import { makeApplicative } from "../_abstract/Applicative"
import { makeAssociativeBoth } from "../_abstract/AssociativeBoth"
import { makeAssociativeFlatten } from "../_abstract/AssociativeFlatten"
import { makeCovariant } from "../_abstract/Covariant"
import { bindF, doF, sequenceSF } from "../_abstract/DSL"
import { makeAccess } from "../_abstract/FX/Access"
import { makeEnvironmental } from "../_abstract/FX/Environmental"
import { makeIdentityFlatten } from "../_abstract/IdentityFlatten"
import { makeMonad } from "../_abstract/Monad"
import * as F from "../_system/XPure"

//
// Module
//

export interface Reader<R, A> extends F.XPure<unknown, unknown, R, never, A> {}

export const ReaderURI = "Reader"
export type ReaderURI = typeof ReaderURI

declare module "../_abstract/HKT" {
  interface URItoKind<K, NK extends string, SI, SO, X, I, S, Env, Err, Out> {
    [ReaderURI]: Reader<Env, Out>
  }
}

//
// API
//

/**
 * Reads the current context
 */
export const environment = <R>(): Reader<R, R> => F.environment<R>()()

/**
 * Projects a value from the global context in a Reader
 */
export const access: <R, A>(f: (r: R) => A) => Reader<R, A> = F.access

/**
 * Changes the value of the local context during the execution of the action `ma`
 */
export const provideSome: <Q, R>(
  f: (d: Q) => R
) => <A>(ma: Reader<R, A>) => Reader<Q, A> = F.provideSome

/**
 * Combines this computation with the specified computation.
 */
export const zip: <R1, B>(
  fb: Reader<R1, B>
) => <R, A>(fa: Reader<R, A>) => Reader<R & R1, readonly [A, B]> = F.zip

/**
 * Extends this computation with another computation that depends on the
 * result of this computation by running the first computation, using its
 * result to generate a second computation, and running that computation.
 */
export const chain: <A, R1, B>(
  f: (a: A) => Reader<R1, B>
) => <R>(self: Reader<R, A>) => Reader<R & R1, B> = F.chain

/**
 * `map` can be used to turn functions `(a: A) => B` into functions `(fa: F<A>) => F<B>`
 *  whose argument and return types use the type constructor `F` to represent
 *  some computational context.
 */
export const map: <A, B>(f: (a: A) => B) => <R>(self: Reader<R, A>) => Reader<R, B> =
  F.map

/**
 * Succeed with a value A
 */
export const succeed: <A>(a: A) => Reader<unknown, A> = (a) => F.succeed(() => a)

/**
 * Run the computation
 */
export const run = <A>(self: Reader<unknown, A>): A => F.runIO(self)

/**
 * Run the computation with environment R
 */
export const runEnv = <R>(r: R) => <A>(self: Reader<R, A>): A =>
  F.runIO(F.provideAll(r)(self))

//
// Instances
//

/**
 * The `Access` instance for `Reader[-_, +_]`.
 */
export const Access = makeAccess(ReaderURI)({
  access: F.access,
  provide: F.provideAll
})

/**
 * The `Any` instance for `Reader[-_, +_]`.
 */
export const Any = makeAny(ReaderURI)({
  any: () => F.succeed(() => ({}))
})

/**
 * The `Covariant` instance for `Reader[-_, +_]`.
 */
export const Covariant = makeCovariant(ReaderURI)({
  map
})

/**
 * The `AssociativeBoth` instance for `Reader[-_, +_]`.
 */
export const AssociativeBoth = makeAssociativeBoth(ReaderURI)({
  both: zip
})

/**
 * The `AssociativeFlatten` instance for `Reader[-_, +_]`.
 */
export const AssociativeFlatten = makeAssociativeFlatten(ReaderURI)({
  flatten: (ffa) => F.chain_(ffa, (x) => x)
})

/**
 * The `IdentityFlatten` instance for `Reader[-_, +_]`.
 */
export const IdentityFlatten = makeIdentityFlatten(ReaderURI)(
  intersect(Any, AssociativeFlatten)
)

/**
 * The `Monad` instance for `Reader[-_, +_]`.
 */
export const Monad = makeMonad(ReaderURI)(intersect(Any, Covariant, AssociativeFlatten))

/**
 * The `Applicative` instance for `Reader[-_, +_]`.
 */
export const Applicative = makeApplicative(ReaderURI)(
  intersect(Any, Covariant, AssociativeBoth)
)

/**
 * The `Environmental` instance for `Reader[-_, +_]`.
 */
export const Environmental = makeEnvironmental(ReaderURI)(intersect(Access, Monad))

/**
 * Struct based applicative for Reader[-_, +_]
 */
export const sequenceS = sequenceSF(Applicative)()

/**
 * Returns a computation that effectfully "peeks" at the success of this one.
 */
export const tap: <A, R1>(
  f: (a: A) => Reader<R1, any>
) => <R>(self: Reader<R, A>) => Reader<R & R1, A> = F.tap

/**
 * Begin `do` pipe: pipe(of(), bind("a", () => ...))
 */
export const of = doF(Monad)

/**
 * Monadically bind a variable in a pipeable `do` context
 */
export const bind = bindF(Monad)
