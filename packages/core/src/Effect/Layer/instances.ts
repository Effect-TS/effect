import * as T from "@effect-ts/system/Effect"
import * as L from "@effect-ts/system/Layer"

import * as P from "../../Prelude"

export const LayerURI = "Layer"
export type LayerURI = typeof LayerURI

declare module "@effect-ts/hkt" {
  interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
    [LayerURI]: L.Layer<R, E, A>
  }
}

export type V = P.V<"R", "-"> & P.V<"E", "+">

export const AssociativeBoth = P.instance<P.AssociativeBoth<[LayerURI], V>>({
  both: L.zip
})

export const Any = P.instance<P.Any<[LayerURI], V>>({
  any: () => L.fromRawEffect(T.succeed({}))
})

export const Covariant = P.instance<P.Covariant<[LayerURI], V>>({
  map: L.map
})

export const IdentityBoth = P.instance<P.IdentityBoth<[LayerURI], V>>({
  ...Any,
  ...AssociativeBoth
})

export const Applicative = P.instance<P.Applicative<[LayerURI], V>>({
  ...Covariant,
  ...IdentityBoth
})

export const AssociativeFlatten = P.instance<P.AssociativeFlatten<[LayerURI], V>>({
  flatten: L.flatten
})

export const IdentityFlatten = P.instance<P.IdentityFlatten<[LayerURI], V>>({
  ...Any,
  ...AssociativeFlatten
})

export const Monad = P.instance<P.Monad<[LayerURI], V>>({
  ...Covariant,
  ...IdentityFlatten
})
