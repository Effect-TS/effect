import type { Separated } from "fp-ts/lib/Compactable"

import * as A from "../Array"
import { Do as DoG } from "../Do"
import * as T from "../Effect"
import * as E from "../Either"
import { flow, FunctionN } from "../Function"
import * as M from "../Monoid"
import * as O from "../Option"
import * as R from "../Record"
import { ForM } from "../Support/For"
import type {
  STypeOf,
  RTypeOf,
  ETypeOf,
  ATypeOf,
  Monad4E,
  Monad4EP,
  UnionToIntersection
} from "../Support/Overloads"
import * as TR from "../Tree"

export interface EffectOption<S, R, E, A> extends T.Effect<S, R, E, O.Option<A>> {}

export type Async<A> = EffectOption<unknown, unknown, never, A>
export type AsyncE<E, A> = EffectOption<unknown, unknown, E, A>
export type AsyncR<R, A> = EffectOption<unknown, R, never, A>
export type AsyncRE<R, E, A> = EffectOption<unknown, R, E, A>

export type Sync<A> = EffectOption<never, unknown, never, A>
export type SyncE<E, A> = EffectOption<never, unknown, E, A>
export type SyncR<R, A> = EffectOption<never, R, never, A>
export type SyncRE<R, E, A> = EffectOption<never, R, E, A>

export const URI = "@matechs/core/EffectOptionURI"
export type URI = typeof URI

export type SOf<Effs extends EffectOption<any, any, any, any>[]> = {
  [k in keyof Effs]: STypeOf<Effs[k]>
}[number]

export type ROf<Effs extends EffectOption<any, any, any, any>[]> = UnionToIntersection<
  {
    [k in keyof Effs]: unknown extends RTypeOf<Effs[k]> ? never : RTypeOf<Effs[k]>
  }[number]
>

export type EOf<Effs extends EffectOption<any, any, any, any>[]> = {
  [k in keyof Effs]: ETypeOf<Effs[k]>
}[number]

export type AOf<Effs extends EffectOption<any, any, any, any>[]> = {
  [k in keyof Effs]: ATypeOf<Effs[k]> extends O.Option<infer A> ? A : never
}[number]

declare module "fp-ts/lib/HKT" {
  interface URItoKind4<S, R, E, A> {
    [URI]: EffectOption<S, R, E, A>
  }
}

declare module "../Support/Overloads/overloads" {
  interface MaToKind<S, R, E, A> {
    [URI]: EffectOption<S, R, E, A>
  }
}

export interface EffectOptionE extends Monad4E<URI> {
  chainTap<S1, S2, R, E, A, R2, E2>(
    inner: EffectOption<S1, R, E, A>,
    bind: FunctionN<[A], T.Effect<S2, R2, E2, unknown>>
  ): EffectOption<S1 | S2, R & R2, E | E2, A>
}

export const of = <A>(a: A): EffectOption<never, unknown, never, A> => T.pure(O.some(a))

export const map_ = <S, R, E, A, B>(
  fa: EffectOption<S, R, E, A>,
  f: (a: A) => B
): EffectOption<S, R, E, B> => T.map_(fa, O.map(f))

export const chain_ = <S1, S2, R, E, A, R2, E2, B>(
  fa: EffectOption<S1, R, E, A>,
  f: (a: A) => EffectOption<S2, R2, E2, B>
): EffectOption<S1 | S2, R & R2, E | E2, B> => T.chain_(fa, T.witherOption(f))

export const chainTap_ = <S1, S2, R, E, A, R2, E2>(
  inner: EffectOption<S1, R, E, A>,
  bind: FunctionN<[A], T.Effect<S2, R2, E2, unknown>>
): EffectOption<S1 | S2, R & R2, E | E2, A> =>
  T.chainTap_(
    inner,
    O.fold(() => none, bind)
  )

export const ap_ = <S1, S2, R, E, A, B, R2, E2>(
  fab: EffectOption<S1, R, E, (a: A) => B>,
  fa: EffectOption<S2, R2, E2, A>
): EffectOption<S1 | S2, R & R2, E | E2, B> => T.zipWith_(fab, fa, O.ap_)

export const effectOption: EffectOptionE = {
  URI,
  of,
  map: map_,
  chain: chain_,
  chainTap: chainTap_,
  ap: ap_
}

export interface EffectOptionEP extends Monad4EP<URI> {
  chainTap<S1, S2, R, E, A, R2, E2>(
    inner: EffectOption<S1, R, E, A>,
    bind: FunctionN<[A], T.Effect<S2, R2, E2, unknown>>
  ): EffectOption<S1 | S2, R & R2, E | E2, A>
}

