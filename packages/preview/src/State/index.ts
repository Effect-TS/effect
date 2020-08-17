import { intersect } from "../Utils"
import { AnyK } from "../_abstract/Any"
import { ApplicativeK } from "../_abstract/Applicative"
import { AssociativeBothK } from "../_abstract/AssociativeBoth"
import { AssociativeFlattenK } from "../_abstract/AssociativeFlatten"
import { CovariantK } from "../_abstract/Covariant"
import { bindF, doF, sequenceSF } from "../_abstract/DSL"
import { instance } from "../_abstract/HKT"
import { IdentityFlattenK } from "../_abstract/IdentityFlatten"
import { MonadK } from "../_abstract/Monad"
import * as F from "../_system/XPure"

//
// Module
//

export interface State<S, A> extends F.XPure<S, S, unknown, never, A> {}

export const StateURI = "State"
export type StateURI = typeof StateURI

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
    [StateURI]: State<S, Out>
  }
}

//
// API
//

/**
 * Combines this computation with the specified computation.
 */
export const zip: <S, B>(
  fb: State<S, B>
) => <A>(fa: State<S, A>) => State<S, readonly [A, B]> = F.zip

/**
 * Extends this computation with another computation that depends on the
 * result of this computation by running the first computation, using its
 * result to generate a second computation, and running that computation.
 */
export const chain: <S, A, B>(
  f: (a: A) => State<S, B>
) => (self: State<S, A>) => State<S, B> = F.chain

/**
 * `map` can be used to turn functions `(a: A) => B` into functions `(fa: F<A>) => F<B>`
 *  whose argument and return types use the type constructor `F` to represent
 *  some computational context.
 */
export const map: <A, B>(f: (a: A) => B) => <S>(self: State<S, A>) => State<S, B> =
  F.map

/**
 * Succeed with a value A
 */
export const succeed: <S, A>(a: A) => State<S, A> = (a) => F.succeed(() => a)

/**
 * Run the computation with input S returning updated state and output
 */
export const run = <S>(r: S) => <A>(self: State<S, A>): readonly [S, A] =>
  F.runStateResult(r)(self)

/**
 * Run the computation with input S returning the updated state and discarding the output
 */
export const runState = <S>(r: S) => <A>(self: State<S, A>): S => F.runState(r)(self)

/**
 * Run the computation with input S returning the state and discarding the updated state
 */
export const runResult = <S>(r: S) => <A>(self: State<S, A>): A => F.runResult(r)(self)

//
// Instances
//

/**
 * The `Any` instance for `State[_, +_]`.
 */
export const Any = instance<AnyK<StateURI>>({
  any: () => F.succeed(() => ({}))
})

/**
 * The `Covariant` instance for `State[_, +_]`.
 */
export const Covariant = instance<CovariantK<StateURI>>({
  map
})

/**
 * The `AssociativeBoth` instance for `State[_, +_]`.
 */
export const AssociativeBoth = instance<AssociativeBothK<StateURI>>({
  both: zip
})

/**
 * The `AssociativeFlatten` instance for `State[_, +_]`.
 */
export const AssociativeFlatten = instance<AssociativeFlattenK<StateURI>>({
  flatten: (ffa) => F.chain_(ffa, (x) => x)
})

/**
 * The `IdentityFlatten` instance for `State[_, +_]`.
 */
export const IdentityFlatten = instance<IdentityFlattenK<StateURI>>(
  intersect(Any, AssociativeFlatten)
)

/**
 * The `Monad` instance for `State[_, +_]`.
 */
export const Monad = instance<MonadK<StateURI>>(
  intersect(Any, Covariant, AssociativeFlatten)
)

/**
 * The `Applicative` instance for `State[_, +_]`.
 */
export const Applicative = instance<ApplicativeK<StateURI>>(
  intersect(Any, Covariant, AssociativeBoth)
)
/**
 * Struct based applicative for State[_, +_]
 */
export const sequenceS = sequenceSF(Applicative)

/**
 * Returns a computation that effectfully "peeks" at the success of this one.
 */
export const tap: <A, R>(
  f: (a: A) => State<R, any>
) => (self: State<R, A>) => State<R, A> = F.tap

/**
 * Begin `do` pipe: pipe(of(), bind("a", () => ...))
 */
export const of = doF(Monad)

/**
 * Monadically bind a variable in a pipeable `do` context
 */
export const bind = bindF(Monad)
