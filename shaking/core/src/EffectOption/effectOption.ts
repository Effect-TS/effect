import { Do as DoG } from "fp-ts-contrib/lib/Do"
import { sequenceS as SS, sequenceT as ST } from "fp-ts/lib/Apply"
import { array } from "fp-ts/lib/Array"
import { Separated } from "fp-ts/lib/Compactable"
import { Monoid, fold as foldMonoid } from "fp-ts/lib/Monoid"
import { record } from "fp-ts/lib/Record"
import { tree, Tree } from "fp-ts/lib/Tree"
import { pipeable } from "fp-ts/lib/pipeable"

import {
  Effect,
  pure,
  effect,
  witherOption as witherOption_1,
  parZipWith,
  chainTap as chainTap_1,
  chainTap_,
  zipWith_
} from "../Effect"
import { Either, either } from "../Either"
import { flow, FunctionN } from "../Function"
import {
  some as some_1,
  map as map_1,
  fold,
  option,
  fromNullable as fromNullable_1,
  none as none_1,
  isNone,
  Option
} from "../Option"
import { ForM } from "../Support/For"
import {
  STypeOf,
  RTypeOf,
  ETypeOf,
  ATypeOf,
  Monad4E,
  Monad4EP,
  UnionToIntersection
} from "../Support/Overloads"

export interface EffectOption<S, R, E, A> extends Effect<S, R, E, Option<A>> {}

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
  [k in keyof Effs]: ATypeOf<Effs[k]> extends Option<infer A> ? A : never
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
    bind: FunctionN<[A], Effect<S2, R2, E2, unknown>>
  ): EffectOption<S1 | S2, R & R2, E | E2, A>
}

export const effectOption: EffectOptionE = {
  URI,
  of: <A>(a: A): EffectOption<never, unknown, never, A> => pure(some_1(a)),
  map: <S, R, E, A, B>(
    fa: EffectOption<S, R, E, A>,
    f: (a: A) => B
  ): EffectOption<S, R, E, B> => effect.map(fa, map_1(f)),
  chain: <S1, S2, R, E, A, R2, E2, B>(
    fa: EffectOption<S1, R, E, A>,
    f: (a: A) => EffectOption<S2, R2, E2, B>
  ): EffectOption<S1 | S2, R & R2, E | E2, B> => effect.chain(fa, witherOption_1(f)),
  chainTap: <S1, S2, R, E, A, R2, E2>(
    inner: EffectOption<S1, R, E, A>,
    bind: FunctionN<[A], Effect<S2, R2, E2, unknown>>
  ): EffectOption<S1 | S2, R & R2, E | E2, A> =>
    chainTap_(
      inner,
      fold(() => none, bind)
    ),
  ap: <S1, S2, R, E, A, B, R2, E2>(
    fab: EffectOption<S1, R, E, (a: A) => B>,
    fa: EffectOption<S2, R2, E2, A>
  ): EffectOption<S1 | S2, R & R2, E | E2, B> => zipWith_(fab, fa, option.ap)
}

export interface EffectOptionEP extends Monad4EP<URI> {
  chainTap<S1, S2, R, E, A, R2, E2>(
    inner: EffectOption<S1, R, E, A>,
    bind: FunctionN<[A], Effect<S2, R2, E2, unknown>>
  ): EffectOption<S1 | S2, R & R2, E | E2, A>
}

export const effectOptionPar: EffectOptionEP = {
  URI,
  _CTX: "async",
  of: <A>(a: A): EffectOption<never, unknown, never, A> => pure(some_1(a)),
  map: <S, R, E, A, B>(
    fa: EffectOption<S, R, E, A>,
    f: (a: A) => B
  ): EffectOption<S, R, E, B> => effect.map(fa, map_1(f)),
  chain: <S1, S2, R, E, A, R2, E2, B>(
    fa: EffectOption<S1, R, E, A>,
    f: (a: A) => EffectOption<S2, R2, E2, B>
  ): EffectOption<S1 | S2, R & R2, E | E2, B> => effect.chain(fa, witherOption_1(f)),
  chainTap: <S1, S2, R, E, A, R2, E2>(
    inner: EffectOption<S1, R, E, A>,
    bind: FunctionN<[A], Effect<S2, R2, E2, unknown>>
  ): EffectOption<S1 | S2, R & R2, E | E2, A> =>
    chainTap_(
      inner,
      fold(() => none, bind)
    ),
  ap: <S1, S2, R, E, A, B, R2, E2>(
    fab: EffectOption<S1, R, E, (a: A) => B>,
    fa: EffectOption<S2, R2, E2, A>
  ): EffectOption<unknown, R & R2, E | E2, B> => parZipWith(fab, fa, option.ap)
}

export const { ap, apFirst, apSecond, chain, chainFirst, flatten, map } = pipeable(
  effectOption
)
export const { ap: parAp, apFirst: parApFirst, apSecond: parApSecond } = pipeable(
  effectOptionPar
)

