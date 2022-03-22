// ets_tracing: off

import * as F from "@effect-ts/system/XPure"

import * as P from "../../PreludeV2/index.js"
import type { XIOF } from "./definition.js"
import { map, zip } from "./operations.js"

/**
 * The `Any` instance for `IO[+_]`.
 */
export const Any = P.instance<P.Any<XIOF>>({
  any: () => F.succeed(() => ({}))
})

/**
 * The `Covariant` instance for `IO[+_]`.
 */
export const Covariant = P.instance<P.Covariant<XIOF>>({
  map
})

/**
 * The `AssociativeBoth` instance for `IO[+_]`.
 */
export const AssociativeBoth = P.instance<P.AssociativeBoth<XIOF>>({
  both: zip
})

/**
 * The `AssociativeFlatten` instance for `IO[+_]`.
 */
export const AssociativeFlatten = P.instance<P.AssociativeFlatten<XIOF>>({
  flatten: (ffa) => F.chain_(ffa, (x) => x)
})

/**
 * The `IdentityFlatten` instance for `IO[+_]`.
 */
export const IdentityFlatten = P.instance<P.IdentityFlatten<XIOF>>({
  ...Any,
  ...AssociativeFlatten
})

/**
 * The `Monad` instance for `IO[+_]`.
 */
export const Monad = P.instance<P.Monad<XIOF>>({
  ...Any,
  ...Covariant,
  ...AssociativeFlatten
})

/**
 * The `Applicative` instance for `IO[+_]`.
 */
export const Applicative = P.instance<P.Applicative<XIOF>>({
  ...Any,
  ...Covariant,
  ...AssociativeBoth
})
