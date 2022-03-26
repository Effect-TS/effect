// ets_tracing: off

import "../Operator/index.js"

import * as Tp from "@effect-ts/system/Collections/Immutable/Tuple"
import { constant, identity } from "@effect-ts/system/Function"
import * as X from "@effect-ts/system/XPure"

import * as P from "../PreludeV2/index.js"

export interface XPureF<S> extends P.HKT {
  readonly type: X.XPure<this["X"], S, S, this["R"], this["E"], this["A"]>
}

export interface XPureStateCategoryF extends P.HKT {
  readonly type: X.XPure<
    this["X"],
    this["I"],
    this["A"],
    this["R"],
    this["E"],
    this["A"]
  >
}

export interface XPureReaderCategoryF<S> extends P.HKT {
  readonly type: X.XPure<this["X"], S, S, this["I"], this["E"], this["A"]>
}

export const Any = <S>() =>
  P.instance<P.Any<XPureF<S>>>({
    any: () => X.succeed(constant({}))
  })

export const Covariant = <S>() =>
  P.instance<P.Covariant<XPureF<S>>>({
    map: X.map
  })

export const AssociativeBoth = <S>() =>
  P.instance<P.AssociativeBoth<XPureF<S>>>({
    both: X.zip
  })

export const AssociativeEither = <S>() =>
  P.instance<P.AssociativeEither<XPureF<S>>>({
    orElseEither: X.orElseEither
  })

export const AssociativeFlatten = <S>() =>
  P.instance<P.AssociativeFlatten<XPureF<S>>>({
    flatten: (ffa) => X.chain_(ffa, identity)
  })

export const Applicative = <S>() =>
  P.instance<P.Applicative<XPureF<S>>>({
    ...Any(),
    ...Covariant(),
    ...AssociativeBoth()
  })

export const Access = <S>() =>
  P.instance<P.FX.Access<XPureF<S>>>({
    access: X.access
  })

export const Fail = <S>() =>
  P.instance<P.FX.Fail<XPureF<S>>>({
    fail: X.fail
  })

export const Provide = <S>() =>
  P.instance<P.FX.Provide<XPureF<S>>>({
    provide: X.provideAll
  })

export const Monad = <S>() =>
  P.instance<P.Monad<XPureF<S>>>({
    ...Any(),
    ...AssociativeFlatten(),
    ...Covariant()
  })

export const StateCategory = P.instance<P.Category<XPureStateCategoryF>>({
  id: () => X.modify((a) => Tp.tuple(a, a)),
  compose: (bc) => X.chain((_) => bc)
})

export const category = <S>() =>
  P.instance<P.Category<XPureReaderCategoryF<S>>>({
    id: () => X.access(identity),
    compose: (bc) => (ab) => X.chain_(ab, (b) => X.provideAll_(bc, b))
  })

export const struct = <S>() => P.structF(Applicative<S>())

export const tuple = <S>() => P.tupleF(Applicative<S>())

/**
 * Matchers
 */
export const matchers = <S>() => P.matchers<XPureF<S>>()

export * from "@effect-ts/system/XPure"
