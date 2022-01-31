// ets_tracing: off

import * as T from "@effect-ts/system/Effect"
import * as L from "@effect-ts/system/Layer"

import type { LayerURI } from "../../Modules/index.js"
import type { URI } from "../../Prelude/index.js"
import * as P from "../../Prelude/index.js"

export type V = P.V<"R", "-"> & P.V<"E", "+">

export const AssociativeBoth = P.instance<P.AssociativeBoth<[URI<LayerURI>], V>>({
  both: L.zip
})

export const Any = P.instance<P.Any<[URI<LayerURI>], V>>({
  any: () => L.fromRawEffect(T.succeed({}))
})

export const Covariant = P.instance<P.Covariant<[URI<LayerURI>], V>>({
  map: L.map
})

export const IdentityBoth = P.instance<P.IdentityBoth<[URI<LayerURI>], V>>({
  ...Any,
  ...AssociativeBoth
})

export const Applicative = P.instance<P.Applicative<[URI<LayerURI>], V>>({
  ...Covariant,
  ...IdentityBoth
})

export const AssociativeFlatten = P.instance<P.AssociativeFlatten<[URI<LayerURI>], V>>({
  flatten: L.flatten
})

export const IdentityFlatten = P.instance<P.IdentityFlatten<[URI<LayerURI>], V>>({
  ...Any,
  ...AssociativeFlatten
})

export const Monad = P.instance<P.Monad<[URI<LayerURI>], V>>({
  ...Covariant,
  ...IdentityFlatten
})
