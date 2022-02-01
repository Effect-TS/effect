// ets_tracing: off

import { constant } from "@effect-ts/system/Function"
import * as F from "@effect-ts/system/XPure"

import type { XStateURI } from "../../Modules/index.js"
import type { URI } from "../../Prelude/index.js"
import * as P from "../../Prelude/index.js"
import type { V } from "./definition.js"
import { map, zip } from "./operations.js"

/**
 * The `Any` instance for `Reader[-_, +_]`.
 */
export const Any = P.instance<P.Any<[URI<XStateURI>], V>>({
  any: () => F.succeed(constant({}))
})

/**
 * The `Covariant` instance for `Reader[-_, +_]`.
 */
export const Covariant = P.instance<P.Covariant<[URI<XStateURI>], V>>({
  map
})

/**
 * The `AssociativeBoth` instance for `Reader[-_, +_]`.
 */
export const AssociativeBoth = P.instance<P.AssociativeBoth<[URI<XStateURI>], V>>({
  both: zip
})

/**
 * The `AssociativeFlatten` instance for `Reader[-_, +_]`.
 */
export const AssociativeFlatten = P.instance<P.AssociativeFlatten<[URI<XStateURI>], V>>(
  {
    flatten: (ffa) => F.chain_(ffa, (x) => x)
  }
)

/**
 * The `IdentityFlatten` instance for `Reader[-_, +_]`.
 */
export const IdentityFlatten = P.instance<P.IdentityFlatten<[URI<XStateURI>], V>>({
  ...Any,
  ...AssociativeFlatten
})

/**
 * The `Monad` instance for `Reader[-_, +_]`.
 */
export const Monad = P.instance<P.Monad<[URI<XStateURI>], V>>({
  ...Any,
  ...Covariant,
  ...AssociativeFlatten
})

/**
 * The `Applicative` instance for `Reader[-_, +_]`.
 */
export const Applicative = P.instance<P.Applicative<[URI<XStateURI>], V>>({
  ...Any,
  ...Covariant,
  ...AssociativeBoth
})
