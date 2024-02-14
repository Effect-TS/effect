/**
 * @since 1.0.0
 */
import type { Either } from "effect/Either"
import { dual } from "effect/Function"
import type { Kind, TypeLambda } from "effect/HKT"
import type { Option } from "effect/Option"
import * as ReadonlyRecord from "effect/ReadonlyRecord"
import type * as applicative from "../Applicative.js"
import * as covariant from "../Covariant.js"
import type * as filterable from "../Filterable.js"
import type * as invariant from "../Invariant.js"
import type * as traversable from "../Traversable.js"
import type * as traversableFilterable from "../TraversableFilterable.js"

const map = ReadonlyRecord.map

const imap = covariant.imap<ReadonlyRecord.ReadonlyRecordTypeLambda>(map)

const partitionMap = ReadonlyRecord.partitionMap

const filterMap = ReadonlyRecord.filterMap

/** @internal */
export const traverse = <F extends TypeLambda>(F: applicative.Applicative<F>): {
  <K extends string | symbol, A, R, O, E, B>(
    f: (a: A, key: K) => Kind<F, R, O, E, B>
  ): (self: Record<K, A>) => Kind<F, R, O, E, Record<K, B>>
  <K extends string | symbol, A, R, O, E, B>(
    self: Record<K, A>,
    f: (a: A, key: K) => Kind<F, R, O, E, B>
  ): Kind<F, R, O, E, Record<K, B>>
} =>
  dual(2, <K extends string | symbol, A, R, O, E, B>(
    self: Record<string, A>,
    f: (a: A, key: string) => Kind<F, R, O, E, B>
  ): Kind<F, R, O, E, Record<K, B>> =>
    F.map(
      F.productAll(
        Object.entries(self).map(([key, a]) => F.map(f(a, key), (b) => [key, b] as const))
      ),
      Object.fromEntries
    ))

const traversePartitionMap = <F extends TypeLambda>(
  F: applicative.Applicative<F>
): {
  <A, R, O, E, B, C>(
    f: (a: A) => Kind<F, R, O, E, Either<C, B>>
  ): <K extends string | symbol>(
    self: ReadonlyRecord.ReadonlyRecord<K, A>
  ) => Kind<
    F,
    R,
    O,
    E,
    [
      Record<ReadonlyRecord.ReadonlyRecord.NonLiteralKey<K>, B>,
      Record<ReadonlyRecord.ReadonlyRecord.NonLiteralKey<K>, C>
    ]
  >
  <K extends string | symbol, A, R, O, E, B, C>(
    self: ReadonlyRecord.ReadonlyRecord<K, A>,
    f: (a: A) => Kind<F, R, O, E, Either<C, B>>
  ): Kind<
    F,
    R,
    O,
    E,
    [
      Record<ReadonlyRecord.ReadonlyRecord.NonLiteralKey<K>, B>,
      Record<ReadonlyRecord.ReadonlyRecord.NonLiteralKey<K>, C>
    ]
  >
} =>
  dual(2, <K extends string | symbol, A, R, O, E, B, C>(
    self: ReadonlyRecord.ReadonlyRecord<K, A>,
    f: (a: A) => Kind<F, R, O, E, Either<C, B>>
  ): Kind<
    F,
    R,
    O,
    E,
    [
      Record<ReadonlyRecord.ReadonlyRecord.NonLiteralKey<K>, B>,
      Record<ReadonlyRecord.ReadonlyRecord.NonLiteralKey<K>, C>
    ]
  > => {
    return F.map(traverse(F)(self, f), ReadonlyRecord.separate)
  })

const traverseFilterMap = <F extends TypeLambda>(
  F: applicative.Applicative<F>
): {
  <A, R, O, E, B>(
    f: (a: A) => Kind<F, R, O, E, Option<B>>
  ): <K extends string | symbol>(
    self: ReadonlyRecord.ReadonlyRecord<K, A>
  ) => Kind<F, R, O, E, Record<ReadonlyRecord.ReadonlyRecord.NonLiteralKey<K>, B>>
  <K extends string | symbol, A, R, O, E, B>(
    self: ReadonlyRecord.ReadonlyRecord<K, A>,
    f: (a: A) => Kind<F, R, O, E, Option<B>>
  ): Kind<F, R, O, E, Record<ReadonlyRecord.ReadonlyRecord.NonLiteralKey<K>, B>>
} =>
  dual(2, <K extends string | symbol, A, R, O, E, B>(
    self: ReadonlyRecord.ReadonlyRecord<K, A>,
    f: (a: A) => Kind<F, R, O, E, Option<B>>
  ): Kind<F, R, O, E, Record<ReadonlyRecord.ReadonlyRecord.NonLiteralKey<K>, B>> => {
    return F.map(traverse(F)(self, f), ReadonlyRecord.getSomes)
  })

/**
 * @category instances
 * @since 1.0.0
 */
export const Covariant: covariant.Covariant<ReadonlyRecord.ReadonlyRecordTypeLambda> = {
  imap,
  map
}

/**
 * @category instances
 * @since 1.0.0
 */
export const Invariant: invariant.Invariant<ReadonlyRecord.ReadonlyRecordTypeLambda> = {
  imap
}

/**
 * @category instances
 * @since 1.0.0
 */
export const Filterable: filterable.Filterable<ReadonlyRecord.ReadonlyRecordTypeLambda> = {
  partitionMap,
  filterMap
}

/**
 * @category instances
 * @since 1.0.0
 */
export const Traversable: traversable.Traversable<ReadonlyRecord.ReadonlyRecordTypeLambda> = {
  traverse
}

/**
 * @category instances
 * @since 1.0.0
 */
export const TraversableFilterable: traversableFilterable.TraversableFilterable<
  ReadonlyRecord.ReadonlyRecordTypeLambda
> = {
  traversePartitionMap,
  traverseFilterMap
}
