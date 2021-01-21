import * as F from "@effect-ts/system/XPure"

import type { XReaderURI } from "../../Modules"
import * as P from "../../Prelude"
import { map, zip } from "./operations"

/**
 * The `Access` instance for `Reader[-_, +_]`.
 */
export const Access = P.instance<P.FX.Access<[XReaderURI]>>({
  access: F.access
})

/**
 * The `Any` instance for `Reader[-_, +_]`.
 */
export const Any = P.instance<P.Any<[XReaderURI]>>({
  any: () => F.succeed(() => ({}))
})

/**
 * The `Covariant` instance for `Reader[-_, +_]`.
 */
export const Covariant = P.instance<P.Covariant<[XReaderURI]>>({
  map
})

/**
 * The `AssociativeBoth` instance for `Reader[-_, +_]`.
 */
export const AssociativeBoth = P.instance<P.AssociativeBoth<[XReaderURI]>>({
  both: zip
})

/**
 * The `AssociativeFlatten` instance for `Reader[-_, +_]`.
 */
export const AssociativeFlatten = P.instance<P.AssociativeFlatten<[XReaderURI]>>({
  flatten: (ffa) => F.chain_(ffa, (x) => x)
})

/**
 * The `IdentityFlatten` instance for `Reader[-_, +_]`.
 */
export const IdentityFlatten = P.instance<P.IdentityFlatten<[XReaderURI]>>({
  ...Any,
  ...AssociativeFlatten
})

/**
 * The `Monad` instance for `Reader[-_, +_]`.
 */
export const Monad = P.instance<P.Monad<[XReaderURI]>>({
  ...Any,
  ...Covariant,
  ...AssociativeFlatten
})

/**
 * The `Applicative` instance for `Reader[-_, +_]`.
 */
export const Applicative = P.instance<P.Applicative<[XReaderURI]>>({
  ...Any,
  ...Covariant,
  ...AssociativeBoth
})
