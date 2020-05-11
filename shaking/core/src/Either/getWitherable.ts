import type { Applicative } from "fp-ts/lib/Applicative"
import type { Separated } from "fp-ts/lib/Compactable"
import type { HKT } from "fp-ts/lib/HKT"
import type { Witherable2C } from "fp-ts/lib/Witherable"

import type { Predicate } from "../Function"
import type { Monoid } from "../Monoid"
import type { Option } from "../Option/Option"

import type { Either } from "./Either"
import { URI } from "./URI"
import { foldMap_ } from "./foldMap"
import { isLeft } from "./isLeft"
import { left } from "./left"
import { map_ } from "./map"
import { reduce_ } from "./reduce"
import { reduceRight_ } from "./reduceRight"
import { right } from "./right"
import { sequence } from "./sequence"
import { traverse } from "./traverse"

/**
 * Builds `Witherable` instance for `Either` given `Monoid` for the left side
 *
 * @since 2.0.0
 */
export function getWitherable<E>(M: Monoid<E>): Witherable2C<URI, E> {
  const empty = left(M.empty)
  const compact = <A>(ma: Either<E, Option<A>>): Either<E, A> => {
    return isLeft(ma)
      ? ma
      : ma.right._tag === "None"
      ? left(M.empty)
      : right(ma.right.value)
  }
  const separate = <A, B>(
    ma: Either<E, Either<A, B>>
  ): Separated<Either<E, A>, Either<E, B>> => {
    return isLeft(ma)
      ? { left: ma, right: ma }
      : isLeft(ma.right)
      ? { left: right(ma.right.left), right: empty }
      : { left: empty, right: right(ma.right.right) }
  }
  const partitionMap = <A, B, C>(
    ma: Either<E, A>,
    f: (a: A) => Either<B, C>
  ): Separated<Either<E, B>, Either<E, C>> => {
    if (isLeft(ma)) {
      return { left: ma, right: ma }
    }
    const e = f(ma.right)
    return isLeft(e)
      ? { left: right(e.left), right: empty }
      : { left: empty, right: right(e.right) }
  }
  const partition = <A>(
    ma: Either<E, A>,
    p: Predicate<A>
  ): Separated<Either<E, A>, Either<E, A>> => {
    return isLeft(ma)
      ? { left: ma, right: ma }
      : p(ma.right)
      ? { left: empty, right: right(ma.right) }
      : { left: right(ma.right), right: empty }
  }
  const filterMap = <A, B>(ma: Either<E, A>, f: (a: A) => Option<B>): Either<E, B> => {
    if (isLeft(ma)) {
      return ma
    }
    const ob = f(ma.right)
    return ob._tag === "None" ? left(M.empty) : right(ob.value)
  }
  const filter = <A>(ma: Either<E, A>, predicate: Predicate<A>): Either<E, A> =>
    isLeft(ma) ? ma : predicate(ma.right) ? ma : left(M.empty)
  const wither = <F>(
    F: Applicative<F>
  ): (<A, B>(
    ma: Either<E, A>,
    f: (a: A) => HKT<F, Option<B>>
  ) => HKT<F, Either<E, B>>) => {
    const traverseF = traverse(F)
    return (ma, f) => F.map(traverseF(ma, f), compact)
  }
  const wilt = <F>(
    F: Applicative<F>
  ): (<A, B, C>(
    ma: Either<E, A>,
    f: (a: A) => HKT<F, Either<B, C>>
  ) => HKT<F, Separated<Either<E, B>, Either<E, C>>>) => {
    const traverseF = traverse(F)
    return (ma, f) => F.map(traverseF(ma, f), separate)
  }
  return {
    URI,
    _E: undefined as any,
    map: map_,
    compact,
    separate,
    filter,
    filterMap,
    partition,
    partitionMap,
    traverse,
    sequence,
    reduce: reduce_,
    foldMap: foldMap_,
    reduceRight: reduceRight_,
    wither,
    wilt
  }
}
