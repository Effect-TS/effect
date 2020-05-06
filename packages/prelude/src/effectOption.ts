import { effect as T } from "@matechs/effect"
import { ForM } from "@matechs/effect/lib/for"
import { Monad4E, Monad4EP } from "@matechs/effect/lib/overloadEff"
import { record as RE, tree as TR, array as Ar } from "fp-ts"
import { Do as DoG } from "fp-ts-contrib/lib/Do"
import { sequenceS as SS, sequenceT as ST } from "fp-ts/lib/Apply"
import { Separated } from "fp-ts/lib/Compactable"
import * as MON from "fp-ts/lib/Monoid"
import { flow, FunctionN } from "fp-ts/lib/function"
import { pipeable } from "fp-ts/lib/pipeable"

import * as E from "./either"
import * as O from "./option"
import { ROf, EOf, AOf, SOf } from "./utils"

export type EffectOption<S, R, E, A> = T.Effect<S, R, E, O.Option<A>>

export const URI = "@matechs/prelude/EffectOption"
export type URI = typeof URI

declare module "fp-ts/lib/HKT" {
  interface URItoKind4<S, R, E, A> {
    [URI]: EffectOption<S, R, E, A>
  }
}

declare module "@matechs/effect/lib/overloadEff" {
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

export const effectOption: EffectOptionE = {
  URI,
  of: <A>(a: A): EffectOption<never, unknown, never, A> => T.pure(O.some(a)),
  map: <S, R, E, A, B>(
    fa: EffectOption<S, R, E, A>,
    f: (a: A) => B
  ): EffectOption<S, R, E, B> => T.effect.map(fa, O.map(f)),
  chain: <S1, S2, R, E, A, R2, E2, B>(
    fa: EffectOption<S1, R, E, A>,
    f: (a: A) => EffectOption<S2, R2, E2, B>
  ): EffectOption<S1 | S2, R & R2, E | E2, B> => T.effect.chain(fa, T.witherOption(f)),
  chainTap: <S1, S2, R, E, A, R2, E2>(
    inner: EffectOption<S1, R, E, A>,
    bind: FunctionN<[A], T.Effect<S2, R2, E2, unknown>>
  ): EffectOption<S1 | S2, R & R2, E | E2, A> =>
    T.effect.chainTap(
      inner,
      O.fold(() => none, bind)
    ),
  ap: <S1, S2, R, E, A, B, R2, E2>(
    fab: EffectOption<S1, R, E, (a: A) => B>,
    fa: EffectOption<S2, R2, E2, A>
  ): EffectOption<S1 | S2, R & R2, E | E2, B> => T.effect.zipWith(fab, fa, O.option.ap)
}

export interface EffectOptionEP extends Monad4EP<URI> {
  chainTap<S1, S2, R, E, A, R2, E2>(
    inner: EffectOption<S1, R, E, A>,
    bind: FunctionN<[A], T.Effect<S2, R2, E2, unknown>>
  ): EffectOption<S1 | S2, R & R2, E | E2, A>
}

export const effectOptionPar: EffectOptionEP = {
  URI,
  _CTX: "async",
  of: <A>(a: A): EffectOption<never, unknown, never, A> => T.pure(O.some(a)),
  map: <S, R, E, A, B>(
    fa: EffectOption<S, R, E, A>,
    f: (a: A) => B
  ): EffectOption<S, R, E, B> => T.effect.map(fa, O.map(f)),
  chain: <S1, S2, R, E, A, R2, E2, B>(
    fa: EffectOption<S1, R, E, A>,
    f: (a: A) => EffectOption<S2, R2, E2, B>
  ): EffectOption<S1 | S2, R & R2, E | E2, B> => T.effect.chain(fa, T.witherOption(f)),
  chainTap: <S1, S2, R, E, A, R2, E2>(
    inner: EffectOption<S1, R, E, A>,
    bind: FunctionN<[A], T.Effect<S2, R2, E2, unknown>>
  ): EffectOption<S1 | S2, R & R2, E | E2, A> =>
    T.effect.chainTap<S1, S2, R, E, O.Option<A>, R2, E2>(
      inner,
      O.fold(() => none, bind)
    ),
  ap: <S1, S2, R, E, A, B, R2, E2>(
    fab: EffectOption<S1, R, E, (a: A) => B>,
    fa: EffectOption<S2, R2, E2, A>
  ): EffectOption<unknown, R & R2, E | E2, B> => T.parZipWith(fab, fa, O.option.ap)
}

export const { ap, apFirst, apSecond, chain, chainFirst, flatten, map } = pipeable(
  effectOption
)
export const { ap: parAp, apFirst: parApFirst, apSecond: parApSecond } = pipeable(
  effectOptionPar
)

export const fromNullable = flow(O.fromNullable, T.pure)

export const some = <A>(a: A): Sync<A> => T.pure(O.some(a))

export const none: Sync<never> = T.pure(O.none)

export const fromOption = <A>(a: O.Option<A>): Sync<A> => T.pure(a)

export type Sync<A> = T.Sync<O.Option<A>>

export const mapNone = <A2>(f: () => A2) => <S, R, E, A>(
  _: EffectOption<S, R, E, A>
): EffectOption<S, R, E, A | A2> =>
  T.effect.map(_, (x) => (O.isNone(x) ? O.some(f()) : x))

export const chainNone = <S2, R2, E2, A2>(f: EffectOption<S2, R2, E2, A2>) => <
  S,
  R,
  E,
  A
>(
  _: EffectOption<S, R, E, A>
): EffectOption<S | S2, R & R2, E | E2, A | A2> =>
  T.effect.chain(_, (x) => (O.isNone(x) ? f : T.pure(x as O.Option<A | A2>)))

export const chainTap = <S, R, E, A>(
  bind: FunctionN<[A], T.Effect<S, R, E, unknown>>
) => T.chainTap(O.fold(() => none, bind))

export function getFirstMonoid<S, R, E, A>(): MON.Monoid<EffectOption<S, R, E, A>> {
  return {
    concat(x: EffectOption<S, R, E, A>, y: EffectOption<S, R, E, A>) {
      return T.effect.chain(x, (o) => (O.isNone(o) ? y : x))
    },
    empty: T.pure(O.none)
  }
}

export function getLastMonoid<S, R, E, A>(): MON.Monoid<EffectOption<S, R, E, A>> {
  return {
    concat(x: EffectOption<S, R, E, A>, y: EffectOption<S, R, E, A>) {
      return T.effect.chain(y, (o) => (O.isNone(o) ? x : y))
    },
    empty: T.pure(O.none)
  }
}

export const getFirst = <Effs extends EffectOption<any, any, any, any>[]>(
  ...items: Effs
): EffectOption<SOf<Effs>, ROf<Effs>, EOf<Effs>, AOf<Effs>> =>
  MON.fold(getFirstMonoid<SOf<Effs>, ROf<Effs>, EOf<Effs>, AOf<Effs>>())(items)

export const getLast = <Effs extends EffectOption<any, any, any, any>[]>(
  ...items: Effs
): EffectOption<SOf<Effs>, ROf<Effs>, EOf<Effs>, AOf<Effs>> =>
  MON.fold(getLastMonoid<SOf<Effs>, ROf<Effs>, EOf<Effs>, AOf<Effs>>())(items)

export const sequenceT = ST(effectOption)
export const sequenceS = SS(effectOption)
export const Do = () => DoG(effectOption)
export const For = () => ForM(effectOption)

export const sequenceOption = O.option.sequence(effectOption)

export const traverseOption: <A, S, R, E, B>(
  f: (a: A) => EffectOption<S, R, E, B>
) => (ta: O.Option<A>) => EffectOption<S, R, E, O.Option<B>> = (f) => (ta) =>
  O.option.traverse(effectOption)(ta, f)

export const wiltOption: <A, S, R, E, B, C>(
  f: (a: A) => EffectOption<S, R, E, E.Either<B, C>>
) => (wa: O.Option<A>) => EffectOption<S, R, E, Separated<O.Option<B>, O.Option<C>>> = (
  f
) => (wa) => O.option.wilt(effectOption)(wa, f)

export const witherOption: <A, S, R, E, B>(
  f: (a: A) => EffectOption<S, R, E, O.Option<B>>
) => (ta: O.Option<A>) => EffectOption<S, R, E, O.Option<B>> = (f) => (ta) =>
  O.option.wither(effectOption)(ta, f)

export const sequenceEither = E.either.sequence(effectOption)

export const traverseEither: <A, S, R, FE, B>(
  f: (a: A) => EffectOption<S, R, FE, B>
) => <TE>(ta: E.Either<TE, A>) => EffectOption<S, R, FE, E.Either<TE, B>> = (f) => (
  ta
) => E.either.traverse(effectOption)(ta, f)

export const sequenceTree = TR.tree.sequence(effectOption)

export const traverseTree: <A, S, R, E, B>(
  f: (a: A) => EffectOption<S, R, E, B>
) => (ta: TR.Tree<A>) => EffectOption<S, R, E, TR.Tree<B>> = (f) => (ta) =>
  TR.tree.traverse(effectOption)(ta, f)

export const sequenceArray = Ar.array.sequence(effectOption)

export const traverseArray: <A, S, R, E, B>(
  f: (a: A) => EffectOption<S, R, E, B>
) => (ta: Array<A>) => EffectOption<S, R, E, Array<B>> = (f) => (ta) =>
  Ar.array.traverse(effectOption)(ta, f)

export const traverseArrayWithIndex: <A, S, R, E, B>(
  f: (i: number, a: A) => EffectOption<S, R, E, B>
) => (ta: Array<A>) => EffectOption<S, R, E, Array<B>> = (f) => (ta) =>
  Ar.array.traverseWithIndex(effectOption)(ta, f)

export const wiltArray: <A, S, R, E, B, C>(
  f: (a: A) => EffectOption<S, R, E, E.Either<B, C>>
) => (wa: Array<A>) => EffectOption<S, R, E, Separated<Array<B>, Array<C>>> = (f) => (
  wa
) => Ar.array.wilt(effectOption)(wa, f)

export const witherArray: <A, S, R, E, B>(
  f: (a: A) => EffectOption<S, R, E, O.Option<B>>
) => (ta: Array<A>) => EffectOption<S, R, E, Array<B>> = (f) => (ta) =>
  Ar.array.wither(effectOption)(ta, f)

export const sequenceRecord = RE.record.sequence(effectOption)

export const traverseRecord: <A, S, R, E, B>(
  f: (a: A) => EffectOption<S, R, E, B>
) => (ta: Record<string, A>) => EffectOption<S, R, E, Record<string, B>> = (f) => (
  ta
) => RE.record.traverse(effectOption)(ta, f)

export const traverseRecordWithIndex: <A, S, R, E, B>(
  f: (k: string, a: A) => EffectOption<S, R, E, B>
) => (ta: Record<string, A>) => EffectOption<S, R, E, Record<string, B>> = (f) => (
  ta
) => RE.record.traverseWithIndex(effectOption)(ta, f)

export const wiltRecord: <A, S, R, E, B, C>(
  f: (a: A) => EffectOption<S, R, E, E.Either<B, C>>
) => (
  wa: Record<string, A>
) => EffectOption<S, R, E, Separated<Record<string, B>, Record<string, C>>> = (f) => (
  wa
) => RE.record.wilt(effectOption)(wa, f)

export const witherRecord: <A, S, R, E, B>(
  f: (a: A) => EffectOption<S, R, E, O.Option<B>>
) => (ta: Record<string, A>) => EffectOption<S, R, E, Record<string, B>> = (f) => (
  ta
) => RE.record.wither(effectOption)(ta, f)

export const parSequenceT = ST(effectOptionPar)
export const parSequenceS = SS(effectOptionPar)
export const parDo = () => DoG(effectOptionPar)
export const parFor = () => ForM(effectOptionPar)

export const parSequenceTree = TR.tree.sequence(effectOptionPar)

export const parTraverseTree: <A, S, R, E, B>(
  f: (a: A) => EffectOption<S, R, E, B>
) => (ta: TR.Tree<A>) => EffectOption<unknown, R, E, TR.Tree<B>> = (f) => (ta) =>
  TR.tree.traverse(effectOptionPar)(ta, f)

export const parSequenceArray = Ar.array.sequence(effectOptionPar)

export const parTraverseArray: <A, S, R, E, B>(
  f: (a: A) => EffectOption<S, R, E, B>
) => (ta: Array<A>) => EffectOption<unknown, R, E, Array<B>> = (f) => (ta) =>
  Ar.array.traverse(effectOptionPar)(ta, f)

export const parTraverseArrayWithIndex: <A, S, R, E, B>(
  f: (i: number, a: A) => EffectOption<S, R, E, B>
) => (ta: Array<A>) => EffectOption<unknown, R, E, Array<B>> = (f) => (ta) =>
  Ar.array.traverseWithIndex(effectOptionPar)(ta, f)

export const parWiltArray: <A, S, R, E, B, C>(
  f: (a: A) => EffectOption<S, R, E, E.Either<B, C>>
) => (wa: Array<A>) => EffectOption<unknown, R, E, Separated<Array<B>, Array<C>>> = (
  f
) => (wa) => Ar.array.wilt(effectOptionPar)(wa, f)

export const parWitherArray: <A, S, R, E, B>(
  f: (a: A) => EffectOption<S, R, E, O.Option<B>>
) => (ta: Array<A>) => EffectOption<unknown, R, E, Array<B>> = (f) => (ta) =>
  Ar.array.wither(effectOptionPar)(ta, f)

export const parSequenceRecord = RE.record.sequence(effectOptionPar)

export const parTraverseRecord: <A, S, R, E, B>(
  f: (a: A) => EffectOption<S, R, E, B>
) => (ta: Record<string, A>) => EffectOption<unknown, R, E, Record<string, B>> = (
  f
) => (ta) => RE.record.traverse(effectOptionPar)(ta, f)

export const parTraverseRecordWithIndex: <A, S, R, E, B>(
  f: (k: string, a: A) => EffectOption<S, R, E, B>
) => (ta: Record<string, A>) => EffectOption<unknown, R, E, Record<string, B>> = (
  f
) => (ta) => RE.record.traverseWithIndex(effectOptionPar)(ta, f)

export const parWiltRecord: <A, S, R, E, B, C>(
  f: (a: A) => EffectOption<S, R, E, E.Either<B, C>>
) => (
  wa: Record<string, A>
) => EffectOption<unknown, R, E, Separated<Record<string, B>, Record<string, C>>> = (
  f
) => (wa) => RE.record.wilt(effectOptionPar)(wa, f)

export const parWitherRecord: <A, S, R, E, B>(
  f: (a: A) => EffectOption<S, R, E, O.Option<B>>
) => (ta: Record<string, A>) => EffectOption<unknown, R, E, Record<string, B>> = (
  f
) => (ta) => RE.record.wither(effectOptionPar)(ta, f)
