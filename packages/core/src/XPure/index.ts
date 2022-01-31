// ets_tracing: off

import "../Operator/index.js"

import * as Tp from "@effect-ts/system/Collections/Immutable/Tuple"
import { constant, identity } from "@effect-ts/system/Function"
import * as X from "@effect-ts/system/XPure"

import type {
  XPureReaderCategoryURI,
  XPureStateCategoryURI,
  XPureURI
} from "../Modules/index.js"
import type { URI } from "../Prelude/index.js"
import * as P from "../Prelude/index.js"

export type V = P.V<"S", "_"> & P.V<"R", "-"> & P.V<"E", "+"> & P.V<"X", "+">

export const Any = P.instance<P.Any<[URI<XPureURI>], V>>({
  any: () => X.succeed(constant({}))
})

export const Covariant = P.instance<P.Covariant<[URI<XPureURI>], V>>({
  map: X.map
})

export const AssociativeBoth = P.instance<P.AssociativeBoth<[URI<XPureURI>], V>>({
  both: X.zip
})

export const AssociativeEither = P.instance<P.AssociativeEither<[URI<XPureURI>], V>>({
  orElseEither: X.orElseEither
})

export const AssociativeFlatten = P.instance<P.AssociativeFlatten<[URI<XPureURI>], V>>({
  flatten: (ffa) => X.chain_(ffa, identity)
})

export const Applicative = P.instance<P.Applicative<[URI<XPureURI>], V>>({
  ...Any,
  ...Covariant,
  ...AssociativeBoth
})

export const Access = P.instance<P.FX.Access<[URI<XPureURI>], V>>({
  access: X.access
})

export const Fail = P.instance<P.FX.Fail<[URI<XPureURI>], V>>({
  fail: X.fail
})

export const Provide = P.instance<P.FX.Provide<[URI<XPureURI>], V>>({
  provide: X.provideAll
})

export const Monad = P.instance<P.Monad<[URI<XPureURI>], V>>({
  ...Any,
  ...AssociativeFlatten,
  ...Covariant
})

export const StateCategory = P.instance<P.Category<[URI<XPureStateCategoryURI>], V>>({
  id: () => X.modify((a) => Tp.tuple(a, a)),
  compose: (bc) => X.chain((_) => bc)
})

export const Category = P.instance<P.Category<[URI<XPureReaderCategoryURI>], V>>({
  id: () => X.access(identity),
  compose: (bc) => (ab) => X.chain_(ab, (b) => X.provideAll_(bc, b))
})

export const struct = P.structF(Applicative)

export const tuple = P.tupleF(Applicative)

/**
 * Matchers
 */
export const { match, matchIn, matchMorph, matchTag, matchTagIn } =
  P.matchers(Covariant)

export * from "@effect-ts/system/XPure"
