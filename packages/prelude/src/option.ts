import { isNone, Option, option } from "fp-ts/lib/Option";
import { effect as T, streameither as SE, stream as S, managed as M } from "@matechs/effect";
import { Either } from "./either";
import { Separated } from "fp-ts/lib/Compactable";

// from fp-ts just retyped
/* istanbul ignore file */

export {
  None,
  Option,
  Some,
  URI,
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
  getOrElse,
  getOrd,
  getRefinement,
  getRight,
  getShow,
  isNone,
  isSome,
  map,
  mapNullable,
  none,
  option,
  partition,
  partitionMap,
  reduce,
  reduceRight,
  separate,
  some,
  toNullable,
  toUndefined,
  tryCatch
} from "fp-ts/lib/Option";

export function fold<A, B, C, R1, E1, R2, E2>(
  onNone: () => T.Effect<R1, E1, B>,
  onSome: (a: A) => T.Effect<R2, E2, C>
): (ma: Option<A>) => T.Effect<R1 & R2, E1 | E2, B | C>;
export function fold<A, B, C, R1, E1, R2, E2>(
  onNone: () => S.Stream<R1, E1, B>,
  onSome: (a: A) => S.Stream<R2, E2, C>
): (ma: Option<A>) => S.Stream<R1 & R2, E1 | E2, B | C>;
export function fold<A, B, C, R1, E1, R2, E2>(
  onNone: () => SE.StreamEither<R1, E1, B>,
  onSome: (a: A) => SE.StreamEither<R2, E2, C>
): (ma: Option<A>) => SE.StreamEither<R1 & R2, E1 | E2, B | C>;
export function fold<A, B, C, R1, E1, R2, E2>(
  onNone: () => M.Managed<R1, E1, B>,
  onSome: (a: A) => M.Managed<R2, E2, C>
): (ma: Option<A>) => M.Managed<R1 & R2, E1 | E2, B | C>;
export function fold<A, B, C>(onNone: () => B, onSome: (a: A) => C): (ma: Option<A>) => B | C;
export function fold<A, B>(onNone: () => B, onSome: (a: A) => B): (ma: Option<A>) => B {
  return (ma) => (isNone(ma) ? onNone() : onSome(ma.value));
}

export const sequence = option.sequence(T.effect);

export const traverse: <A, R, E, B>(
  f: (a: A) => T.Effect<R, E, B>
) => (ta: Option<A>) => T.Effect<R, E, Option<B>> = (f) => (ta) => option.traverse(T.effect)(ta, f);

export const wilt: <A, R, E, B, C>(
  f: (a: A) => T.Effect<R, E, Either<B, C>>
) => (wa: Option<A>) => T.Effect<R, E, Separated<Option<B>, Option<C>>> = (f) => (wa) =>
  option.wilt(T.effect)(wa, f);

export const wither: <A, R, E, B>(
  f: (a: A) => T.Effect<R, E, Option<B>>
) => (ta: Option<A>) => T.Effect<R, E, Option<B>> = (f) => (ta) => option.wither(T.effect)(ta, f);
