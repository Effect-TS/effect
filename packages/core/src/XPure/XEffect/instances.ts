import { constant, identity } from "@effect-ts/system/Function"
import * as X from "@effect-ts/system/XPure"

import type { XEffectURI } from "../../Modules"
import * as P from "../../Prelude"

export type V = P.V<"R", "-"> & P.V<"E", "+">

export const Any = P.instance<P.Any<[XEffectURI], V>>({
  any: () => X.succeed(constant({}))
})

export const Covariant = P.instance<P.Covariant<[XEffectURI], V>>({
  map: X.map
})

export const AssociativeBoth = P.instance<P.AssociativeBoth<[XEffectURI], V>>({
  both: X.zip
})

export const AssociativeEither = P.instance<P.AssociativeEither<[XEffectURI], V>>({
  either: X.orElseEither
})

export const AssociativeFlatten = P.instance<P.AssociativeFlatten<[XEffectURI], V>>({
  flatten: (ffa) => X.chain_(ffa, identity)
})

export const Applicative = P.instance<P.Applicative<[XEffectURI], V>>({
  ...Any,
  ...Covariant,
  ...AssociativeBoth
})

export const Access = P.instance<P.FX.Access<[XEffectURI], V>>({
  access: X.access
})

export const Fail = P.instance<P.FX.Fail<[XEffectURI], V>>({
  fail: X.fail
})

export const Run = P.instance<P.FX.Run<[XEffectURI], V>>({
  either: X.either
})

export const Provide = P.instance<P.FX.Provide<[XEffectURI], V>>({
  provide: X.provideAll
})

export const Monad = P.instance<P.Monad<[XEffectURI], V>>({
  ...Any,
  ...AssociativeFlatten,
  ...Covariant
})
