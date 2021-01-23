import * as F from "@effect-ts/system/XPure"

import type { XIOURI } from "../../Modules"
import * as P from "../../Prelude"
import { map, zip } from "./operations"

/**
 * The `Any` instance for `IO[+_]`.
 */
export const Any = P.instance<P.Any<[XIOURI]>>({
  any: () => F.succeed(() => ({}))
})

/**
 * The `Covariant` instance for `IO[+_]`.
 */
export const Covariant = P.instance<P.Covariant<[XIOURI]>>({
  map
})

/**
 * The `AssociativeBoth` instance for `IO[+_]`.
 */
export const AssociativeBoth = P.instance<P.AssociativeBoth<[XIOURI]>>({
  both: zip
})

/**
 * The `AssociativeFlatten` instance for `IO[+_]`.
 */
export const AssociativeFlatten = P.instance<P.AssociativeFlatten<[XIOURI]>>({
  flatten: (ffa) => F.chain_(ffa, (x) => x)
})

/**
 * The `IdentityFlatten` instance for `IO[+_]`.
 */
export const IdentityFlatten = P.instance<P.IdentityFlatten<[XIOURI]>>({
  ...Any,
  ...AssociativeFlatten
})

/**
 * The `Monad` instance for `IO[+_]`.
 */
export const Monad = P.instance<P.Monad<[XIOURI]>>({
  ...Any,
  ...Covariant,
  ...AssociativeFlatten
})

/**
 * The `Applicative` instance for `IO[+_]`.
 */
export const Applicative = P.instance<P.Applicative<[XIOURI]>>({
  ...Any,
  ...Covariant,
  ...AssociativeBoth
})
