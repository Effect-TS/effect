/* adapted from https://github.com/gcanti/fp-ts */

import { identity as id } from "../../Function"
import type { IdURI } from "../../Modules"
import * as P from "../../Prelude"
import { structF, tupledF } from "../../Prelude/DSL"
import type { Equal } from "../Equal"
import type { Identity } from "../Identity"
import type { Show } from "../Show"

export type Id<A> = A

export const alt_: <A>(fx: A, fy: () => A) => A = id

export const alt: <A>(that: () => A) => (fa: A) => A = (that) => (fa) => alt_(fa, that)

export const ap_: <A, B>(fab: (a: A) => B, fa: A) => B = (mab, ma) => mab(ma)

export const ap: <A>(fa: A) => <B>(fab: (a: A) => B) => B = (fa) => (fab) =>
  ap_(fab, fa)

export const apFirst: <B>(fb: B) => <A>(fa: A) => A = (_) => (fa) => fa

export const apSecond: <B>(fb: B) => <A>(fa: A) => B = (fb) => (_) => fb

export const chain_: <A, B>(fa: A, f: (a: A) => B) => B = (ma, f) => f(ma)

export const chain: <A, B>(f: (a: A) => B) => (ma: A) => B = (f) => (ma) => f(ma)

export const chainTap: <A, B>(f: (a: A) => B) => (ma: A) => A = (f) => (ma) =>
  chain_(ma, (x) => map_(f(x), () => x))

export const chainTap_: <A, B>(ma: A, f: (a: A) => B) => A = (ma, f) =>
  chain_(ma, (x) => map_(f(x), () => x))

export const duplicate: <A>(ma: A) => A = (ma) => ma

export const extend_: <A, B>(wa: A, f: (wa: A) => B) => B = (wa, f) => f(wa)

export const extend: <A, B>(f: (fa: A) => B) => (ma: A) => B = (f) => (ma) => f(ma)

export const extract: <A>(wa: A) => A = id

export const flatten: <A>(mma: A) => A = (mma) => mma

export const foldMap_: <M>(M: Identity<M>) => <A>(fa: A, f: (a: A) => M) => M = (_) => (
  fa,
  f
) => f(fa)

export const foldMap: <M>(M: Identity<M>) => <A>(f: (a: A) => M) => (fa: A) => M = (
  M
) => (f) => (fa) => foldMap_(M)(fa, f)

export const getEq: <A>(E: Equal<A>) => Equal<Id<A>> = id

export const getShow: <A>(S: Show<A>) => Show<Id<A>> = id

export const map_: <A, B>(fa: A, f: (a: A) => B) => B = (ma, f) => f(ma)

export const map: <A, B>(f: (a: A) => B) => (fa: A) => B = (f) => (fa) => map_(fa, f)

export const reduce_: <A, B>(fa: A, b: B, f: (b: B, a: A) => B) => B = (fa, b, f) =>
  f(b, fa)

export const reduce: <A, B>(b: B, f: (b: B, a: A) => B) => (fa: A) => B = (b, f) => (
  fa
) => reduce_(fa, b, f)
export const reduceRight_: <A, B>(fa: A, b: B, f: (a: A, b: B) => B) => B = (
  fa,
  b,
  f
) => f(fa, b)

export const reduceRight: <A, B>(b: B, f: (a: A, b: B) => B) => (fa: A) => B = (
  b,
  f
) => (fa) => reduceRight_(fa, b, f)

export const Any = P.instance<P.Any<[IdURI]>>({
  any: () => ({})
})

export const Covariant = P.instance<P.Covariant<[IdURI]>>({
  map
})

export const AssociativeBoth = P.instance<P.AssociativeBoth<[IdURI]>>({
  both: (b) => (a) => [a, b]
})

export const AssociativeFlatten = P.instance<P.AssociativeFlatten<[IdURI]>>({
  flatten: (a) => a
})

export const IdentityBoth = P.instance<P.IdentityBoth<[IdURI]>>({
  ...Any,
  ...AssociativeBoth
})

export const IdentityFlatten = P.instance<P.IdentityFlatten<[IdURI]>>({
  ...Any,
  ...AssociativeFlatten
})

export const Applicative = P.instance<P.Applicative<[IdURI]>>({
  ...Covariant,
  ...IdentityBoth
})

export const Monad = P.instance<P.Monad<[IdURI]>>({
  ...Covariant,
  ...IdentityFlatten
})

export const Reduce = P.instance<P.Reduce<[IdURI]>>({
  reduce
})

export const ReduceRight = P.instance<P.ReduceRight<[IdURI]>>({
  reduceRight
})

export const FoldMap = P.instance<P.FoldMap<[IdURI]>>({
  foldMap
})

export const Foldable = P.instance<P.Foldable<[IdURI]>>({
  ...Reduce,
  ...ReduceRight,
  ...FoldMap
})

export const Traversable = P.instance<P.Traversable<[IdURI]>>({
  ...Covariant,
  foreachF: () => (f) => f
})

export const struct = structF(Applicative)

export const tupled = tupledF(Applicative)
