/* adapted from https://github.com/rzeigler/waveguide */

import * as AP from "../Apply"
import * as A from "../Array"
import type { CMonad4MA, CApplicative4MA, CApplicative4MAP } from "../Base"
import type {
  STypeOf,
  UnionToIntersection,
  RTypeOf,
  ETypeOf,
  ATypeOf
} from "../Base/Apply"
import * as D from "../Do"
import * as T from "../Effect"
import * as E from "../Either"
import { FunctionN } from "../Function"
import * as M from "../Monoid"
import * as O from "../Option"
import * as RE from "../Record"
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

export const chainFirst_ = <S1, S2, R, E, A, R2, E2>(
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
): EffectOption<unknown, R & R2, E | E2, B> => T.parZipWith_(fab, fa, O.ap_)

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

export const apFirst_: <A, S2, R2, E2, S1, R, E, B>(
  fa: EffectOption<S2, R2, E2, A>,
  fb: EffectOption<S1, R, E, B>
) => EffectOption<S1 | S2, R & R2, E | E2, A> = (fa, fb) =>
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

export const apSecond_ = <A, S2, R2, E2, S1, R, E, B>(
  fa: EffectOption<S2, R2, E2, A>,
  fb: EffectOption<S1, R, E, B>
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
) => EffectOption<S1 | S2, R & R2, E | E2, A> = (f) => (ma) => chainFirst_(ma, f)

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

export const parApFirst_: <A, S2, R2, E2, S1, R, E, B>(
  fa: EffectOption<S2, R2, E2, A>,
  fb: EffectOption<S1, R, E, B>
) => EffectOption<unknown, R & R2, E | E2, A> = (fa, fb) =>
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

export const parApSecond_ = <A, S2, R2, E2, S1, R, E, B>(
  fa: EffectOption<S2, R2, E2, A>,
  fb: EffectOption<S1, R, E, B>
): EffectOption<unknown, R & R2, E | E2, B> =>
  parAp_(
    map_(fa, () => (b: B) => b),
    fb
  )

export const fromNullable = <A>(a: A) => T.pure(O.fromNullable(a))

export const some = <A>(a: A): Sync<A> => T.pure(O.some(a))

export const none: Sync<never> =
  /*#__PURE__*/
  (() => T.pure(O.none))()

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

export const effectOption: CMonad4MA<URI> & CApplicative4MA<URI> = {
  URI,
  of,
  map,
  chain,
  ap
}

export function par<I>(
  I: CApplicative4MA<URI> & I
): CApplicative4MAP<URI> & T.Erase<I, CApplicative4MA<URI>>
export function par<I>(I: CApplicative4MA<URI> & I): CApplicative4MAP<URI> & I {
  return {
    ...I,
    _CTX: "async",
    ap: (fa) => (fab) =>
      T.chain_(T.parZip_(T.result(fa), T.result(fab)), (r) =>
        I.ap(T.completed(r[0]))(T.completed(r[1]))
      )
  }
}

/**
 * Used to merge types of the form EffectOption<S, R, E, A> | EffectOption<S2, R2, E2, A2> into EffectOption<S | S2, R & R2, E | E2, A | A2>
 * @param _
 */
export function compact<H extends EffectOption<any, any, any, any>>(
  _: H
): EffectOption<STypeOf<H>, RTypeOf<H>, ETypeOf<H>, ATypeOf<H>> {
  return _ as any
}

// region classic
export const Do = () => D.Do(effectOption)

export const sequenceS =
  /*#__PURE__*/
  (() => AP.sequenceS(effectOption))()

export const sequenceT =
  /*#__PURE__*/
  (() => AP.sequenceT(effectOption))()

export const sequenceArray =
  /*#__PURE__*/
  (() => A.sequence(effectOption))()

export const sequenceRecord =
  /*#__PURE__*/
  (() => RE.sequence(effectOption))()

export const sequenceTree =
  /*#__PURE__*/
  (() => TR.sequence(effectOption))()

export const sequenceOption =
  /*#__PURE__*/
  (() => O.sequence(effectOption))()