export const parAp_ = <S1, S2, R, E, A, B, R2, E2>(
  fab: EffectOption<S1, R, E, (a: A) => B>,
  fa: EffectOption<S2, R2, E2, A>
): EffectOption<unknown, R & R2, E | E2, B> => T.parZipWith(fab, fa, O.ap_)

export const effectOptionPar: EffectOptionEP = {
  URI,
  _CTX: "async",
  of,
  map: map_,
  chain: chain_,
  chainTap: chainTap_,
  ap: parAp_
}

export const ap: <S1, R, E, A, E2>(
  fa: EffectOption<S1, R, E, A>
) => <S2, R2, B>(
  fab: EffectOption<S2, R2, E2, (a: A) => B>
) => EffectOption<S1 | S2, R & R2, E | E2, B> = (fa) => (fab) => ap_(fab, fa)

export const apFirst: <S1, R, E, B>(
  fb: EffectOption<S1, R, E, B>
) => <A, S2, R2, E2>(
  fa: EffectOption<S2, R2, E2, A>
) => EffectOption<S1 | S2, R & R2, E | E2, A> = (fb) => (fa) =>
  ap_(
    map_(fa, (a) => () => a),
    fb
  )

export const apSecond = <S1, R, E, B>(fb: EffectOption<S1, R, E, B>) => <A, S2, R2, E2>(
  fa: EffectOption<S2, R2, E2, A>
): EffectOption<S1 | S2, R & R2, E | E2, B> =>
  ap_(
    map_(fa, () => (b: B) => b),
    fb
  )

export const chain: <S1, R, E, A, B>(
  f: (a: A) => EffectOption<S1, R, E, B>
) => <S2, R2, E2>(
  ma: EffectOption<S2, R2, E2, A>
) => EffectOption<S1 | S2, R & R2, E | E2, B> = (f) => (ma) => chain_(ma, f)

export const chainFirst: <S1, R, E, A, B>(
  f: (a: A) => EffectOption<S1, R, E, B>
) => <S2, R2, E2>(
  ma: EffectOption<S2, R2, E2, A>
) => EffectOption<S1 | S2, R & R2, E | E2, A> = (f) => (ma) => chainTap_(ma, f)

export const flatten: <S1, S2, R, E, R2, E2, A>(
  mma: EffectOption<S1, R, E, EffectOption<S2, R2, E2, A>>
) => EffectOption<S1 | S2, R & R2, E | E2, A> = (mma) => chain_(mma, (x) => x)

export const map: <A, B>(
  f: (a: A) => B
) => <S, R, E>(fa: EffectOption<S, R, E, A>) => EffectOption<S, R, E, B> = (f) => (
  fa
) => map_(fa, f)

export const parAp: <S1, R, E, A, E2>(
  fa: EffectOption<S1, R, E, A>
) => <S2, R2, B>(
  fab: EffectOption<S2, R2, E2, (a: A) => B>
) => EffectOption<unknown, R & R2, E | E2, B> = (fa) => (fab) => parAp_(fab, fa)

export const parApFirst: <S1, R, E, B>(
  fb: EffectOption<S1, R, E, B>
) => <A, S2, R2, E2>(
  fa: EffectOption<S2, R2, E2, A>
) => EffectOption<unknown, R & R2, E | E2, A> = (fb) => (fa) =>
  parAp_(
    map_(fa, (a) => () => a),
    fb
  )

export const parApSecond = <S1, R, E, B>(fb: EffectOption<S1, R, E, B>) => <
  A,
  S2,
  R2,
  E2
>(
  fa: EffectOption<S2, R2, E2, A>
): EffectOption<unknown, R & R2, E | E2, B> =>
  parAp_(
    map_(fa, () => (b: B) => b),
    fb
  )

export const fromNullable = flow(O.fromNullable, T.pure)

export const some = <A>(a: A): Sync<A> => T.pure(O.some(a))

export const none: Sync<never> = T.pure(O.none)

export const fromOption = <A>(a: O.Option<A>): Sync<A> => T.pure(a)

export const mapNone = <A2>(f: () => A2) => <S, R, E, A>(
  _: EffectOption<S, R, E, A>
): EffectOption<S, R, E, A | A2> => T.map_(_, (x) => (O.isNone(x) ? O.some(f()) : x))

