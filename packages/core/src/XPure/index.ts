import { constant, identity } from "@effect-ts/system/Function"
import * as X from "@effect-ts/system/XPure"

import type { XPureIOURI, XPureURI } from "../Modules"
import * as P from "../Prelude"
import { structF } from "../Prelude/DSL"

export type V = P.V<"S", "_"> & P.V<"R", "-"> & P.V<"E", "+">

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

export const Category = P.instance<
  P.Category<[XPureIOURI], P.V<"Q", "-"> & P.V<"W", "+">>
>({
  id: () => X.modify((a) => [a, a]),
  compose: (bc) => X.chain((_) => bc)
})

export const struct = structF(Applicative)

export * from "@effect-ts/system/XPure"
