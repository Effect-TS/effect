import { effect as T } from "@matechs/effect";
import * as O from "./option";
import * as E from "./either";
import { record as RE, tree as TR, array as Ar } from "fp-ts";
import { Monad4E, Monad4EP } from "@matechs/effect/lib/overloadEff";
import { pipeable } from "fp-ts/lib/pipeable";
import * as MON from "fp-ts/lib/Monoid";
import { ROf, EOf, AOf, SOf } from "./utils";
import { sequenceS as SS, sequenceT as ST } from "fp-ts/lib/Apply";
import { Do as DoG } from "fp-ts-contrib/lib/Do";
import { Separated } from "fp-ts/lib/Compactable";

export type EffectOption<S, R, E, A> = T.Effect<S, R, E, O.Option<A>>;

export const URI = "@matechs/prelude/EffectOption";
export type URI = typeof URI;

declare module "fp-ts/lib/HKT" {
  interface URItoKind4<S, R, E, A> {
    [URI]: EffectOption<S, R, E, A>;
  }
}

declare module "@matechs/effect/lib/overloadEff" {
  interface MaToKind<S, R, E, A> {
    [URI]: EffectOption<S, R, E, A>;
  }
}

export const effectOption: Monad4E<URI> = {
  URI,
  of: <A>(a: A): EffectOption<never, unknown, never, A> => T.pure(O.some(a)),
  map: <S, R, E, A, B>(fa: EffectOption<S, R, E, A>, f: (a: A) => B): EffectOption<S, R, E, B> =>
    T.effect.map(fa, O.map(f)),
  chain: <S1, S2, R, E, A, R2, E2, B>(
    fa: EffectOption<S1, R, E, A>,
    f: (a: A) => EffectOption<S2, R2, E2, B>
  ): EffectOption<S1 | S2, R & R2, E | E2, B> => T.effect.chain(fa, T.witherOption(f)),
  ap: <S1, S2, R, E, A, B, R2, E2>(
    fab: EffectOption<S1, R, E, (a: A) => B>,
    fa: EffectOption<S2, R2, E2, A>
  ): EffectOption<S1 | S2, R & R2, E | E2, B> => T.effect.zipWith(fab, fa, O.option.ap)
};

export const effectOptionPar: Monad4EP<URI> = {
  URI,
  _CTX: "async",
  of: <A>(a: A): EffectOption<never, unknown, never, A> => T.pure(O.some(a)),
  map: <S, R, E, A, B>(fa: EffectOption<S, R, E, A>, f: (a: A) => B): EffectOption<S, R, E, B> =>
    T.effect.map(fa, O.map(f)),
  chain: <S1, S2, R, E, A, R2, E2, B>(
    fa: EffectOption<S1, R, E, A>,
    f: (a: A) => EffectOption<S2, R2, E2, B>
  ): EffectOption<S1 | S2, R & R2, E | E2, B> => T.effect.chain(fa, T.witherOption(f)),
  ap: <S1, S2, R, E, A, B, R2, E2>(
    fab: EffectOption<S1, R, E, (a: A) => B>,
    fa: EffectOption<S2, R2, E2, A>
  ): EffectOption<unknown, R & R2, E | E2, B> => T.parZipWith(fab, fa, O.option.ap)
};

export const { ap, apFirst, apSecond, chain, chainFirst, flatten, map } = pipeable(effectOption);
export const { ap: parAp, apFirst: parApFirst, apSecond: parApSecond } = pipeable(effectOptionPar);

export function getFirstMonoid<S, R, E, A>(): MON.Monoid<EffectOption<S, R, E, A>> {
  return {
    concat(x: EffectOption<S, R, E, A>, y: EffectOption<S, R, E, A>) {
      return T.effect.chain(x, (o) => (O.isNone(o) ? y : x));
    },
    empty: T.pure(O.none)
  };
}

export function getLastMonoid<S, R, E, A>(): MON.Monoid<EffectOption<S, R, E, A>> {
  return {
    concat(x: EffectOption<S, R, E, A>, y: EffectOption<S, R, E, A>) {
      return T.effect.chain(y, (o) => (O.isNone(o) ? x : y));
    },
    empty: T.pure(O.none)
  };
}

export const getFirst = <Effs extends EffectOption<any, any, any, any>[]>(
  ...items: Effs
): EffectOption<SOf<Effs>, ROf<Effs>, EOf<Effs>, AOf<Effs>> =>
  MON.fold(getFirstMonoid<SOf<Effs>, ROf<Effs>, EOf<Effs>, AOf<Effs>>())(items);

