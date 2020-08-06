import { Any1 } from "../Any"
import { AssociativeBoth1 } from "../AssociativeBoth"
import { AssociativeFlatten1 } from "../AssociativeFlatten"
import { Covariant1 } from "../Covariant"
import { IdentityFlatten1 } from "../IdentityFlatten"
import { Monad1 } from "../Monad"
import { Generic, genericDef } from "../Newtype"

export const Id = genericDef("@newtype/Id")

export interface Id<A> extends Generic<A, typeof Id> {}

export const URI = "Id"
export type URI = typeof URI

declare module "../HKT" {
  interface URItoKind<A> {
    [URI]: Id<A>
  }
}

/**
 * The `AssociativeBoth` instance for `Id`.
 */
export const AssociativeBoth: AssociativeBoth1<URI> = {
  URI,
  both: <B>(fb: Id<B>) => <A>(fa: Id<A>) => Id.wrap([Id.unwrap(fa), Id.unwrap(fb)])
}

/**
 * The `AssociativeFlatten` instance for `Id`.
 */
export const AssociativeFlatten: AssociativeFlatten1<URI> = {
  URI,
  flatten: (ffa) => Id.unwrap(ffa)
}

/**
 * The `Any` instance for `Id`.
 */
export const Any: Any1<URI> = {
  URI,
  any: () => Id.wrap({})
}

/**
 * The `Covariant` instance for `Id`.
 */
export const Covariant: Covariant1<URI> = {
  URI,
  map: (f) => (fa) => Id.wrap(f(Id.unwrap(fa)))
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
