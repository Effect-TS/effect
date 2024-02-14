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

/** @internal */
export const traverse = <F extends TypeLambda>(F: applicative.Applicative<F>): {
  <K extends string, A, R, O, E, B>(
    f: (a: A, key: K) => Kind<F, R, O, E, B>
  ): (self: Record<K, A>) => Kind<F, R, O, E, Record<K, B>>
  <K extends string, A, R, O, E, B>(
    self: Record<K, A>,
    f: (a: A, key: K) => Kind<F, R, O, E, B>
  ): Kind<F, R, O, E, Record<K, B>>
} =>
  dual(2, <K extends string, A, R, O, E, B>(
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
  ): <K extends string>(
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
  <K extends string, A, R, O, E, B, C>(
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
  dual(2, <K extends string, A, R, O, E, B, C>(
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
  ): <K extends string>(
    self: ReadonlyRecord.ReadonlyRecord<K, A>
  ) => Kind<F, R, O, E, Record<ReadonlyRecord.ReadonlyRecord.NonLiteralKey<K>, B>>
  <K extends string, A, R, O, E, B>(
    self: ReadonlyRecord.ReadonlyRecord<K, A>,
    f: (a: A) => Kind<F, R, O, E, Option<B>>
  ): Kind<F, R, O, E, Record<ReadonlyRecord.ReadonlyRecord.NonLiteralKey<K>, B>>
} =>
  dual(2, <K extends string, A, R, O, E, B>(
    self: ReadonlyRecord.ReadonlyRecord<K, A>,
    f: (a: A) => Kind<F, R, O, E, Option<B>>
  ): Kind<F, R, O, E, Record<ReadonlyRecord.ReadonlyRecord.NonLiteralKey<K>, B>> => {
    return F.map(traverse(F)(self, f), ReadonlyRecord.getSomes)
  })

const _map: covariant.Covariant<ReadonlyRecord.ReadonlyRecordTypeLambda<any>>["map"] = ReadonlyRecord.map

const _imap = covariant.imap<ReadonlyRecord.ReadonlyRecordTypeLambda<any>>(_map)

const _partitionMap: filterable.Filterable<ReadonlyRecord.ReadonlyRecordTypeLambda<any>>["partitionMap"] =
  ReadonlyRecord.partitionMap

const _filterMap: filterable.Filterable<ReadonlyRecord.ReadonlyRecordTypeLambda<any>>["filterMap"] =
  ReadonlyRecord.filterMap

const _traverse: traversable.Traversable<ReadonlyRecord.ReadonlyRecordTypeLambda<any>>["traverse"] = traverse

const _traversePartitionMap: traversableFilterable.TraversableFilterable<
  ReadonlyRecord.ReadonlyRecordTypeLambda<any>
>["traversePartitionMap"] = traversePartitionMap

const _traverseFilterMap: traversableFilterable.TraversableFilterable<
  ReadonlyRecord.ReadonlyRecordTypeLambda<any>
>["traverseFilterMap"] = traverseFilterMap

/**
 * @category instances
 * @since 1.0.0
 */
export const getCovariant = <K extends string>(): covariant.Covariant<
  ReadonlyRecord.ReadonlyRecordTypeLambda<K>
> => ({
  imap: _imap,
  map: _map
})

/**
 * @category instances
 * @since 1.0.0
 */
export const Covariant = getCovariant()

/**
 * @category instances
 * @since 1.0.0
 */
export const getInvariant = <K extends string>(): invariant.Invariant<
  ReadonlyRecord.ReadonlyRecordTypeLambda<K>
> => ({
  imap: _imap
})

/**
 * @category instances
 * @since 1.0.0
 */
export const Invariant = getInvariant()

/**
 * @category instances
 * @since 1.0.0
 */
export const getFilterable = <K extends string>(): filterable.Filterable<
  ReadonlyRecord.ReadonlyRecordTypeLambda<K>
> => ({
  partitionMap: _partitionMap,
  filterMap: _filterMap
})

/**
 * @category instances
 * @since 1.0.0
 */
export const Filterable = getFilterable()

/**
 * @category instances
 * @since 1.0.0
 */
export const getTraversable = <K extends string>(): traversable.Traversable<
  ReadonlyRecord.ReadonlyRecordTypeLambda<K>
> => ({
  traverse: _traverse
})

/**
 * @category instances
 * @since 1.0.0
 */
export const Traversable = getTraversable()

/**
 * @category instances
 * @since 1.0.0
 */
export const getTraversableFilterable = <K extends string>(): traversableFilterable.TraversableFilterable<
  ReadonlyRecord.ReadonlyRecordTypeLambda<K>
> => ({
  traversePartitionMap: _traversePartitionMap,
  traverseFilterMap: _traverseFilterMap
})

/**
 * @category instances
 * @since 1.0.0
 */
export const TraversableFilterable = getTraversableFilterable()