export const fromNullable = flow(fromNullable_1, pure)

export const some = <A>(a: A): Sync<A> => pure(some_1(a))

export const none: Sync<never> = pure(none_1)

export const fromOption = <A>(a: Option<A>): Sync<A> => pure(a)

export const mapNone = <A2>(f: () => A2) => <S, R, E, A>(
  _: EffectOption<S, R, E, A>
): EffectOption<S, R, E, A | A2> => effect.map(_, (x) => (isNone(x) ? some_1(f()) : x))

export const chainNone = <S2, R2, E2, A2>(f: EffectOption<S2, R2, E2, A2>) => <
  S,
  R,
  E,
  A
>(
  _: EffectOption<S, R, E, A>
): EffectOption<S | S2, R & R2, E | E2, A | A2> =>
  effect.chain(_, (x) => (isNone(x) ? f : pure(x as Option<A | A2>)))

export const chainTap = <S, R, E, A>(bind: FunctionN<[A], Effect<S, R, E, unknown>>) =>
  chainTap_1(fold(() => none, bind))

export function getFirstMonoid<S, R, E, A>(): Monoid<EffectOption<S, R, E, A>> {
  return {
    concat(x: EffectOption<S, R, E, A>, y: EffectOption<S, R, E, A>) {
      return effect.chain(x, (o) => (isNone(o) ? y : x))
    },
    empty: pure(none_1)
  }
}

export function getLastMonoid<S, R, E, A>(): Monoid<EffectOption<S, R, E, A>> {
  return {
    concat(x: EffectOption<S, R, E, A>, y: EffectOption<S, R, E, A>) {
      return effect.chain(y, (o) => (isNone(o) ? x : y))
    },
    empty: pure(none_1)
  }
}

export const getFirst = <Effs extends EffectOption<any, any, any, any>[]>(
  ...items: Effs
): EffectOption<SOf<Effs>, ROf<Effs>, EOf<Effs>, AOf<Effs>> =>
  foldMonoid(getFirstMonoid<SOf<Effs>, ROf<Effs>, EOf<Effs>, AOf<Effs>>())(items)

export const getLast = <Effs extends EffectOption<any, any, any, any>[]>(
  ...items: Effs
): EffectOption<SOf<Effs>, ROf<Effs>, EOf<Effs>, AOf<Effs>> =>
  foldMonoid(getLastMonoid<SOf<Effs>, ROf<Effs>, EOf<Effs>, AOf<Effs>>())(items)

export const sequenceT = ST(effectOption)
export const sequenceS = SS(effectOption)
export const Do = () => DoG(effectOption)
export const For = () => ForM(effectOption)

export const sequenceOption = option.sequence(effectOption)

export const traverseOption: <A, S, R, E, B>(
  f: (a: A) => EffectOption<S, R, E, B>
) => (ta: Option<A>) => EffectOption<S, R, E, Option<B>> = (f) => (ta) =>
  option.traverse(effectOption)(ta, f)

export const wiltOption: <A, S, R, E, B, C>(
  f: (a: A) => EffectOption<S, R, E, Either<B, C>>
) => (wa: Option<A>) => EffectOption<S, R, E, Separated<Option<B>, Option<C>>> = (
  f
) => (wa) => option.wilt(effectOption)(wa, f)

export const witherOption: <A, S, R, E, B>(
  f: (a: A) => EffectOption<S, R, E, Option<B>>
) => (ta: Option<A>) => EffectOption<S, R, E, Option<B>> = (f) => (ta) =>
  option.wither(effectOption)(ta, f)

export const sequenceEither = either.sequence(effectOption)

export const traverseEither: <A, S, R, FE, B>(
  f: (a: A) => EffectOption<S, R, FE, B>
) => <TE>(ta: Either<TE, A>) => EffectOption<S, R, FE, Either<TE, B>> = (f) => (ta) =>
  either.traverse(effectOption)(ta, f)

export const sequenceTree = tree.sequence(effectOption)

export const traverseTree: <A, S, R, E, B>(
  f: (a: A) => EffectOption<S, R, E, B>
) => (ta: Tree<A>) => EffectOption<S, R, E, Tree<B>> = (f) => (ta) =>
  tree.traverse(effectOption)(ta, f)

export const sequenceArray = array.sequence(effectOption)

export const traverseArray: <A, S, R, E, B>(
  f: (a: A) => EffectOption<S, R, E, B>
) => (ta: Array<A>) => EffectOption<S, R, E, Array<B>> = (f) => (ta) =>
  array.traverse(effectOption)(ta, f)

export const traverseArrayWithIndex: <A, S, R, E, B>(
  f: (i: number, a: A) => EffectOption<S, R, E, B>
) => (ta: Array<A>) => EffectOption<S, R, E, Array<B>> = (f) => (ta) =>
  array.traverseWithIndex(effectOption)(ta, f)

