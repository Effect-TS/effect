import { makeAny } from "../_abstract/Any"
import { makeAssociativeBoth } from "../_abstract/AssociativeBoth"
import { makeAssociativeFlatten } from "../_abstract/AssociativeFlatten"
import { makeCovariant } from "../_abstract/Covariant"
import { makeIdentityFlatten } from "../_abstract/IdentityFlatten"
import { makeMonad } from "../_abstract/Monad"
import { Generic, genericDef } from "../_abstract/Newtype"
import { tuple } from "../_system/Function"

export const Id = genericDef("@newtype/Id")

export interface Id<A> extends Generic<A, typeof Id> {}

export const IdURI = Id.URI
export type IdURI = typeof IdURI

declare module "../_abstract/HKT" {
  interface URItoKind<K, NK extends string, SI, SO, X, I, S, Env, Err, Out> {
    [IdURI]: Id<Out>
  }
}

/**
 * Zips A & B into [A, B]
 */
export function both<B>(fb: Id<B>) {
  return <A>(fa: Id<A>): Id<readonly [A, B]> =>
    Id.wrap(tuple(Id.unwrap(fa), Id.unwrap(fb)))
}

/**
 * The `AssociativeBoth` instance for `Id`.
 */
export const AssociativeBoth = makeAssociativeBoth(IdURI)({
  both
})

/**
 * Flatten Id<Id<A>> => Id<A>
 */
export function flatten<A>(ffa: Id<Id<A>>) {
  return Id.unwrap(ffa)
}

/**
 * The `AssociativeFlatten` instance for `Id`.
 */
export const AssociativeFlatten = makeAssociativeFlatten(IdURI)({
  flatten
})

/**
 * The `Any` instance for `Id`.
 */
export const Any = makeAny(IdURI)({
  any: () => Id.wrap({})
})

/**
 * Apply f: A => B to Id<A> getting Id<B>
 */
export function map<A, B>(f: (a: A) => B): (fa: Id<A>) => Id<B> {
  return (fa) => Id.wrap(f(Id.unwrap(fa)))
}

/**
 * The `Covariant` instance for `Id`.
 */
export const Covariant = makeCovariant(IdURI)({
  map
})

/**
 * The `IdentityFlatten` instance for `Id`.
 */
export const IdentityFlatten = makeIdentityFlatten(IdURI)({
  ...Any,
  ...AssociativeFlatten
})

/**
 * The `Monad` instance for `Id`.
 */
export const Monad = makeMonad(IdURI)({
  ...Any,
  ...Covariant,
  ...AssociativeFlatten
})
