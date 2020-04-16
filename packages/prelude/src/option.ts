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
export const sequenceStream = option.sequence(S.stream);
export const sequenceManaged = option.sequence(M.managed);
export const sequenceStreamEither = option.sequence(SE.streamEither);

export const traverse: <A, R, E, B>(
  f: (a: A) => T.Effect<R, E, B>
) => (ta: Option<A>) => T.Effect<R, E, Option<B>> = (f) => (ta) => option.traverse(T.effect)(ta, f);

export const traverseManaged: <A, R, E, B>(
  f: (a: A) => M.Managed<R, E, B>
) => (ta: Option<A>) => M.Managed<R, E, Option<B>> = (f) => (ta) =>
  option.traverse(M.managed)(ta, f);

export const traverseStream: <A, R, E, B>(
  f: (a: A) => S.Stream<R, E, B>
) => (ta: Option<A>) => S.Stream<T.AsyncRT & R, E, Option<B>> = (f) => (ta) =>
  option.traverse(S.stream)(ta, f);

export const traverseStreamEither: <A, R, E, B>(
  f: (a: A) => SE.StreamEither<R, E, B>
) => (ta: Option<A>) => SE.StreamEither<T.AsyncRT & R, E, Option<B>> = (f) => (ta) =>
  option.traverse(SE.streamEither)(ta, f);

export const wilt: <A, R, E, B, C>(
  f: (a: A) => T.Effect<R, E, Either<B, C>>
) => (wa: Option<A>) => T.Effect<R, E, Separated<Option<B>, Option<C>>> = (f) => (wa) =>
  option.wilt(T.effect)(wa, f);

export const wiltManaged: <A, R, E, B, C>(
  f: (a: A) => M.Managed<R, E, Either<B, C>>
) => (wa: Option<A>) => M.Managed<R, E, Separated<Option<B>, Option<C>>> = (f) => (wa) =>
  option.wilt(M.managed)(wa, f);

export const wiltStream: <A, R, E, B, C>(
  f: (a: A) => S.Stream<R, E, Either<B, C>>
) => (wa: Option<A>) => S.Stream<T.AsyncRT & R, E, Separated<Option<B>, Option<C>>> = (f) => (wa) =>
  option.wilt(S.stream)(wa, f);

export const wiltStreamEither: <A, R, E, B, C>(
  f: (a: A) => SE.StreamEither<R, E, Either<B, C>>
) => (wa: Option<A>) => SE.StreamEither<T.AsyncRT & R, E, Separated<Option<B>, Option<C>>> = (
  f
) => (wa) => option.wilt(SE.streamEither)(wa, f);

export const wither: <A, R, E, B>(
  f: (a: A) => T.Effect<R, E, Option<B>>
) => (ta: Option<A>) => T.Effect<R, E, Option<B>> = (f) => (ta) => option.wither(T.effect)(ta, f);

export const witherManaged: <A, R, E, B>(
  f: (a: A) => M.Managed<R, E, Option<B>>
) => (ta: Option<A>) => M.Managed<R, E, Option<B>> = (f) => (ta) => option.wither(M.managed)(ta, f);

export const witherStream: <A, R, E, B>(
  f: (a: A) => S.Stream<R, E, Option<B>>
) => (ta: Option<A>) => S.Stream<T.AsyncRT & R, E, Option<B>> = (f) => (ta) =>
  option.wither(S.stream)(ta, f);

export const witherStreamEither: <A, R, E, B>(
  f: (a: A) => SE.StreamEither<R, E, Option<B>>
) => (ta: Option<A>) => SE.StreamEither<T.AsyncRT & R, E, Option<B>> = (f) => (ta) =>
  option.wither(SE.streamEither)(ta, f);
