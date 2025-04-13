/**
 * @since 1.0.0
 */
import type * as Effect from "effect/Effect"
import { type Pipeable } from "effect/Pipeable"
import type * as IndexedDbTable from "./IndexedDbTable.js"
import type * as IndexedDbVersion from "./IndexedDbVersion.js"
import { type IndexFromTable } from "./internal/indexedDbMigration.js"
import * as internal from "./internal/indexedDbQueryBuilder.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = internal.TypeId

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace IndexedDbQueryBuilder {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface From<
    Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps = never,
    Table extends IndexedDbTable.IndexedDbTable.TableName<
      IndexedDbVersion.IndexedDbVersion.Tables<Source>
    > = never
  > extends Pipeable {
    new(_: never): {}

    readonly [TypeId]: TypeId
    readonly source: Source
    readonly table: Table
    readonly database: globalThis.IDBDatabase
    readonly IDBKeyRange: typeof globalThis.IDBKeyRange

    readonly select: {
      <Index extends IndexFromTable<Source, Table>>(index: Index): Select<Source, Table, Index>
      (): Select<Source, Table, never>
    }

    readonly count: {
      <Index extends IndexFromTable<Source, Table>>(index: Index): Count<Source, Table, Index>
      (): Count<Source, Table, never>
    }

    readonly delete: {
      <Index extends IndexFromTable<Source, Table>>(index: Index): Delete<Source, Table, Index>
      (): Delete<Source, Table, never>
    }

    readonly insert: (value: internal.SourceTableSchemaType<Source, Table>) => Modify<Source, Table>
    readonly insertAll: (values: Array<internal.SourceTableSchemaType<Source, Table>>) => ModifyAll<Source, Table>
    readonly upsert: (value: internal.SourceTableSchemaType<Source, Table>) => Modify<Source, Table>
    readonly upsertAll: (values: Array<internal.SourceTableSchemaType<Source, Table>>) => ModifyAll<Source, Table>
    readonly clear: Clear<Source, Table>
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface ClearAll<
    Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps = never
  > extends Pipeable {
    new(_: never): {}

    [Symbol.iterator](): Effect.EffectGenerator<Effect.Effect<void>>

    readonly [TypeId]: TypeId
    readonly source: Source
    readonly database: globalThis.IDBDatabase
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface Clear<
    Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps = never,
    Table extends IndexedDbTable.IndexedDbTable.TableName<
      IndexedDbVersion.IndexedDbVersion.Tables<Source>
    > = never
  > extends Pipeable {
    new(_: never): {}

    [Symbol.iterator](): Effect.EffectGenerator<Effect.Effect<void>>

    readonly [TypeId]: TypeId
    readonly from: From<Source, Table>
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface Count<
    Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps = never,
    Table extends IndexedDbTable.IndexedDbTable.TableName<
      IndexedDbVersion.IndexedDbVersion.Tables<Source>
    > = never,
    Index extends IndexFromTable<Source, Table> = never
  > extends Pipeable {
    new(_: never): {}

    [Symbol.iterator](): Effect.EffectGenerator<Effect.Effect<number>>

    readonly [TypeId]: TypeId
    readonly from: From<Source, Table>
    readonly index?: Index
    readonly only?: internal.ExtractIndexType<Source, Table, Index>
    readonly lowerBound?: internal.ExtractIndexType<Source, Table, Index>
    readonly upperBound?: internal.ExtractIndexType<Source, Table, Index>
    readonly excludeLowerBound?: boolean
    readonly excludeUpperBound?: boolean

    readonly equals: (
      value: internal.ExtractIndexType<Source, Table, Index>
    ) => Omit<Count<Source, Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly gte: (
      value: internal.ExtractIndexType<Source, Table, Index>
    ) => Omit<Count<Source, Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly lte: (
      value: internal.ExtractIndexType<Source, Table, Index>
    ) => Omit<Count<Source, Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly gt: (
      value: internal.ExtractIndexType<Source, Table, Index>
    ) => Omit<Count<Source, Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly lt: (
      value: internal.ExtractIndexType<Source, Table, Index>
    ) => Omit<Count<Source, Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly between: (
      lowerBound: internal.ExtractIndexType<Source, Table, Index>,
      upperBound: internal.ExtractIndexType<Source, Table, Index>,
      options?: { excludeLowerBound?: boolean; excludeUpperBound?: boolean }
    ) => Omit<Count<Source, Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface DeletePartial<
    Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps = never,
    Table extends IndexedDbTable.IndexedDbTable.TableName<
      IndexedDbVersion.IndexedDbVersion.Tables<Source>
    > = never,
    Index extends IndexFromTable<Source, Table> = never
  > extends Pipeable {
    new(_: never): {}

    readonly [TypeId]: TypeId
    readonly from: From<Source, Table>
    readonly index?: Index

    readonly equals: (
      value: internal.ExtractIndexType<Source, Table, Index>
    ) => Omit<Delete<Source, Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly gte: (
      value: internal.ExtractIndexType<Source, Table, Index>
    ) => Omit<Delete<Source, Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly lte: (
      value: internal.ExtractIndexType<Source, Table, Index>
    ) => Omit<Delete<Source, Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly gt: (
      value: internal.ExtractIndexType<Source, Table, Index>
    ) => Omit<Delete<Source, Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly lt: (
      value: internal.ExtractIndexType<Source, Table, Index>
    ) => Omit<Delete<Source, Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly between: (
      lowerBound: internal.ExtractIndexType<Source, Table, Index>,
      upperBound: internal.ExtractIndexType<Source, Table, Index>,
      options?: { excludeLowerBound?: boolean; excludeUpperBound?: boolean }
    ) => Omit<Delete<Source, Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly limit: (
      limit: number
    ) => Omit<Delete<Source, Table, Index>, "limit" | "equals" | "gte" | "lte" | "gt" | "lt" | "between">
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface Delete<
    Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps = never,
    Table extends IndexedDbTable.IndexedDbTable.TableName<
      IndexedDbVersion.IndexedDbVersion.Tables<Source>
    > = never,
    Index extends IndexFromTable<Source, Table> = never
  > extends Pipeable {
    new(_: never): {}

    [Symbol.iterator](): Effect.EffectGenerator<Effect.Effect<void>>

    readonly [TypeId]: TypeId
    readonly delete: DeletePartial<Source, Table, Index>
    readonly index?: Index
    readonly limitValue?: number
    readonly only?: internal.ExtractIndexType<Source, Table, Index>
    readonly lowerBound?: internal.ExtractIndexType<Source, Table, Index>
    readonly upperBound?: internal.ExtractIndexType<Source, Table, Index>
    readonly excludeLowerBound?: boolean
    readonly excludeUpperBound?: boolean

    readonly equals: (
      value: internal.ExtractIndexType<Source, Table, Index>
    ) => Omit<Delete<Source, Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly gte: (
      value: internal.ExtractIndexType<Source, Table, Index>
    ) => Omit<Delete<Source, Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly lte: (
      value: internal.ExtractIndexType<Source, Table, Index>
    ) => Omit<Delete<Source, Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly gt: (
      value: internal.ExtractIndexType<Source, Table, Index>
    ) => Omit<Delete<Source, Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly lt: (
      value: internal.ExtractIndexType<Source, Table, Index>
    ) => Omit<Delete<Source, Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly between: (
      lowerBound: internal.ExtractIndexType<Source, Table, Index>,
      upperBound: internal.ExtractIndexType<Source, Table, Index>,
      options?: { excludeLowerBound?: boolean; excludeUpperBound?: boolean }
    ) => Omit<Delete<Source, Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly limit: (
      limit: number
    ) => Omit<Delete<Source, Table, Index>, "limit" | "equals" | "gte" | "lte" | "gt" | "lt" | "between">
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface Select<
    Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps = never,
    Table extends IndexedDbTable.IndexedDbTable.TableName<
      IndexedDbVersion.IndexedDbVersion.Tables<Source>
    > = never,
    Index extends IndexFromTable<Source, Table> = never
  > extends Pipeable {
    new(_: never): {}

    [Symbol.iterator](): Effect.EffectGenerator<Effect.Effect<Array<internal.SourceTableSchemaType<Source, Table>>>>

    readonly [TypeId]: TypeId
    readonly from: From<Source, Table>
    readonly index?: Index
    readonly limitValue?: number
    readonly only?: internal.ExtractIndexType<Source, Table, Index>
    readonly lowerBound?: internal.ExtractIndexType<Source, Table, Index>
    readonly upperBound?: internal.ExtractIndexType<Source, Table, Index>
    readonly excludeLowerBound?: boolean
    readonly excludeUpperBound?: boolean

    readonly equals: (
      value: internal.ExtractIndexType<Source, Table, Index>
    ) => Omit<Select<Source, Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly gte: (
      value: internal.ExtractIndexType<Source, Table, Index>
    ) => Omit<Select<Source, Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly lte: (
      value: internal.ExtractIndexType<Source, Table, Index>
    ) => Omit<Select<Source, Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly gt: (
      value: internal.ExtractIndexType<Source, Table, Index>
    ) => Omit<Select<Source, Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly lt: (
      value: internal.ExtractIndexType<Source, Table, Index>
    ) => Omit<Select<Source, Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly between: (
      lowerBound: internal.ExtractIndexType<Source, Table, Index>,
      upperBound: internal.ExtractIndexType<Source, Table, Index>,
      options?: { excludeLowerBound?: boolean; excludeUpperBound?: boolean }
    ) => Omit<Select<Source, Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly limit: (
      limit: number
    ) => Omit<Select<Source, Table, Index>, "limit" | "equals" | "gte" | "lte" | "gt" | "lt" | "between" | "first">

    readonly first: () => First<Source, Table, Index>
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface First<
    Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps = never,
    Table extends IndexedDbTable.IndexedDbTable.TableName<
      IndexedDbVersion.IndexedDbVersion.Tables<Source>
    > = never,
    Index extends IndexFromTable<Source, Table> = never
  > extends Pipeable {
    new(_: never): {}

    [Symbol.iterator](): Effect.EffectGenerator<Effect.Effect<internal.SourceTableSchemaType<Source, Table>>>

    readonly [TypeId]: TypeId
    readonly select: Select<Source, Table, Index>
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface Modify<
    Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps = never,
    Table extends IndexedDbTable.IndexedDbTable.TableName<
      IndexedDbVersion.IndexedDbVersion.Tables<Source>
    > = never
  > extends Pipeable {
    new(_: never): {}

    [Symbol.iterator](): Effect.EffectGenerator<Effect.Effect<globalThis.IDBValidKey>>

    readonly [TypeId]: TypeId
    readonly operation: "add" | "put"
    readonly from: From<Source, Table>
    readonly value: internal.SourceTableSchemaType<Source, Table>
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface ModifyAll<
    Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps = never,
    Table extends IndexedDbTable.IndexedDbTable.TableName<
      IndexedDbVersion.IndexedDbVersion.Tables<Source>
    > = never
  > extends Pipeable {
    new(_: never): {}

    [Symbol.iterator](): Effect.EffectGenerator<Effect.Effect<Array<globalThis.IDBValidKey>>>

    readonly [TypeId]: TypeId
    readonly operation: "add" | "put"
    readonly from: From<Source, Table>
    readonly values: Array<internal.SourceTableSchemaType<Source, Table>>
  }
}