export const chainNone = <S2, R2, E2, A2>(f: EffectOption<S2, R2, E2, A2>) => <
  S,
  R,
  E,
  A
>(
  _: EffectOption<S, R, E, A>
): EffectOption<S | S2, R & R2, E | E2, A | A2> =>
  T.chain_(_, (x) => (O.isNone(x) ? f : T.pure(x as O.Option<A | A2>)))

export const chainTap = <S, R, E, A>(
  bind: FunctionN<[A], T.Effect<S, R, E, unknown>>
) => T.chainTap(O.fold(() => none, bind))

export function getFirstMonoid<S, R, E, A>(): M.Monoid<EffectOption<S, R, E, A>> {
  return {
    concat(x: EffectOption<S, R, E, A>, y: EffectOption<S, R, E, A>) {
      return T.chain_(x, (o) => (O.isNone(o) ? y : x))
    },
    empty: T.pure(O.none)
  }
}

export function getLastMonoid<S, R, E, A>(): M.Monoid<EffectOption<S, R, E, A>> {
  return {
    concat(x: EffectOption<S, R, E, A>, y: EffectOption<S, R, E, A>) {
      return T.chain_(y, (o) => (O.isNone(o) ? x : y))
    },
    empty: T.pure(O.none)
  }
}

export const getFirst = <Effs extends EffectOption<any, any, any, any>[]>(
  ...items: Effs
): EffectOption<SOf<Effs>, ROf<Effs>, EOf<Effs>, AOf<Effs>> =>
  M.fold(getFirstMonoid<SOf<Effs>, ROf<Effs>, EOf<Effs>, AOf<Effs>>())(items)

export const getLast = <Effs extends EffectOption<any, any, any, any>[]>(
  ...items: Effs
): EffectOption<SOf<Effs>, ROf<Effs>, EOf<Effs>, AOf<Effs>> =>
  M.fold(getLastMonoid<SOf<Effs>, ROf<Effs>, EOf<Effs>, AOf<Effs>>())(items)

export const Do = () => DoG(effectOption)
export const For = () => ForM(effectOption)

export const traverseOption: <A, S, R, E, B>(
  f: (a: A) => EffectOption<S, R, E, B>
) => (ta: O.Option<A>) => EffectOption<S, R, E, O.Option<B>> = (f) => (ta) =>
  O.traverse(effectOption)(ta, f)

export const wiltOption: <A, S, R, E, B, C>(
  f: (a: A) => EffectOption<S, R, E, E.Either<B, C>>
) => (wa: O.Option<A>) => EffectOption<S, R, E, Separated<O.Option<B>, O.Option<C>>> = (
  f
) => (wa) => O.wilt(effectOption)(wa, f)

export const witherOption: <A, S, R, E, B>(
  f: (a: A) => EffectOption<S, R, E, O.Option<B>>
) => (ta: O.Option<A>) => EffectOption<S, R, E, O.Option<B>> = (f) => (ta) =>
  O.wither(effectOption)(ta, f)

export const traverseEither: <A, S, R, FE, B>(
  f: (a: A) => EffectOption<S, R, FE, B>
) => <TE>(ta: E.Either<TE, A>) => EffectOption<S, R, FE, E.Either<TE, B>> = (f) => (
  ta
) => E.traverse(effectOption)(ta, f)

export const traverseTree: <A, S, R, E, B>(
  f: (a: A) => EffectOption<S, R, E, B>
) => (ta: TR.Tree<A>) => EffectOption<S, R, E, TR.Tree<B>> = (f) => (ta) =>
  TR.traverse(effectOption)(ta, f)

export const traverseArray: <A, S, R, E, B>(
  f: (a: A) => EffectOption<S, R, E, B>
) => (ta: Array<A>) => EffectOption<S, R, E, Array<B>> = (f) => (ta) =>
  A.traverse(effectOption)(ta, f)

export const traverseArrayWithIndex: <A, S, R, E, B>(
  f: (i: number, a: A) => EffectOption<S, R, E, B>
) => (ta: Array<A>) => EffectOption<S, R, E, Array<B>> = (f) => (ta) =>
  A.traverseWithIndex(effectOption)(ta, f)

export const wiltArray: <A, S, R, E, B, C>(
  f: (a: A) => EffectOption<S, R, E, E.Either<B, C>>
) => (wa: Array<A>) => EffectOption<S, R, E, Separated<Array<B>, Array<C>>> = (f) => (
  wa
) => A.wilt(effectOption)(wa, f)