export const wiltArray: <A, S, R, E, B, C>(
  f: (a: A) => EffectOption<S, R, E, Either<B, C>>
) => (wa: Array<A>) => EffectOption<S, R, E, Separated<Array<B>, Array<C>>> = (f) => (
  wa
) => array.wilt(effectOption)(wa, f)

export const witherArray: <A, S, R, E, B>(
  f: (a: A) => EffectOption<S, R, E, Option<B>>
) => (ta: Array<A>) => EffectOption<S, R, E, Array<B>> = (f) => (ta) =>
  array.wither(effectOption)(ta, f)

export const sequenceRecord = record.sequence(effectOption)

export const traverseRecord: <A, S, R, E, B>(
  f: (a: A) => EffectOption<S, R, E, B>
) => (ta: Record<string, A>) => EffectOption<S, R, E, Record<string, B>> = (f) => (
  ta
) => record.traverse(effectOption)(ta, f)

export const traverseRecordWithIndex: <A, S, R, E, B>(
  f: (k: string, a: A) => EffectOption<S, R, E, B>
) => (ta: Record<string, A>) => EffectOption<S, R, E, Record<string, B>> = (f) => (
  ta
) => record.traverseWithIndex(effectOption)(ta, f)

export const wiltRecord: <A, S, R, E, B, C>(
  f: (a: A) => EffectOption<S, R, E, Either<B, C>>
) => (
  wa: Record<string, A>
) => EffectOption<S, R, E, Separated<Record<string, B>, Record<string, C>>> = (f) => (
  wa
) => record.wilt(effectOption)(wa, f)

export const witherRecord: <A, S, R, E, B>(
  f: (a: A) => EffectOption<S, R, E, Option<B>>
) => (ta: Record<string, A>) => EffectOption<S, R, E, Record<string, B>> = (f) => (
  ta
) => record.wither(effectOption)(ta, f)

export const parSequenceT = ST(effectOptionPar)
export const parSequenceS = SS(effectOptionPar)
export const parDo = () => DoG(effectOptionPar)
export const parFor = () => ForM(effectOptionPar)

export const parSequenceTree = tree.sequence(effectOptionPar)

export const parTraverseTree: <A, S, R, E, B>(
  f: (a: A) => EffectOption<S, R, E, B>
) => (ta: Tree<A>) => EffectOption<unknown, R, E, Tree<B>> = (f) => (ta) =>
  tree.traverse(effectOptionPar)(ta, f)

export const parSequenceArray = array.sequence(effectOptionPar)

export const parTraverseArray: <A, S, R, E, B>(
  f: (a: A) => EffectOption<S, R, E, B>
) => (ta: Array<A>) => EffectOption<unknown, R, E, Array<B>> = (f) => (ta) =>
  array.traverse(effectOptionPar)(ta, f)

export const parTraverseArrayWithIndex: <A, S, R, E, B>(
  f: (i: number, a: A) => EffectOption<S, R, E, B>
) => (ta: Array<A>) => EffectOption<unknown, R, E, Array<B>> = (f) => (ta) =>
  array.traverseWithIndex(effectOptionPar)(ta, f)

export const parWiltArray: <A, S, R, E, B, C>(
  f: (a: A) => EffectOption<S, R, E, Either<B, C>>
) => (wa: Array<A>) => EffectOption<unknown, R, E, Separated<Array<B>, Array<C>>> = (
  f
) => (wa) => array.wilt(effectOptionPar)(wa, f)

export const parWitherArray: <A, S, R, E, B>(
  f: (a: A) => EffectOption<S, R, E, Option<B>>
) => (ta: Array<A>) => EffectOption<unknown, R, E, Array<B>> = (f) => (ta) =>
  array.wither(effectOptionPar)(ta, f)

export const parSequenceRecord = record.sequence(effectOptionPar)

export const parTraverseRecord: <A, S, R, E, B>(
  f: (a: A) => EffectOption<S, R, E, B>
) => (ta: Record<string, A>) => EffectOption<unknown, R, E, Record<string, B>> = (
  f
) => (ta) => record.traverse(effectOptionPar)(ta, f)

export const parTraverseRecordWithIndex: <A, S, R, E, B>(
  f: (k: string, a: A) => EffectOption<S, R, E, B>
) => (ta: Record<string, A>) => EffectOption<unknown, R, E, Record<string, B>> = (
  f
) => (ta) => record.traverseWithIndex(effectOptionPar)(ta, f)

export const parWiltRecord: <A, S, R, E, B, C>(
  f: (a: A) => EffectOption<S, R, E, Either<B, C>>
) => (
  wa: Record<string, A>
) => EffectOption<unknown, R, E, Separated<Record<string, B>, Record<string, C>>> = (
  f
) => (wa) => record.wilt(effectOptionPar)(wa, f)

export const parWitherRecord: <A, S, R, E, B>(
  f: (a: A) => EffectOption<S, R, E, Option<B>>
) => (ta: Record<string, A>) => EffectOption<unknown, R, E, Record<string, B>> = (
  f
) => (ta) => record.wither(effectOptionPar)(ta, f)
