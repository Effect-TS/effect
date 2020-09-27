import * as T from "@effect-ts/system/Effect"
import * as L from "@effect-ts/system/Layer"
import * as M from "@effect-ts/system/Managed"

import type { LayerURI } from "../../Modules"
import * as P from "../../Prelude"

export type V = P.V<"S", "+"> & P.V<"R", "-"> & P.V<"E", "+">

export const AssociativeBoth = P.instance<P.AssociativeBoth<[LayerURI], V>>({
  both: L.zip
})

export const Any = P.instance<P.Any<[LayerURI], V>>({
  any: () => L.fromRawEffect(T.succeed({}))
})

export const Covariant = P.instance<P.Covariant<[LayerURI], V>>({
  map: <A, B>(f: (a: A) => B) => <X, Env, Err>(
    fa: L.Layer<X, Env, Err, A>
  ): L.Layer<X, Env, Err, B> => new L.Layer(M.map_(fa.build, f))
})

export const Applicative = P.instance<P.Applicative<[LayerURI], V>>({
  ...Any,
  ...Covariant,
  ...AssociativeBoth
})