export const sequenceEither =
  /*#__PURE__*/
  (() => E.sequence(effectOption))()

export const traverseArray =
  /*#__PURE__*/
  (() => A.traverse(effectOption))()

export const traverseRecord =
  /*#__PURE__*/
  (() => RE.traverse(effectOption))()

export const traverseTree =
  /*#__PURE__*/
  (() => TR.traverse(effectOption))()

export const traverseOption =
  /*#__PURE__*/
  (() => O.traverse(effectOption))()

export const traverseEither =
  /*#__PURE__*/
  (() => E.traverse(effectOption))()

export const traverseArrayWI =
  /*#__PURE__*/
  (() => A.traverseWithIndex(effectOption))()

export const traverseRecordWI =
  /*#__PURE__*/
  (() => RE.traverseWithIndex(effectOption))()

export const witherArray =
  /*#__PURE__*/
  (() => A.wither(effectOption))()

export const witherArray_ =
  /*#__PURE__*/
  (() => A.wither_(effectOption))()

export const witherRecord =
  /*#__PURE__*/
  (() => RE.wither(effectOption))()

export const witherRecord_ =
  /*#__PURE__*/
  (() => RE.wither_(effectOption))()

export const witherOption =
  /*#__PURE__*/
  (() => O.wither(effectOption))()

export const witherOption_ =
  /*#__PURE__*/
  (() => O.wither_(effectOption))()

export const wiltArray_ =
  /*#__PURE__*/
  (() => A.wilt_(effectOption))()

export const wiltRecord =
  /*#__PURE__*/
  (() => RE.wilt(effectOption))()

export const wiltRecord_ =
  /*#__PURE__*/
  (() => RE.wilt_(effectOption))()

export const wiltOption =
  /*#__PURE__*/
  (() => O.wilt(effectOption))()

export const wiltOption_ =
  /*#__PURE__*/
  (() => O.wilt_(effectOption))()

// region parallel
export const parDo = () => D.Do(par(effectOption))

export const parSequenceS =
  /*#__PURE__*/
  (() => AP.sequenceS(par(effectOption)))()

export const parSequenceT =
  /*#__PURE__*/
  (() => AP.sequenceT(par(effectOption)))()

export const parSequenceArray =
  /*#__PURE__*/
  (() => A.sequence(par(effectOption)))()

export const parSequenceRecord =
  /*#__PURE__*/
  (() => RE.sequence(par(effectOption)))()

export const parSequenceTree =
  /*#__PURE__*/
  (() => TR.sequence(par(effectOption)))()

export const parTraverseArray =
  /*#__PURE__*/
  (() => A.traverse(par(effectOption)))()

export const parTraverseRecord =
  /*#__PURE__*/
  (() => RE.traverse(par(effectOption)))()

export const parTraverseTree =
  /*#__PURE__*/
  (() => TR.traverse(par(effectOption)))()

export const parTraverseArrayWI =
  /*#__PURE__*/
  (() => A.traverseWithIndex(par(effectOption)))()

export const parTraverseRecordWI =
  /*#__PURE__*/
  (() => RE.traverseWithIndex(par(effectOption)))()

export const parWitherArray =
  /*#__PURE__*/
  (() => A.wither(par(effectOption)))()

export const parWitherArray_ =
  /*#__PURE__*/
  (() => A.wither_(par(effectOption)))()

export const parWitherRecord =
  /*#__PURE__*/
  (() => RE.wither(par(effectOption)))()

export const parWitherRecord_ =
  /*#__PURE__*/
  (() => RE.wither_(par(effectOption)))()

export const parWiltArray =
  /*#__PURE__*/
  (() => A.wilt(par(effectOption)))()

export const parWiltArray_ =
  /*#__PURE__*/
  (() => A.wilt_(par(effectOption)))()

export const parWiltRecord =
  /*#__PURE__*/
  (() => RE.wilt(par(effectOption)))()

export const parWiltRecord_ =
  /*#__PURE__*/
  (() => RE.wilt_(par(effectOption)))()
