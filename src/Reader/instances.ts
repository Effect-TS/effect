import type { ReaderURI } from "../Modules"
import * as P from "../Prelude"
import { access, map, zip } from "./operations"

export type V = P.V<"R", "-">

/**
 * The `Access` instance for `Reader[-_, +_]`.
 */
export const Access = P.instance<P.FX.Access<[ReaderURI], V>>({
  access
})

/**
 * The `Any` instance for `Reader[-_, +_]`.
 */
export const Any = P.instance<P.Any<[ReaderURI], V>>({
  any: () => () => ({})
})

/**
 * The `Covariant` instance for `Reader[-_, +_]`.
 */
export const Covariant = P.instance<P.Covariant<[ReaderURI], V>>({
  map
})

/**
 * The `AssociativeBoth` instance for `Reader[-_, +_]`.
 */
export const AssociativeBoth = P.instance<P.AssociativeBoth<[ReaderURI], V>>({
  both: zip
})

/**
 * The `AssociativeFlatten` instance for `Reader[-_, +_]`.
 */
export const AssociativeFlatten = P.instance<P.AssociativeFlatten<[ReaderURI], V>>({
  flatten: (ffa) => (r) => ffa(r)(r)
})

/**
 * The `IdentityFlatten` instance for `Reader[-_, +_]`.
 */
export const IdentityFlatten = P.instance<P.IdentityFlatten<[ReaderURI], V>>({
  ...Any,
  ...AssociativeFlatten
})

/**
 * The `Monad` instance for `Reader[-_, +_]`.
 */
export const Monad = P.instance<P.Monad<[ReaderURI], V>>({
  ...Any,
  ...Covariant,
  ...AssociativeFlatten
})

/**
 * The `Applicative` instance for `Reader[-_, +_]`.
 */
export const Applicative = P.instance<P.Applicative<[ReaderURI], V>>({
  ...Any,
  ...Covariant,
  ...AssociativeBoth
})
