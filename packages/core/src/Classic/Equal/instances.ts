import type { EqualURI } from "../../Modules"
import * as P from "../../Prelude"
import { anyEqual, both, contramap, either, nothingEqual } from "./operations"

/**
 * The `AssociativeBoth` instance for `Equal`.
 */
export const AssociativeBoth = P.instance<P.AssociativeBoth<[EqualURI]>>({
  both
})

/**
 * The `AssociativeEither` instance for `Equal`.
 */
export const AssociativeEither = P.instance<P.AssociativeEither<[EqualURI]>>({
  either
})

/**
 * The `Contravariant` instance for `Equal`.
 */
export const Contravariant = P.instance<P.Contravariant<[EqualURI]>>({
  contramap
})

/**
 * The `Any` instance for `Equal`.
 */
export const Any = P.instance<P.Any<[EqualURI]>>({
  any: () => anyEqual
})

/**
 * The `IdentityBoth` instance for `Equal`.
 */
export const IdentityBoth = P.instance<P.IdentityBoth<[EqualURI]>>({
  ...Any,
  ...AssociativeBoth
})

/**
 * The `None` instance for `Equal`.
 */
export const None = P.instance<P.None<[EqualURI]>>({
  never: () => nothingEqual
})

/**
 * The `IdentityEither` instance for `Equal`.
 */
export const IdentityEither = P.instance<P.IdentityEither<[EqualURI]>>({
  ...None,
  ...AssociativeEither
})
