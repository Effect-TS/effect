import { sequenceS as SS, sequenceT as ST } from "../Apply"
import { CMonad4MA, CMonad4MAP } from "../Base"
import { STypeOf, UnionToIntersection, RTypeOf, ETypeOf, ATypeOf } from "../Base/Apply"
import { Do as DoG } from "../Do"
import * as T from "../Effect"
import { flow, FunctionN } from "../Function"
import * as M from "../Monoid"
import * as O from "../Option"
import { ForM } from "../Support/For"

export interface EffectOption<S, R, E, A> extends T.Effect<S, R, E, O.Option<A>> {}

export type Async<A> = EffectOption<unknown, unknown, never, A>
export type AsyncE<E, A> = EffectOption<unknown, unknown, E, A>
export type AsyncR<R, A> = EffectOption<unknown, R, never, A>
export type AsyncRE<R, E, A> = EffectOption<unknown, R, E, A>

export type Sync<A> = EffectOption<never, unknown, never, A>
export type SyncE<E, A> = EffectOption<never, unknown, E, A>
export type SyncR<R, A> = EffectOption<never, R, never, A>
export type SyncRE<R, E, A> = EffectOption<never, R, E, A>

export const URI = "@matechs/core/EffectOption"
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

declare module "../Base/HKT" {
  interface MaToKind<S, R, E, A> {
    [URI]: EffectOption<S, R, E, A>
  }
}

export const of = <A>(a: A): EffectOption<never, unknown, never, A> => T.pure(O.some(a))

export const map_ = <S, R, E, A, B>(
  fa: EffectOption<S, R, E, A>,
  f: (a: A) => B
): EffectOption<S, R, E, B> => T.map_(fa, O.map(f))

export const chain_ = <S1, S2, R, E, A, R2, E2, B>(
  fa: EffectOption<S1, R, E, A>,
  f: (a: A) => EffectOption<S2, R2, E2, B>
): EffectOption<S1 | S2, R & R2, E | E2, B> => T.chain_(fa, O.wither(T.effect)(f))

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

export const parAp_ = <S1, S2, R, E, A, B, R2, E2>(
  fab: EffectOption<S1, R, E, (a: A) => B>,
  fa: EffectOption<S2, R2, E2, A>
): EffectOption<unknown, R & R2, E | E2, B> => T.parZipWith(fab, fa, O.ap_)

export const ap: <S1, R, E, A>(
  fa: EffectOption<S1, R, E, A>
) => <S2, R2, E2, B>(
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

export const parAp: <S1, R, E, A>(
  fa: EffectOption<S1, R, E, A>
) => <S2, R2, E2, B>(
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

export const effectOption: CMonad4MA<URI> = {
  URI,
  _F: "curried",
  of,
  map,
  chain,
  ap
}

export const effectOptionPar: CMonad4MAP<URI> = {
  URI,
  _CTX: "async",
  _F: "curried",
  of,
  map,
  chain,
  ap: parAp
}

export const Do = () => DoG(effectOption)
export const For = () => ForM(effectOption)

export const parDo = () => DoG(effectOptionPar)
export const parFor = () => ForM(effectOptionPar)

/**
 * Used to merge types of the form EffectOption<S, R, E, A> | EffectOption<S2, R2, E2, A2> into EffectOption<S | S2, R & R2, E | E2, A | A2>
 * @param _
 */
export function compact<H extends EffectOption<any, any, any, any>>(
  _: H
): EffectOption<STypeOf<H>, RTypeOf<H>, ETypeOf<H>, ATypeOf<H>> {
  return _ as any
}

export const parSequenceS =
  /*#__PURE__*/
  (() => SS(effectOptionPar))()

export const parSequenceT =
  /*#__PURE__*/
  (() => ST(effectOptionPar))()

export const sequenceS =
  /*#__PURE__*/
  (() => SS(effectOption))()

export const sequenceT =
  /*#__PURE__*/
  (() => ST(effectOption))()
