/* adapted from https://github.com/gcanti/fp-ts */

import * as AP from "../Apply"
import type {
  HKT,
  CSequence1,
  CApplicative,
  CTraverse1,
  CMonad1,
  CFoldable1,
  CTraversable1,
  CAlt1,
  CComonad1,
  CApplicative1
} from "../Base"
import { tailRec, CChainRec1 } from "../Base/ChainRec"
import { Do as DoG } from "../Do"
import type { Either } from "../Either"
import type { Eq } from "../Eq"
import { identity as id } from "../Function"
import type { Monoid } from "../Monoid"
import type { Show } from "../Show"

export type Identity<A> = A

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

export const chainRec: <A, B>(a: A, f: (a: A) => Either<A, B>) => B = tailRec

export const duplicate: <A>(ma: A) => A = (ma) => ma

export const extend_: <A, B>(wa: A, f: (wa: A) => B) => B = (wa, f) => f(wa)

export const extend: <A, B>(f: (fa: A) => B) => (ma: A) => B = (f) => (ma) => f(ma)

export const extract: <A>(wa: A) => A = id

export const flatten: <A>(mma: A) => A = (mma) => mma

export const foldMap_: <M>(M: Monoid<M>) => <A>(fa: A, f: (a: A) => M) => M = (_) => (
  fa,
  f
) => f(fa)

export const foldMap: <M>(M: Monoid<M>) => <A>(f: (a: A) => M) => (fa: A) => M = (
  M
) => (f) => (fa) => foldMap_(M)(fa, f)

export const getEq: <A>(E: Eq<A>) => Eq<Identity<A>> = id

export const getShow: <A>(S: Show<A>) => Show<Identity<A>> = id

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

export const sequence: CSequence1<URI> = <F>(F: CApplicative<F>) => <A>(
  ta: Identity<HKT<F, A>>
): HKT<F, Identity<A>> => {
  return F.map(id)(ta)
}

export const traverse: CTraverse1<URI> = <F>(F: CApplicative<F>) => <A, B>(
  f: (a: A) => HKT<F, B>
): ((ta: Identity<A>) => HKT<F, Identity<B>>) => {
  return (ta) => F.map(id)(f(ta))
}

export const URI = "@matechs/core/Identity"

export type URI = typeof URI

declare module "../Base/HKT" {
  interface URItoKind<A> {
    readonly [URI]: Identity<A>
  }
}

export const identity: CMonad1<URI> &
  CFoldable1<URI> &
  CTraversable1<URI> &
  CAlt1<URI> &
  CComonad1<URI> &
  CChainRec1<URI> &
  CApplicative1<URI> = {
  URI,
  map,
  of: id,
  ap,
  chain,
  reduce,
  foldMap,
  reduceRight,
  traverse,
  sequence,
  alt,
  extract,
  extend,
  chainRec
}

export const identityAp: CApplicative1<URI> = {
  URI,
  map,
  of: id,
  ap
}

export const identityMonad: CMonad1<URI> & CApplicative1<URI> = {
  URI,
  map,
  of: id,
  ap,
  chain
}

export const Do = () => DoG(identityMonad)

export const sequenceS =
  /*#__PURE__*/
  (() => AP.sequenceS(identityAp))()

export const sequenceT =
  /*#__PURE__*/
  (() => AP.sequenceT(identityAp))()
