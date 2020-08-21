import { constant, identity } from "@effect-ts/system/Function"
import * as X from "@effect-ts/system/XPure"

import * as P from "../Prelude"
import { sequenceSF } from "../Prelude/DSL"

export type V = P.V<"R", "-"> & P.V<"E", "+">

export const XPureURI = "XPure"

export type XPureURI = typeof XPureURI

declare module "../Prelude/HKT" {
  interface URItoKind<D, N extends string, K, SI, SO, X, I, S, R, E, A> {
    [XPureURI]: X.XPure<SI, SO, R, E, A>
  }
}

export const Any = P.instance<P.Any<[XPureURI], V>>({
  any: () => X.succeed(constant({}))
})

export const Covariant = P.instance<P.Covariant<[XPureURI], V>>({
  map: X.map
})

export const AssociativeBoth = P.instance<P.AssociativeBoth<[XPureURI], V>>({
  both: X.zip
})

export const AssociativeEither = P.instance<P.AssociativeEither<[XPureURI], V>>({
  either: X.orElseEither
})

export const AssociativeFlatten = P.instance<P.AssociativeFlatten<[XPureURI], V>>({
  flatten: (ffa) => X.chain_(ffa, identity)
})

export const Applicative = P.instance<P.Applicative<[XPureURI], V>>({
  ...Any,
  ...Covariant,
  ...AssociativeBoth
})

export const Access = P.instance<P.FX.Access<[XPureURI], V>>({
  access: X.access
})

export const Fail = P.instance<P.FX.Fail<[XPureURI], V>>({
  fail: X.fail
})

export const Provide = P.instance<P.FX.Provide<[XPureURI], V>>({
  provide: X.provideAll
})

export const Monad = P.instance<P.Monad<[XPureURI], V>>({
  ...Any,
  ...AssociativeFlatten,
  ...Covariant
})

export const sequenceS = sequenceSF(Applicative)

export * from "@effect-ts/system/XPure"
