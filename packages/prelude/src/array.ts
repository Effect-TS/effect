import { effect as T, streameither as SE, stream as S, managed as M } from "@matechs/effect";
import { array } from "fp-ts/lib/Array";
import { Either } from "fp-ts/lib/Either";
import { Separated } from "fp-ts/lib/Compactable";
import { Option } from "fp-ts/lib/Option";

// from fp-ts just retyped
/* istanbul ignore file */

export {
  URI,
  alt,
  ap,
  apFirst,
  apSecond,
  array,
  chain,
  chainFirst,
  chop,
  chunksOf,
  compact,
  comprehension,
  cons,
  copy,
  deleteAt,
  difference,
  dropLeft,
  dropLeftWhile,
  dropRight,
  duplicate,
  elem,
  empty,
  extend,
  filter,
  filterMap,
  filterMapWithIndex,
  filterWithIndex,
  findFirst,
  findFirstMap,
  findIndex,
  findLast,
  findLastIndex,
  findLastMap,
  flatten,
  foldLeft,
  foldMap,
  foldMapWithIndex,
  foldRight,
  getEq,
  getMonoid,
  getOrd,
  getShow,
  head,
  init,
  insertAt,
  intersection,
  isEmpty,
  isNonEmpty,
  isOutOfBound,
  last,
  lefts,
  lookup,
  makeBy,
  map,
  mapWithIndex,
  modifyAt,
  of,
  partition,
  partitionMap,
  partitionMapWithIndex,
  partitionWithIndex,
  range,
  reduce,
  reduceRight,
  reduceRightWithIndex,
  reduceWithIndex,
  replicate,
  reverse,
  rights,
  rotate,
  scanLeft,
  scanRight,
  separate,
  snoc,
  sort,
  sortBy,
  spanLeft,
  splitAt,
  tail,
  takeLeft,
  takeLeftWhile,
  takeRight,
  union,
  uniq,
  unsafeDeleteAt,
  unsafeInsertAt,
  unsafeUpdateAt,
  unzip,
  updateAt,
  zip,
  zipWith
} from "fp-ts/lib/Array";

export const sequence = array.sequence(T.effect);
export const sequenceStream = array.sequence(S.stream);
export const sequenceManaged = array.sequence(M.managed);
export const sequenceStreamEither = array.sequence(SE.streamEither);

export const traverse: <A, R, E, B>(
  f: (a: A) => T.Effect<R, E, B>
) => (ta: Array<A>) => T.Effect<R, E, Array<B>> = (f) => (ta) => array.traverse(T.effect)(ta, f);

export const traverseWithIndex: <A, R, E, B>(
  f: (i: number, a: A) => T.Effect<R, E, B>
) => (ta: Array<A>) => T.Effect<R, E, Array<B>> = (f) => (ta) =>
  array.traverseWithIndex(T.effect)(ta, f);

export const traverseManaged: <A, R, E, B>(
  f: (a: A) => M.Managed<R, E, B>
) => (ta: Array<A>) => M.Managed<R, E, Array<B>> = (f) => (ta) => array.traverse(M.managed)(ta, f);

export const traverseManagedWithIndex: <A, R, E, B>(
  f: (i: number, a: A) => M.Managed<R, E, B>
) => (ta: Array<A>) => M.Managed<R, E, Array<B>> = (f) => (ta) =>
  array.traverseWithIndex(M.managed)(ta, f);

export const traverseStream: <A, R, E, B>(
  f: (a: A) => S.Stream<R, E, B>
) => (ta: Array<A>) => S.Stream<T.AsyncRT & R, E, Array<B>> = (f) => (ta) =>
  array.traverse(S.stream)(ta, f);

export const traverseStreamWithIndex: <A, R, E, B>(
  f: (i: number, a: A) => S.Stream<R, E, B>
) => (ta: Array<A>) => S.Stream<T.AsyncRT & R, E, Array<B>> = (f) => (ta) =>
  array.traverseWithIndex(S.stream)(ta, f);

export const traverseStreamEither: <A, R, E, B>(
  f: (a: A) => SE.StreamEither<R, E, B>
) => (ta: Array<A>) => SE.StreamEither<T.AsyncRT & R, E, Array<B>> = (f) => (ta) =>
  array.traverse(SE.streamEither)(ta, f);

export const traverseStreamEitherWithIndex: <A, R, E, B>(
  f: (i: number, a: A) => SE.StreamEither<R, E, B>
) => (ta: Array<A>) => SE.StreamEither<T.AsyncRT & R, E, Array<B>> = (f) => (ta) =>
  array.traverseWithIndex(SE.streamEither)(ta, f);

export const wilt: <A, R, E, B, C>(
  f: (a: A) => T.Effect<R, E, Either<B, C>>
) => (wa: Array<A>) => T.Effect<R, E, Separated<Array<B>, Array<C>>> = (f) => (wa) =>
  array.wilt(T.effect)(wa, f);

export const wiltManaged: <A, R, E, B, C>(
  f: (a: A) => M.Managed<R, E, Either<B, C>>
) => (wa: Array<A>) => M.Managed<R, E, Separated<Array<B>, Array<C>>> = (f) => (wa) =>
  array.wilt(M.managed)(wa, f);

export const wiltStream: <A, R, E, B, C>(
  f: (a: A) => S.Stream<R, E, Either<B, C>>
) => (wa: Array<A>) => S.Stream<T.AsyncRT & R, E, Separated<Array<B>, Array<C>>> = (f) => (wa) =>
  array.wilt(S.stream)(wa, f);

export const wiltStreamEither: <A, R, E, B, C>(
  f: (a: A) => SE.StreamEither<R, E, Either<B, C>>
) => (wa: Array<A>) => SE.StreamEither<T.AsyncRT & R, E, Separated<Array<B>, Array<C>>> = (f) => (
  wa
) => array.wilt(SE.streamEither)(wa, f);

export const wither: <A, R, E, B>(
  f: (a: A) => T.Effect<R, E, Option<B>>
) => (ta: Array<A>) => T.Effect<R, E, Array<B>> = (f) => (ta) => array.wither(T.effect)(ta, f);

export const witherManaged: <A, R, E, B>(
  f: (a: A) => M.Managed<R, E, Option<B>>
) => (ta: Array<A>) => M.Managed<R, E, Array<B>> = (f) => (ta) => array.wither(M.managed)(ta, f);

export const witherStream: <A, R, E, B>(
  f: (a: A) => S.Stream<R, E, Option<B>>
) => (ta: Array<A>) => S.Stream<T.AsyncRT & R, E, Array<B>> = (f) => (ta) =>
  array.wither(S.stream)(ta, f);

export const witherStreamEither: <A, R, E, B>(
  f: (a: A) => SE.StreamEither<R, E, Option<B>>
) => (ta: Array<A>) => SE.StreamEither<T.AsyncRT & R, E, Array<B>> = (f) => (ta) =>
  array.wither(SE.streamEither)(ta, f);
