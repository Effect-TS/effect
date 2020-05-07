import {
  effect as T,
  managed as M,
  stream as S,
  streameither as SE
} from "@matechs/effect"
import { array as Ar, tree as TR, record as RE } from "fp-ts"
import { Do as DoG } from "fp-ts-contrib/lib/Do"
import { sequenceS as SS, sequenceT as ST } from "fp-ts/lib/Apply"
import { Separated } from "fp-ts/lib/Compactable"
import * as MON from "fp-ts/lib/Monoid"
import { isNone, Option, option, getFirstMonoid, getLastMonoid } from "fp-ts/lib/Option"

import * as Ei from "./either"
import { AOfOptions } from "./utils"

// from fp-ts just retyped
/* istanbul ignore file */

export {
  alt,
  ap,
  apFirst,
  apSecond,
  chain,
  chainFirst,
  compact,
  duplicate,
  elem,
  exists,
  extend,
  filter,
  filterMap,
  flatten,
  foldMap,
  fromEither,
  fromNullable,
  fromPredicate,
  getApplyMonoid,
  getApplySemigroup,
  getEq,
  getFirstMonoid,
  getLastMonoid,
  getLeft,
  getMonoid,
  getOrd,
  getRefinement,
  getRight,
  getShow,
  isNone,
  isSome,
  map,
  mapNullable,
  None,
  none,
  Option,
  option,
  partition,
  partitionMap,
  reduce,
  reduceRight,
  separate,
  Some,
  some,
  toNullable,
  toUndefined,
  tryCatch,
  URI
} from "fp-ts/lib/Option"

export function fold<S1, S2, A, B, C, R1, E1, R2, E2>(
  onNone: () => T.Effect<S1, R1, E1, B>,
  onSome: (a: A) => T.Effect<S2, R2, E2, C>
): (ma: Option<A>) => T.Effect<S1 | S2, R1 & R2, E1 | E2, B | C>
export function fold<S1, S2, A, B, C, R1, E1, R2, E2>(
  onNone: () => S.Stream<S1, R1, E1, B>,
  onSome: (a: A) => S.Stream<S2, R2, E2, C>
): (ma: Option<A>) => S.Stream<S1 | S2, R1 & R2, E1 | E2, B | C>
export function fold<S1, S2, A, B, C, R1, E1, R2, E2>(
  onNone: () => SE.StreamEither<S1, R1, E1, B>,
  onSome: (a: A) => SE.StreamEither<S2, R2, E2, C>
): (ma: Option<A>) => SE.StreamEither<S1 | S2, R1 & R2, E1 | E2, B | C>
export function fold<S1, S2, A, B, C, R1, E1, R2, E2>(
  onNone: () => M.Managed<S1, R1, E1, B>,
  onSome: (a: A) => M.Managed<S2, R2, E2, C>
): (ma: Option<A>) => M.Managed<S1 | S2, R1 & R2, E1 | E2, B | C>
export function fold<A, B, C>(
  onNone: () => B,
  onSome: (a: A) => C
): (ma: Option<A>) => B | C
export function fold<A, B>(onNone: () => B, onSome: (a: A) => B): (ma: Option<A>) => B {
  return (ma) => (isNone(ma) ? onNone() : onSome(ma.value))
}

export const sequenceT = ST(option)
export const sequenceS = SS(option)
export const Do = () => DoG(option)

export const sequenceEither = option.sequence(Ei.either)

export const traverseEither: <A, E, B>(
  f: (a: A) => Ei.Either<E, B>
) => (ta: Option<A>) => Ei.Either<E, Option<B>> = (f) => (ta) =>
  option.traverse(Ei.either)(ta, f)

export const sequenceTree = TR.tree.sequence(option)

export const traverseTree: <A, B>(
  f: (a: A) => Option<B>
) => (ta: TR.Tree<A>) => Option<TR.Tree<B>> = (f) => (ta) =>
  TR.tree.traverse(option)(ta, f)

