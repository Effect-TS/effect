import { effect as T, managed as M, stream as S, streameither as SE } from "@matechs/effect";
import { isNone, Option, option } from "fp-ts/lib/Option";
import { sequenceS as SS, sequenceT as ST } from "fp-ts/lib/Apply";
import { Do as DoG } from "fp-ts-contrib/lib/Do";

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
  getOrElse,
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
} from "fp-ts/lib/Option";

export function fold<S1, S2, A, B, C, R1, E1, R2, E2>(
  onNone: () => T.Effect<S1, R1, E1, B>,
  onSome: (a: A) => T.Effect<S2, R2, E2, C>
): (ma: Option<A>) => T.Effect<S1 | S2, R1 & R2, E1 | E2, B | C>;
export function fold<S1, S2, A, B, C, R1, E1, R2, E2>(
  onNone: () => S.Stream<S1, R1, E1, B>,
  onSome: (a: A) => S.Stream<S2, R2, E2, C>
): (ma: Option<A>) => S.Stream<S1 | S2, R1 & R2, E1 | E2, B | C>;
export function fold<S1, S2, A, B, C, R1, E1, R2, E2>(
  onNone: () => SE.StreamEither<S1, R1, E1, B>,
  onSome: (a: A) => SE.StreamEither<S2, R2, E2, C>
): (ma: Option<A>) => SE.StreamEither<S1 | S2, R1 & R2, E1 | E2, B | C>;
export function fold<S1, S2, A, B, C, R1, E1, R2, E2>(
  onNone: () => M.Managed<S1, R1, E1, B>,
  onSome: (a: A) => M.Managed<S2, R2, E2, C>
): (ma: Option<A>) => M.Managed<S1 | S2, R1 & R2, E1 | E2, B | C>;
export function fold<A, B, C>(onNone: () => B, onSome: (a: A) => C): (ma: Option<A>) => B | C;
export function fold<A, B>(onNone: () => B, onSome: (a: A) => B): (ma: Option<A>) => B {
  return (ma) => (isNone(ma) ? onNone() : onSome(ma.value));
}

export const sequenceT = ST(option);
export const sequenceS = SS(option);
export const Do = () => DoG(option);
