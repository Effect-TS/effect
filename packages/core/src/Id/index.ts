// ets_tracing: off

/* adapted from https://github.com/gcanti/fp-ts */
import "../Operator/index.js"

import * as Tp from "@effect-ts/system/Collections/Immutable/Tuple"

import type { Equal } from "../Equal/index.js"
import type { Identity } from "../Identity/index.js"
import * as DSL from "../PreludeV2/DSL/index.js"
import * as P from "../PreludeV2/index.js"
import type { Show } from "../Show/index.js"

export type Id<A> = A

export interface IdF extends P.HKT {
  readonly type: Id<this["A"]>
}

/**
 * @ets_optimize identity
 */
export function alt_<A>(fx: A, _fy: () => A): A {
  return fx
}

/**
 * @ets_data_first alt_
 */
export function alt<A>(that: () => A) {
  return (fa: A): A => alt_(fa, that)
}

export function ap_<A, B>(fab: (a: A) => B, fa: A): B {
  return fab(fa)
}

/**
 * @ets_data_first ap_
 */
export function ap<A>(fa: A) {
  return <B>(fab: (a: A) => B): B => ap_(fab, fa)
}

export function apFirst<B>(_fb: B) {
  return <A>(fa: A): A => fa
}

export function apSecond<B>(fb: B) {
  return <A>(_fa: A): B => fb
}

export function chain_<A, B>(fa: A, f: (a: A) => B): B {
  return f(fa)
}

/**
 * @ets_data_first chain_
 */
export function chain<A, B>(f: (a: A) => B) {
  return (ma: A): B => f(ma)
}

/**
 * @ets_data_first tap_
 */
export function tap<A, B>(f: (a: A) => B) {
  return (ma: A): A => chain_(ma, (x) => map_(f(x), () => x))
}

export function tap_<A, B>(ma: A, f: (a: A) => B): A {
  return chain_(ma, (x) => map_(f(x), () => x))
}

/**
 * @ets_optimize identity
 */
export function duplicate<A>(ma: A): A {
  return ma
}

export function extend_<A, B>(wa: A, f: (wa: A) => B): B {
  return f(wa)
}

/**
 * @ets_data_first extend_
 */
export function extend<A, B>(f: (fa: A) => B) {
  return (ma: A): B => f(ma)
}

/**
 * @ets_optimize identity
 */
export function extract<A>(wa: A): A {
  return wa
}

/**
 * @ets_optimize identity
 */
export function flatten<A>(wa: A): A {
  return wa
}

export function foldMap_<M>(M: Identity<M>) {
  return <A>(fa: A, f: (a: A) => M): M => f(fa)
}

export function foldMap<M>(M: Identity<M>) {
  return <A>(f: (a: A) => M) =>
    (fa: A): M =>
      foldMap_(M)(fa, f)
}

/**
 * @ets_optimize identity
 */
export function getEq<A>(E: Equal<A>): Equal<Id<A>> {
  return E
}

/**
 * @ets_optimize identity
 */
export function getShow<A>(E: Show<A>): Show<Id<A>> {
  return E
}

export function map_<A, B>(fa: A, f: (a: A) => B): B {
  return f(fa)
}

/**
 * @ets_data_first map_
 */
export function map<A, B>(f: (a: A) => B) {
  return (fa: A): B => map_(fa, f)
}

export function reduce_<A, B>(fa: A, b: B, f: (b: B, a: A) => B): B {
  return f(b, fa)
}

/**
 * @ets_data_first reduce_
 */
export function reduce<A, B>(b: B, f: (b: B, a: A) => B) {
  return (fa: A): B => reduce_(fa, b, f)
}

export function reduceRight_<A, B>(fa: A, b: B, f: (a: A, b: B) => B): B {
  return f(fa, b)
}

/**
 * @ets_data_first reduceRight_
 */
export function reduceRight<A, B>(b: B, f: (a: A, b: B) => B) {
  return (fa: A): B => reduceRight_(fa, b, f)
}

export const Any = P.instance<P.Any<IdF>>({
  any: () => ({})
})

export const Covariant = P.instance<P.Covariant<IdF>>({
  map
})

export const AssociativeBoth = P.instance<P.AssociativeBoth<IdF>>({
  both: (b) => (a) => Tp.tuple(a, b)
})

export const AssociativeFlatten = P.instance<P.AssociativeFlatten<IdF>>({
  flatten: (a) => a
})

export const IdentityBoth = P.instance<P.IdentityBoth<IdF>>({
  ...Any,
  ...AssociativeBoth
})

export const IdentityFlatten = P.instance<P.IdentityFlatten<IdF>>({
  ...Any,
  ...AssociativeFlatten
})

export const Applicative = P.instance<P.Applicative<IdF>>({
  ...Covariant,
  ...IdentityBoth
})

export const Monad = P.instance<P.Monad<IdF>>({
  ...Covariant,
  ...IdentityFlatten
})

export const Reduce = P.instance<P.Reduce<IdF>>({
  reduce
})

export const ReduceRight = P.instance<P.ReduceRight<IdF>>({
  reduceRight
})

export const FoldMap = P.instance<P.FoldMap<IdF>>({
  foldMap
})

export const Foldable = P.instance<P.Foldable<IdF>>({
  ...Reduce,
  ...ReduceRight,
  ...FoldMap
})

export const ForEach = P.instance<P.ForEach<IdF>>({
  ...Covariant,
  forEachF: () => (f) => f
})

export const struct = DSL.structF(Applicative)

export const tuple = DSL.tupleF(Applicative)