export const sequenceArray = Ar.array.sequence(option)

export const traverseArray: <A, B>(
  f: (a: A) => Option<B>
) => (ta: Array<A>) => Option<Array<B>> = (f) => (ta) =>
  Ar.array.traverse(option)(ta, f)

export const traverseArrayWithIndex: <A, E, B>(
  f: (i: number, a: A) => Option<B>
) => (ta: Array<A>) => Option<Array<B>> = (f) => (ta) =>
  Ar.array.traverseWithIndex(option)(ta, f)

export const wiltArray: <A, B, C>(
  f: (a: A) => Option<Ei.Either<B, C>>
) => (wa: Array<A>) => Option<Separated<Array<B>, Array<C>>> = (f) => (wa) =>
  Ar.array.wilt(option)(wa, f)

export const witherArray: <A, B>(
  f: (a: A) => Option<Option<B>>
) => (ta: Array<A>) => Option<Array<B>> = (f) => (ta) => Ar.array.wither(option)(ta, f)

export const sequenceRecord = RE.record.sequence(option)

export const traverseRecord: <A, B>(
  f: (a: A) => Option<B>
) => (ta: Record<string, A>) => Option<Record<string, B>> = (f) => (ta) =>
  RE.record.traverse(option)(ta, f)

export const traverseRecordWithIndex: <A, E, B>(
  f: (k: string, a: A) => Option<B>
) => (ta: Record<string, A>) => Option<Record<string, B>> = (f) => (ta) =>
  RE.record.traverseWithIndex(option)(ta, f)

export const wiltRecord: <A, B, C>(
  f: (a: A) => Option<Ei.Either<B, C>>
) => (
  wa: Record<string, A>
) => Option<Separated<Record<string, B>, Record<string, C>>> = (f) => (wa) =>
  RE.record.wilt(option)(wa, f)

export const witherRecord: <A, B>(
  f: (a: A) => Option<Option<B>>
) => (ta: Record<string, A>) => Option<Record<string, B>> = (f) => (ta) =>
  RE.record.wither(option)(ta, f)

export const getFirst = <Ts extends Option<any>[]>(
  ...items: Ts
): Option<AOfOptions<Ts>> => MON.fold(getFirstMonoid<AOfOptions<Ts>>())(items)

export const getLast = <Ts extends Option<any>[]>(
  ...items: Ts
): Option<AOfOptions<Ts>> => MON.fold(getLastMonoid<AOfOptions<Ts>>())(items)

export function getOrElse<S2, R2, E2, B>(
  onNone: () => T.Effect<S2, R2, E2, B>
): <S, R, E, A>(
  ma: Option<T.Effect<S, R, E, A>>
) => T.Effect<S | S2, R & R2, E | E2, A | B>
export function getOrElse<S2, R2, E2, B>(
  onNone: () => M.Managed<S2, R2, E2, B>
): <S, R, E, A>(
  ma: Option<M.Managed<S, R, E, A>>
) => M.Managed<S | S2, R & R2, E | E2, A | B>
export function getOrElse<S2, R2, E2, B>(
  onNone: () => S.Stream<S2, R2, E2, B>
): <S, R, E, A>(
  ma: Option<S.Stream<S, R, E, A>>
) => S.Stream<S | S2, R & R2, E | E2, A | B>
export function getOrElse<S2, R2, E2, B>(
  onNone: () => SE.StreamEither<S2, R2, E2, B>
): <S, R, E, A>(
  ma: Option<SE.StreamEither<S, R, E, A>>
) => SE.StreamEither<S | S2, R & R2, E | E2, A | B>
export function getOrElse<B>(onNone: () => B): <A>(ma: Option<A>) => A | B
export function getOrElse<A>(onNone: () => A): (ma: Option<A>) => A {
  return (o) => (o._tag === "None" ? onNone() : o.value)
}
