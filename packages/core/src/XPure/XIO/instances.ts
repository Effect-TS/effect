// ets_tracing: off

import * as F from "@effect-ts/system/XPure"

import type { XIOURI } from "../../Modules/index.js"
import type { URI } from "../../Prelude/index.js"
import * as P from "../../Prelude/index.js"
import { map, zip } from "./operations.js"

/**
 * The `Any` instance for `IO[+_]`.
 */
export const Any = P.instance<P.Any<[URI<XIOURI>]>>({
  any: () => F.succeed(() => ({}))
})

/**
 * The `Covariant` instance for `IO[+_]`.
 */
export const Covariant = P.instance<P.Covariant<[URI<XIOURI>]>>({
  map
})

/**
 * The `AssociativeBoth` instance for `IO[+_]`.
 */
export const AssociativeBoth = P.instance<P.AssociativeBoth<[URI<XIOURI>]>>({
  both: zip
})

/**
 * The `AssociativeFlatten` instance for `IO[+_]`.
 */
export const AssociativeFlatten = P.instance<P.AssociativeFlatten<[URI<XIOURI>]>>({
  flatten: (ffa) => F.chain_(ffa, (x) => x)
})

/**
 * The `IdentityFlatten` instance for `IO[+_]`.
 */
export const IdentityFlatten = P.instance<P.IdentityFlatten<[URI<XIOURI>]>>({
  ...Any,
  ...AssociativeFlatten
})

/**
 * The `Monad` instance for `IO[+_]`.
 */
export const Monad = P.instance<P.Monad<[URI<XIOURI>]>>({
  ...Any,
  ...Covariant,
  ...AssociativeFlatten
})

/**
 * The `Applicative` instance for `IO[+_]`.
 */
export const Applicative = P.instance<P.Applicative<[URI<XIOURI>]>>({
  ...Any,
  ...Covariant,
  ...AssociativeBoth
})
