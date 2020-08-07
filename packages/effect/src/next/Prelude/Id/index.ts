import { tuple } from "../../../Function"
import { Generic, genericDef } from "../Newtype"
import { Any1 } from "../abstract/Any"
import { AssociativeBoth1 } from "../abstract/AssociativeBoth"
import { AssociativeFlatten1 } from "../abstract/AssociativeFlatten"
import { Covariant1 } from "../abstract/Covariant"
import { IdentityFlatten1 } from "../abstract/IdentityFlatten"
import { Monad1 } from "../abstract/Monad"

export const Id = genericDef("@newtype/Id")

export interface Id<A> extends Generic<A, typeof Id> {}

export const URI = Id.URI
export type URI = typeof URI

declare module "../abstract/HKT" {
  interface URItoKind<A> {
    [URI]: Id<A>
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
export const AssociativeBoth: AssociativeBoth1<URI> = {
  URI,
  both
}

/**
 * Flatten Id<Id<A>> => Id<A>
 */
export function flatten<A>(ffa: Id<Id<A>>) {
  return Id.unwrap(ffa)
}

/**
 * The `AssociativeFlatten` instance for `Id`.
 */
export const AssociativeFlatten: AssociativeFlatten1<URI> = {
  URI,
  flatten
}

/**
 * The `Any` instance for `Id`.
 */
export const Any: Any1<URI> = {
  URI,
  any: () => Id.wrap({})
}

/**
 * Apply f: A => B to Id<A> getting Id<B>
 */
export function map<A, B>(f: (a: A) => B): (fa: Id<A>) => Id<B> {
  return (fa) => Id.wrap(f(Id.unwrap(fa)))
}

/**
 * The `Covariant` instance for `Id`.
 */
export const Covariant: Covariant1<URI> = {
  URI,
  map
}

/**
 * The `IdentityFlatten` instance for `Id`.
 */
export const IdentityFlatten: IdentityFlatten1<URI> = {
  ...Any,
  ...AssociativeFlatten
}

/**
 * The `Monad` instance for `Id`.
 */
export const Monad: Monad1<URI> = {
  ...Any,
  ...Covariant,
  ...AssociativeFlatten
}
