import * as F from "../Pure"
import { makeAny } from "../abstract/Any"
import { makeApplicative } from "../abstract/Applicative"
import { makeAssociativeBoth } from "../abstract/AssociativeBoth"
import { makeAssociativeFlatten } from "../abstract/AssociativeFlatten"
import { makeContravariant } from "../abstract/Contravariant"
import { makeCovariant } from "../abstract/Covariant"
import { makeEnvironmental } from "../abstract/Environmental"
import { makeMonad } from "../abstract/Monad"

//
// Module
//

export interface Reader<R, A> extends F.XPure<unknown, unknown, R, never, A> {}

export const ReaderURI = "Reader"
export type ReaderURI = typeof ReaderURI

export const ReaderEnvURI = "ReaderEnv"
export type ReaderEnvURI = typeof ReaderEnvURI

declare module "../abstract/HKT" {
  interface URItoKind2<E, A> {
    [ReaderURI]: Reader<E, A>
    [ReaderEnvURI]: Reader<A, E>
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
export const contramapEnv: <Q, R>(
  f: (d: Q) => R
) => <A>(ma: Reader<R, A>) => Reader<Q, A> = F.contramapEnv

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

//
// Instances
//

/**
 * The `Contravariant` instance for `Reader<x, A>`.
 */
export const ContravariantEnv = makeContravariant(ReaderEnvURI)({
  contramap: contramapEnv
})

/**
 * The `Environmental` instance for `Reader<R, A>`.
 */
export const Environmental = makeEnvironmental(ReaderURI)({
  access: F.access
})

/**
 * The `Any` instance for `Reader<R, x>`.
 */
export const Any = makeAny(ReaderURI)({
  any: () => F.succeed({})
})

/**
 * The `Covariant` instance for `Reader<R, x>`.
 */
export const Covariant = makeCovariant(ReaderURI)({
  map
})

/**
 * The `AssociativeBoth` instance for `Reader<R, x>`.
 */
export const AssociativeBoth = makeAssociativeBoth(ReaderURI)({
  both: zip
})

/**
 * The `AssociativeFlatten` instance for `Reader<R, x>`.
 */
export const AssociativeFlatten = makeAssociativeFlatten(ReaderURI)({
  flatten: (ffa) => F.chain_(ffa, (x) => x)
})

/**
 * The `Monad` instance for `Reader<R, x>`.
 */
export const Monad = makeMonad(ReaderURI)({
  ...Any,
  ...Covariant,
  ...AssociativeFlatten
})

/**
 * The `Monad` instance for `Reader<R, x>`.
 */
export const Applicative = makeApplicative(ReaderURI)({
  ...Any,
  ...Covariant,
  ...AssociativeBoth
})