export const getLast = <Effs extends EffectOption<any, any, any, any>[]>(
  ...items: Effs
): EffectOption<SOf<Effs>, ROf<Effs>, EOf<Effs>, AOf<Effs>> =>
  MON.fold(getLastMonoid<SOf<Effs>, ROf<Effs>, EOf<Effs>, AOf<Effs>>())(items);

export const sequenceT = ST(effectOption);
export const sequenceS = SS(effectOption);
export const Do = () => DoG(effectOption);

export const sequenceOption = O.option.sequence(effectOption);

export const traverseOption: <A, S, R, E, B>(
  f: (a: A) => EffectOption<S, R, E, B>
) => (ta: O.Option<A>) => EffectOption<S, R, E, O.Option<B>> = (f) => (ta) =>
  O.option.traverse(effectOption)(ta, f);

export const wiltOption: <A, S, R, E, B, C>(
  f: (a: A) => EffectOption<S, R, E, E.Either<B, C>>
) => (wa: O.Option<A>) => EffectOption<S, R, E, Separated<O.Option<B>, O.Option<C>>> = (f) => (
  wa
) => O.option.wilt(effectOption)(wa, f);

export const witherOption: <A, S, R, E, B>(
  f: (a: A) => EffectOption<S, R, E, O.Option<B>>
) => (ta: O.Option<A>) => EffectOption<S, R, E, O.Option<B>> = (f) => (ta) =>
  O.option.wither(effectOption)(ta, f);

export const sequenceEither = E.either.sequence(effectOption);

export const traverseEither: <A, S, R, FE, B>(
  f: (a: A) => EffectOption<S, R, FE, B>
) => <TE>(ta: E.Either<TE, A>) => EffectOption<S, R, FE, E.Either<TE, B>> = (f) => (ta) =>
  E.either.traverse(effectOption)(ta, f);

export const sequenceTree = TR.tree.sequence(effectOption);

export const traverseTree: <A, S, R, E, B>(
  f: (a: A) => EffectOption<S, R, E, B>
) => (ta: TR.Tree<A>) => EffectOption<S, R, E, TR.Tree<B>> = (f) => (ta) =>
  TR.tree.traverse(effectOption)(ta, f);

export const sequenceArray = Ar.array.sequence(effectOption);

export const traverseArray: <A, S, R, E, B>(
  f: (a: A) => EffectOption<S, R, E, B>
) => (ta: Array<A>) => EffectOption<S, R, E, Array<B>> = (f) => (ta) =>
  Ar.array.traverse(effectOption)(ta, f);

export const traverseArrayWithIndex: <A, S, R, E, B>(
  f: (i: number, a: A) => EffectOption<S, R, E, B>
) => (ta: Array<A>) => EffectOption<S, R, E, Array<B>> = (f) => (ta) =>
  Ar.array.traverseWithIndex(effectOption)(ta, f);

export const wiltArray: <A, S, R, E, B, C>(
  f: (a: A) => EffectOption<S, R, E, E.Either<B, C>>
) => (wa: Array<A>) => EffectOption<S, R, E, Separated<Array<B>, Array<C>>> = (f) => (wa) =>
  Ar.array.wilt(effectOption)(wa, f);

export const witherArray: <A, S, R, E, B>(
  f: (a: A) => EffectOption<S, R, E, O.Option<B>>
) => (ta: Array<A>) => EffectOption<S, R, E, Array<B>> = (f) => (ta) =>
  Ar.array.wither(effectOption)(ta, f);

export const sequenceRecord = RE.record.sequence(effectOption);

export const traverseRecord: <A, S, R, E, B>(
  f: (a: A) => EffectOption<S, R, E, B>
) => (ta: Record<string, A>) => EffectOption<S, R, E, Record<string, B>> = (f) => (ta) =>
  RE.record.traverse(effectOption)(ta, f);

export const traverseRecordWithIndex: <A, S, R, E, B>(
  f: (k: string, a: A) => EffectOption<S, R, E, B>
) => (ta: Record<string, A>) => EffectOption<S, R, E, Record<string, B>> = (f) => (ta) =>
  RE.record.traverseWithIndex(effectOption)(ta, f);

export const wiltRecord: <A, S, R, E, B, C>(
  f: (a: A) => EffectOption<S, R, E, E.Either<B, C>>
) => (
  wa: Record<string, A>
) => EffectOption<S, R, E, Separated<Record<string, B>, Record<string, C>>> = (f) => (wa) =>
  RE.record.wilt(effectOption)(wa, f);

export const witherRecord: <A, S, R, E, B>(
  f: (a: A) => EffectOption<S, R, E, O.Option<B>>
) => (ta: Record<string, A>) => EffectOption<S, R, E, Record<string, B>> = (f) => (ta) =>
  RE.record.wither(effectOption)(ta, f);

