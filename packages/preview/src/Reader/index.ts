import { intersect } from "../Utils"
import { AnyK } from "../_abstract/Any"
import { ApplicativeK } from "../_abstract/Applicative"
import { AssociativeBothK } from "../_abstract/AssociativeBoth"
import { AssociativeFlattenK } from "../_abstract/AssociativeFlatten"
import { CovariantK } from "../_abstract/Covariant"
import { bindF, doF, sequenceSF } from "../_abstract/DSL"
import { accessServiceMF, provideServiceF } from "../_abstract/DSL/core"
import { AccessK } from "../_abstract/FX/Access"
import { EnvironmentalK } from "../_abstract/FX/Environmental"
import { instance } from "../_abstract/HKT"
import { IdentityFlattenK } from "../_abstract/IdentityFlatten"
import { MonadK } from "../_abstract/Monad"
import * as F from "../_system/XPure"

//
// Module
//

export interface Reader<R, A> extends F.XPure<unknown, unknown, R, never, A> {}

export const ReaderURI = "Reader"
export type ReaderURI = typeof ReaderURI

declare module "../_abstract/HKT" {
  interface URItoKind<
    TL0,
    TL1,
    TL2,
    TL3,
    K,
    NK extends string,
    SI,
    SO,
    X,
    I,
    S,
    Env,
    Err,
    Out
  > {
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
export const Access = instance<AccessK<ReaderURI>>({
  access: F.access,
  provide: F.provideAll
})

/**
 * The `Any` instance for `Reader[-_, +_]`.
 */
export const Any = instance<AnyK<ReaderURI>>({
  any: () => F.succeed(() => ({}))
})

/**
 * The `Covariant` instance for `Reader[-_, +_]`.
 */
export const Covariant = instance<CovariantK<ReaderURI>>({
  map
})

/**
 * The `AssociativeBoth` instance for `Reader[-_, +_]`.
 */
export const AssociativeBoth = instance<AssociativeBothK<ReaderURI>>({
  both: zip
})

/**
 * The `AssociativeFlatten` instance for `Reader[-_, +_]`.
 */
export const AssociativeFlatten = instance<AssociativeFlattenK<ReaderURI>>({
  flatten: (ffa) => F.chain_(ffa, (x) => x)
})

/**
 * The `IdentityFlatten` instance for `Reader[-_, +_]`.
 */
export const IdentityFlatten = instance<IdentityFlattenK<ReaderURI>>(
  intersect(Any, AssociativeFlatten)
)

/**
 * The `Monad` instance for `Reader[-_, +_]`.
 */
export const Monad = instance<MonadK<ReaderURI>>(
  intersect(Any, Covariant, AssociativeFlatten)
)

/**
 * The `Applicative` instance for `Reader[-_, +_]`.
 */
export const Applicative = instance<ApplicativeK<ReaderURI>>(
  intersect(Any, Covariant, AssociativeBoth)
)

/**
 * The `Environmental` instance for `Reader[-_, +_]`.
 */
export const Environmental = instance<EnvironmentalK<ReaderURI>>(
  intersect(Access, Monad)
)

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

/**
 * Provides a service in environment
 */
export const provideService = provideServiceF(Environmental)

/**
 * Access a service in environment monadically
 */
export const accessServiceM = accessServiceMF(Environmental)
