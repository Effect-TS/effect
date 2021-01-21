import { constant } from "@effect-ts/system/Function"
import * as F from "@effect-ts/system/XPure"

import type { XStateURI } from "../../Modules"
import * as P from "../../Prelude"
import type { V } from "./definition"
import { map, zip } from "./operations"

/**
 * The `Any` instance for `Reader[-_, +_]`.
 */
export const Any = P.instance<P.Any<[XStateURI], V>>({
  any: () => F.succeed(constant({}))
})

/**
 * The `Covariant` instance for `Reader[-_, +_]`.
 */
export const Covariant = P.instance<P.Covariant<[XStateURI], V>>({
  map
})

/**
 * The `AssociativeBoth` instance for `Reader[-_, +_]`.
 */
export const AssociativeBoth = P.instance<P.AssociativeBoth<[XStateURI], V>>({
  both: zip
})

/**
 * The `AssociativeFlatten` instance for `Reader[-_, +_]`.
 */
export const AssociativeFlatten = P.instance<P.AssociativeFlatten<[XStateURI], V>>({
  flatten: (ffa) => F.chain_(ffa, (x) => x)
})

/**
 * The `IdentityFlatten` instance for `Reader[-_, +_]`.
 */
export const IdentityFlatten = P.instance<P.IdentityFlatten<[XStateURI], V>>({
  ...Any,
  ...AssociativeFlatten
})

/**
 * The `Monad` instance for `Reader[-_, +_]`.
 */
export const Monad = P.instance<P.Monad<[XStateURI], V>>({
  ...Any,
  ...Covariant,
  ...AssociativeFlatten
})

/**
 * The `Applicative` instance for `Reader[-_, +_]`.
 */
export const Applicative = P.instance<P.Applicative<[XStateURI], V>>({
  ...Any,
  ...Covariant,
  ...AssociativeBoth
})
