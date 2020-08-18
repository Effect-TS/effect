import { AnyK } from "../_abstract/Any"
import { AssociativeBothK } from "../_abstract/AssociativeBoth"
import { AssociativeFlattenK } from "../_abstract/AssociativeFlatten"
import { CovariantK } from "../_abstract/Covariant"
import { instance } from "../_abstract/HKT"
import { IdentityFlattenK } from "../_abstract/IdentityFlatten"
import { MonadK } from "../_abstract/Monad"
import { Generic, genericDef } from "../_abstract/Newtype"
import { tuple } from "../_system/Function"

export const Id = genericDef("@newtype/Id")

export interface Id<A> extends Generic<A, typeof Id> {}

export const IdURI = Id.URI
export type IdURI = typeof IdURI

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
export const AssociativeBoth = instance<AssociativeBothK<IdURI>>({
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
export const AssociativeFlatten = instance<AssociativeFlattenK<IdURI>>({
  flatten
})

/**
 * The `Any` instance for `Id`.
 */
export const Any = instance<AnyK<IdURI>>({
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
export const Covariant = instance<CovariantK<IdURI>>({
  map
})

/**
 * The `IdentityFlatten` instance for `Id`.
 */
export const IdentityFlatten = instance<IdentityFlattenK<IdURI>>({
  ...Any,
  ...AssociativeFlatten
})

/**
 * The `Monad` instance for `Id`.
 */
export const Monad = instance<MonadK<IdURI>>({
  ...Any,
  ...Covariant,
  ...AssociativeFlatten
})
