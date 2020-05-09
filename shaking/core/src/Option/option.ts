import { Do as DoG } from "fp-ts-contrib/lib/Do"
import { sequenceS as SS, sequenceT as ST } from "fp-ts/lib/Apply"
import { array } from "fp-ts/lib/Array"
import { Separated } from "fp-ts/lib/Compactable"
import { fold as foldMonoid } from "fp-ts/lib/Monoid"
import { isNone, Option, option, getFirstMonoid, getLastMonoid } from "fp-ts/lib/Option"
import { record } from "fp-ts/lib/Record"
import { tree, Tree } from "fp-ts/lib/Tree"

import { Either, either } from "../Either"
import { Effect, Stream, StreamEither, Managed } from "../Support/Common"

export type AOfOptions<Ts extends Option<any>[]> = {
  [k in keyof Ts]: Ts[k] extends Option<infer A> ? A : never
}[number]

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
  onNone: () => Effect<S1, R1, E1, B>,
  onSome: (a: A) => Effect<S2, R2, E2, C>
): (ma: Option<A>) => Effect<S1 | S2, R1 & R2, E1 | E2, B | C>
export function fold<S1, S2, A, B, C, R1, E1, R2, E2>(
  onNone: () => Stream<S1, R1, E1, B>,
  onSome: (a: A) => Stream<S2, R2, E2, C>
): (ma: Option<A>) => Stream<S1 | S2, R1 & R2, E1 | E2, B | C>
export function fold<S1, S2, A, B, C, R1, E1, R2, E2>(
  onNone: () => StreamEither<S1, R1, E1, B>,
  onSome: (a: A) => StreamEither<S2, R2, E2, C>
): (ma: Option<A>) => StreamEither<S1 | S2, R1 & R2, E1 | E2, B | C>
export function fold<S1, S2, A, B, C, R1, E1, R2, E2>(
  onNone: () => Managed<S1, R1, E1, B>,
  onSome: (a: A) => Managed<S2, R2, E2, C>
): (ma: Option<A>) => Managed<S1 | S2, R1 & R2, E1 | E2, B | C>
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

export const sequenceEither = option.sequence(either)

export const traverseEither: <A, E, B>(
  f: (a: A) => Either<E, B>
) => (ta: Option<A>) => Either<E, Option<B>> = (f) => (ta) =>
  option.traverse(either)(ta, f)

export const sequenceTree = tree.sequence(option)

export const traverseTree: <A, B>(
  f: (a: A) => Option<B>
) => (ta: Tree<A>) => Option<Tree<B>> = (f) => (ta) => tree.traverse(option)(ta, f)

export const sequenceArray = array.sequence(option)

export const traverseArray: <A, B>(
  f: (a: A) => Option<B>
) => (ta: Array<A>) => Option<Array<B>> = (f) => (ta) => array.traverse(option)(ta, f)

export const traverseArrayWithIndex: <A, E, B>(
  f: (i: number, a: A) => Option<B>
) => (ta: Array<A>) => Option<Array<B>> = (f) => (ta) =>
  array.traverseWithIndex(option)(ta, f)

export const wiltArray: <A, B, C>(
  f: (a: A) => Option<Either<B, C>>
) => (wa: Array<A>) => Option<Separated<Array<B>, Array<C>>> = (f) => (wa) =>
  array.wilt(option)(wa, f)

export const witherArray: <A, B>(
  f: (a: A) => Option<Option<B>>
) => (ta: Array<A>) => Option<Array<B>> = (f) => (ta) => array.wither(option)(ta, f)

export const sequenceRecord = record.sequence(option)

export const traverseRecord: <A, B>(
  f: (a: A) => Option<B>
) => (ta: Record<string, A>) => Option<Record<string, B>> = (f) => (ta) =>
  record.traverse(option)(ta, f)

export const traverseRecordWithIndex: <A, E, B>(
  f: (k: string, a: A) => Option<B>
) => (ta: Record<string, A>) => Option<Record<string, B>> = (f) => (ta) =>
  record.traverseWithIndex(option)(ta, f)

export const wiltRecord: <A, B, C>(
  f: (a: A) => Option<Either<B, C>>
) => (
  wa: Record<string, A>
) => Option<Separated<Record<string, B>, Record<string, C>>> = (f) => (wa) =>
  record.wilt(option)(wa, f)

export const witherRecord: <A, B>(
  f: (a: A) => Option<Option<B>>
) => (ta: Record<string, A>) => Option<Record<string, B>> = (f) => (ta) =>
  record.wither(option)(ta, f)

export const getFirst = <Ts extends Option<any>[]>(
  ...items: Ts
): Option<AOfOptions<Ts>> => foldMonoid(getFirstMonoid<AOfOptions<Ts>>())(items)

export const getLast = <Ts extends Option<any>[]>(
  ...items: Ts
): Option<AOfOptions<Ts>> => foldMonoid(getLastMonoid<AOfOptions<Ts>>())(items)

export function getOrElse<S2, R2, E2, B>(
  onNone: () => Effect<S2, R2, E2, B>
): <S, R, E, A>(ma: Option<Effect<S, R, E, A>>) => Effect<S | S2, R & R2, E | E2, A | B>
export function getOrElse<S2, R2, E2, B>(
  onNone: () => Managed<S2, R2, E2, B>
): <S, R, E, A>(
  ma: Option<Managed<S, R, E, A>>
) => Managed<S | S2, R & R2, E | E2, A | B>
export function getOrElse<S2, R2, E2, B>(
  onNone: () => Stream<S2, R2, E2, B>
): <S, R, E, A>(ma: Option<Stream<S, R, E, A>>) => Stream<S | S2, R & R2, E | E2, A | B>
export function getOrElse<S2, R2, E2, B>(
  onNone: () => StreamEither<S2, R2, E2, B>
): <S, R, E, A>(
  ma: Option<StreamEither<S, R, E, A>>
) => StreamEither<S | S2, R & R2, E | E2, A | B>
export function getOrElse<B>(onNone: () => B): <A>(ma: Option<A>) => A | B
export function getOrElse<A>(onNone: () => A): (ma: Option<A>) => A {
  return (o) => (o._tag === "None" ? onNone() : o.value)
}