export const witherArray: <A, S, R, E, B>(
  f: (a: A) => EffectOption<S, R, E, O.Option<B>>
) => (ta: Array<A>) => EffectOption<S, R, E, Array<B>> = (f) => (ta) =>
  A.wither(effectOption)(ta, f)

export const traverseRecord: <A, S, R, E, B>(
  f: (a: A) => EffectOption<S, R, E, B>
) => (ta: Record<string, A>) => EffectOption<S, R, E, Record<string, B>> = (f) => (
  ta
) => R.traverse_(effectOption)(ta, f)

export const traverseRecordWithIndex: <A, S, R, E, B>(
  f: (k: string, a: A) => EffectOption<S, R, E, B>
) => (ta: Record<string, A>) => EffectOption<S, R, E, Record<string, B>> = (f) => (
  ta
) => R.traverseWithIndex_(effectOption)(ta, f)

export const wiltRecord: <A, S, R, E, B, C>(
  f: (a: A) => EffectOption<S, R, E, E.Either<B, C>>
) => (
  wa: Record<string, A>
) => EffectOption<S, R, E, Separated<Record<string, B>, Record<string, C>>> = (f) => (
  wa
) => R.wilt(effectOption)(wa, f)

export const witherRecord: <A, S, R, E, B>(
  f: (a: A) => EffectOption<S, R, E, O.Option<B>>
) => (ta: Record<string, A>) => EffectOption<S, R, E, Record<string, B>> = (f) => (
  ta
) => R.wither(effectOption)(ta, f)

export const parDo = () => DoG(effectOptionPar)
export const parFor = () => ForM(effectOptionPar)

export const parTraverseTree: <A, S, R, E, B>(
  f: (a: A) => EffectOption<S, R, E, B>
) => (ta: TR.Tree<A>) => EffectOption<unknown, R, E, TR.Tree<B>> = (f) => (ta) =>
  TR.traverse(effectOptionPar)(ta, f)

export const parTraverseArray: <A, S, R, E, B>(
  f: (a: A) => EffectOption<S, R, E, B>
) => (ta: Array<A>) => EffectOption<unknown, R, E, Array<B>> = (f) => (ta) =>
  A.traverse(effectOptionPar)(ta, f)

export const parTraverseArrayWithIndex: <A, S, R, E, B>(
  f: (i: number, a: A) => EffectOption<S, R, E, B>
) => (ta: Array<A>) => EffectOption<unknown, R, E, Array<B>> = (f) => (ta) =>
  A.traverseWithIndex(effectOptionPar)(ta, f)

export const parWiltArray: <A, S, R, E, B, C>(
  f: (a: A) => EffectOption<S, R, E, E.Either<B, C>>
) => (wa: Array<A>) => EffectOption<unknown, R, E, Separated<Array<B>, Array<C>>> = (
  f
) => (wa) => A.wilt(effectOptionPar)(wa, f)

export const parWitherArray: <A, S, R, E, B>(
  f: (a: A) => EffectOption<S, R, E, O.Option<B>>
) => (ta: Array<A>) => EffectOption<unknown, R, E, Array<B>> = (f) => (ta) =>
  A.wither(effectOptionPar)(ta, f)

export const parTraverseRecord: <A, S, R, E, B>(
  f: (a: A) => EffectOption<S, R, E, B>
) => (ta: Record<string, A>) => EffectOption<unknown, R, E, Record<string, B>> = (
  f
) => (ta) => R.traverse_(effectOptionPar)(ta, f)

export const parTraverseRecordWithIndex: <A, S, R, E, B>(
  f: (k: string, a: A) => EffectOption<S, R, E, B>
) => (ta: Record<string, A>) => EffectOption<unknown, R, E, Record<string, B>> = (
  f
) => (ta) => R.traverseWithIndex_(effectOptionPar)(ta, f)

export const parWiltRecord: <A, S, R, E, B, C>(
  f: (a: A) => EffectOption<S, R, E, E.Either<B, C>>
) => (
  wa: Record<string, A>
) => EffectOption<unknown, R, E, Separated<Record<string, B>, Record<string, C>>> = (
  f
) => (wa) => R.wilt(effectOptionPar)(wa, f)

export const parWitherRecord: <A, S, R, E, B>(
  f: (a: A) => EffectOption<S, R, E, O.Option<B>>
) => (ta: Record<string, A>) => EffectOption<unknown, R, E, Record<string, B>> = (
  f
) => (ta) => R.wither(effectOptionPar)(ta, f)