export const parSequenceT = ST(effectOptionPar);
export const parSequenceS = SS(effectOptionPar);
export const parDo = () => DoG(effectOptionPar);

export const parSequenceOption = O.option.sequence(effectOptionPar);

export const parTraverseOption: <A, S, R, E, B>(
  f: (a: A) => EffectOption<S, R, E, B>
) => (ta: O.Option<A>) => EffectOption<unknown, R, E, O.Option<B>> = (f) => (ta) =>
  O.option.traverse(effectOptionPar)(ta, f);

export const parWiltOption: <A, S, R, E, B, C>(
  f: (a: A) => EffectOption<S, R, E, E.Either<B, C>>
) => (wa: O.Option<A>) => EffectOption<unknown, R, E, Separated<O.Option<B>, O.Option<C>>> = (
  f
) => (wa) => O.option.wilt(effectOptionPar)(wa, f);

export const parWitherOption: <A, S, R, E, B>(
  f: (a: A) => EffectOption<S, R, E, O.Option<B>>
) => (ta: O.Option<A>) => EffectOption<unknown, R, E, O.Option<B>> = (f) => (ta) =>
  O.option.wither(effectOptionPar)(ta, f);

export const parSequenceEither = E.either.sequence(effectOptionPar);

export const parTraverseEither: <A, S, R, FE, B>(
  f: (a: A) => EffectOption<S, R, FE, B>
) => <TE>(ta: E.Either<TE, A>) => EffectOption<unknown, R, FE, E.Either<TE, B>> = (f) => (ta) =>
  E.either.traverse(effectOptionPar)(ta, f);

export const parSequenceTree = TR.tree.sequence(effectOptionPar);

export const parTraverseTree: <A, S, R, E, B>(
  f: (a: A) => EffectOption<S, R, E, B>
) => (ta: TR.Tree<A>) => EffectOption<unknown, R, E, TR.Tree<B>> = (f) => (ta) =>
  TR.tree.traverse(effectOptionPar)(ta, f);

export const parSequenceArray = Ar.array.sequence(effectOptionPar);

export const parTraverseArray: <A, S, R, E, B>(
  f: (a: A) => EffectOption<S, R, E, B>
) => (ta: Array<A>) => EffectOption<unknown, R, E, Array<B>> = (f) => (ta) =>
  Ar.array.traverse(effectOptionPar)(ta, f);

export const parTraverseArrayWithIndex: <A, S, R, E, B>(
  f: (i: number, a: A) => EffectOption<S, R, E, B>
) => (ta: Array<A>) => EffectOption<unknown, R, E, Array<B>> = (f) => (ta) =>
  Ar.array.traverseWithIndex(effectOptionPar)(ta, f);

export const parWiltArray: <A, S, R, E, B, C>(
  f: (a: A) => EffectOption<S, R, E, E.Either<B, C>>
) => (wa: Array<A>) => EffectOption<unknown, R, E, Separated<Array<B>, Array<C>>> = (f) => (wa) =>
  Ar.array.wilt(effectOptionPar)(wa, f);

export const parWitherArray: <A, S, R, E, B>(
  f: (a: A) => EffectOption<S, R, E, O.Option<B>>
) => (ta: Array<A>) => EffectOption<unknown, R, E, Array<B>> = (f) => (ta) =>
  Ar.array.wither(effectOptionPar)(ta, f);

export const parSequenceRecord = RE.record.sequence(effectOptionPar);

export const parTraverseRecord: <A, S, R, E, B>(
  f: (a: A) => EffectOption<S, R, E, B>
) => (ta: Record<string, A>) => EffectOption<unknown, R, E, Record<string, B>> = (f) => (ta) =>
  RE.record.traverse(effectOptionPar)(ta, f);

export const parTraverseRecordWithIndex: <A, S, R, E, B>(
  f: (k: string, a: A) => EffectOption<S, R, E, B>
) => (ta: Record<string, A>) => EffectOption<unknown, R, E, Record<string, B>> = (f) => (ta) =>
  RE.record.traverseWithIndex(effectOptionPar)(ta, f);

export const parWiltRecord: <A, S, R, E, B, C>(
  f: (a: A) => EffectOption<S, R, E, E.Either<B, C>>
) => (
  wa: Record<string, A>
) => EffectOption<unknown, R, E, Separated<Record<string, B>, Record<string, C>>> = (f) => (wa) =>
  RE.record.wilt(effectOptionPar)(wa, f);

export const parWitherRecord: <A, S, R, E, B>(
  f: (a: A) => EffectOption<S, R, E, O.Option<B>>
) => (ta: Record<string, A>) => EffectOption<unknown, R, E, Record<string, B>> = (f) => (ta) =>
  RE.record.wither(effectOptionPar)(ta, f);
