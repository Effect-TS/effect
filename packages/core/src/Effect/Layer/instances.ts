// ets_tracing: off

import * as T from "@effect-ts/system/Effect"
import * as L from "@effect-ts/system/Layer"

import * as P from "../../Prelude/index.js"

export interface LayerF extends P.HKT {
  readonly type: L.Layer<this["R"], this["E"], this["A"]>
}

export const AssociativeBoth = P.instance<P.AssociativeBoth<LayerF>>({
  both: L.zip
})

export const Any = P.instance<P.Any<LayerF>>({
  any: () => L.fromRawEffect(T.succeed({}))
})

export const Covariant = P.instance<P.Covariant<LayerF>>({
  map: L.map
})

export const IdentityBoth = P.instance<P.IdentityBoth<LayerF>>({
  ...Any,
  ...AssociativeBoth
})

export const Applicative = P.instance<P.Applicative<LayerF>>({
  ...Covariant,
  ...IdentityBoth
})

export const AssociativeFlatten = P.instance<P.AssociativeFlatten<LayerF>>({
  flatten: L.flatten
})

export const IdentityFlatten = P.instance<P.IdentityFlatten<LayerF>>({
  ...Any,
  ...AssociativeFlatten
})

export const Monad = P.instance<P.Monad<LayerF>>({
  ...Covariant,
  ...IdentityFlatten
})
