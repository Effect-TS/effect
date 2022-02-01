// ets_tracing: off

import type { ReaderURI } from "../Modules/index.js"
import type { URI } from "../Prelude/index.js"
import * as P from "../Prelude/index.js"
import { access, map, zip } from "./operations.js"

export type V = P.V<"R", "-">

/**
 * The `Access` instance for `Reader[-_, +_]`.
 */
export const Access = P.instance<P.FX.Access<[URI<ReaderURI>], V>>({
  access
})

/**
 * The `Any` instance for `Reader[-_, +_]`.
 */
export const Any = P.instance<P.Any<[URI<ReaderURI>], V>>({
  any: () => () => ({})
})

/**
 * The `Covariant` instance for `Reader[-_, +_]`.
 */
export const Covariant = P.instance<P.Covariant<[URI<ReaderURI>], V>>({
  map
})

/**
 * The `AssociativeBoth` instance for `Reader[-_, +_]`.
 */
export const AssociativeBoth = P.instance<P.AssociativeBoth<[URI<ReaderURI>], V>>({
  both: zip
})

/**
 * The `AssociativeFlatten` instance for `Reader[-_, +_]`.
 */
export const AssociativeFlatten = P.instance<P.AssociativeFlatten<[URI<ReaderURI>], V>>(
  {
    flatten: (ffa) => (r) => ffa(r)(r)
  }
)

/**
 * The `IdentityFlatten` instance for `Reader[-_, +_]`.
 */
export const IdentityFlatten = P.instance<P.IdentityFlatten<[URI<ReaderURI>], V>>({
  ...Any,
  ...AssociativeFlatten
})

/**
 * The `Monad` instance for `Reader[-_, +_]`.
 */
export const Monad = P.instance<P.Monad<[URI<ReaderURI>], V>>({
  ...Any,
  ...Covariant,
  ...AssociativeFlatten
})

/**
 * The `Applicative` instance for `Reader[-_, +_]`.
 */
export const Applicative = P.instance<P.Applicative<[URI<ReaderURI>], V>>({
  ...Any,
  ...Covariant,
  ...AssociativeBoth
})
