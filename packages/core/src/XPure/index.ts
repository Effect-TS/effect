import { constant, identity } from "@effect-ts/system/Function"
import * as X from "@effect-ts/system/XPure"

import * as P from "../Prelude"

export const XPureURI = "XPure"
export type XPureURI = typeof XPureURI
export const XPureReaderCategoryURI = "XPureReaderCategory"
export type XPureReaderCategoryURI = typeof XPureReaderCategoryURI
export const XPureStateCategoryURI = "XPureStateCategory"
export type XPureStateCategoryURI = typeof XPureStateCategoryURI

declare module "@effect-ts/hkt" {
  interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
    [XPureURI]: X.XPure<S, S, R, E, A>
    [XPureReaderCategoryURI]: X.XPure<S, S, I, E, A>
    [XPureStateCategoryURI]: X.XPure<I, A, R, E, A>
  }
}

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
  orElseEither: X.orElseEither
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

export const StateCategory = P.instance<P.Category<[XPureStateCategoryURI], V>>({
  id: () => X.modify((a) => [a, a]),
  compose: (bc) => X.chain((_) => bc)
})

export const Category = P.instance<P.Category<[XPureReaderCategoryURI], V>>({
  id: () => X.access(identity),
  compose: (bc) => (ab) => X.chain_(ab, (b) => X.provideAll_(bc, b))
})

export const struct = P.structF(Applicative)

export const tuple = P.tupleF(Applicative)

/**
 * Matchers
 */
export const { match, matchIn, matchMorph, matchTag, matchTagIn } = P.matchers(
  Covariant
)

export * from "@effect-ts/system/XPure"
