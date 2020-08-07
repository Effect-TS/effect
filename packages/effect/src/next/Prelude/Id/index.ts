import { tuple } from "../../../Function"
import { Generic, genericDef } from "../Newtype"
import { Any1, makeAny } from "../abstract/Any"
import { makeAssociativeBoth } from "../abstract/AssociativeBoth"
import { makeAssociativeFlatten } from "../abstract/AssociativeFlatten"
import { makeCovariant } from "../abstract/Covariant"
import { makeIdentityFlatten } from "../abstract/IdentityFlatten"
import { makeMonad } from "../abstract/Monad"

export const Id = genericDef("@newtype/Id")

export interface Id<A> extends Generic<A, typeof Id> {}

export const IdURI = Id.URI
export type IdURI = typeof IdURI

declare module "../abstract/HKT" {
  interface URItoKind<Out> {
    [IdURI]: Id<Out>
  }
}

/**
 * Zips A & B into [A, B]
 */
export function both<B>(fb: Id<B>) {
  return <A>(fa: Id<A>): Id<[A, B]> => Id.wrap(tuple(Id.unwrap(fa), Id.unwrap(fb)))
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
export const Any: Any1<IdURI> = makeAny(IdURI)({
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
