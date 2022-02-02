// ets_tracing: off

import * as F from "@effect-ts/system/IO"

import type { IOURI } from "../Modules/index.js"
import type { URI } from "../Prelude/index.js"
import * as P from "../Prelude/index.js"

/**
 * The `Any` instance for `IO[+_]`.
 */
export const Any = P.instance<P.Any<[URI<IOURI>]>>({
  any: () => F.succeed({})
})

/**
 * The `Covariant` instance for `IO[+_]`.
 */
export const Covariant = P.instance<P.Covariant<[URI<IOURI>]>>({
  map: F.map
})

/**
 * The `AssociativeBoth` instance for `IO[+_]`.
 */
export const AssociativeBoth = P.instance<P.AssociativeBoth<[URI<IOURI>]>>({
  both: F.zip
})

/**
 * The `AssociativeFlatten` instance for `IO[+_]`.
 */
export const AssociativeFlatten = P.instance<P.AssociativeFlatten<[URI<IOURI>]>>({
  flatten: (ffa) => F.chain_(ffa, (x) => x)
})

/**
 * The `IdentityFlatten` instance for `IO[+_]`.
 */
export const IdentityFlatten = P.instance<P.IdentityFlatten<[URI<IOURI>]>>({
  ...Any,
  ...AssociativeFlatten
})

/**
 * The `Monad` instance for `IO[+_]`.
 */
export const Monad = P.instance<P.Monad<[URI<IOURI>]>>({
  ...Any,
  ...Covariant,
  ...AssociativeFlatten
})

/**
 * The `Applicative` instance for `IO[+_]`.
 */
export const Applicative = P.instance<P.Applicative<[URI<IOURI>]>>({
  ...Any,
  ...Covariant,
  ...AssociativeBoth
})
