/**
 * @since 1.0.0
 */
import { type YieldableError } from "effect/Cause"
import type * as Effect from "effect/Effect"
import type * as HashMap from "effect/HashMap"
import type * as Schema from "effect/Schema"
import type * as IndexedDbDatabase from "./IndexedDbDatabase.js"
import type * as IndexedDbTable from "./IndexedDbTable.js"
import type * as IndexedDbVersion from "./IndexedDbVersion.js"
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
 * @category type ids
 */
export const ErrorTypeId: unique symbol = internal.ErrorTypeId

/**
 * @since 1.0.0
 * @category type ids
 */
export type ErrorTypeId = typeof ErrorTypeId

/**
 * @since 1.0.0
 * @category errors
 */
export type ErrorReason = {
  readonly _tag: "NotFoundError"
  readonly cause: unknown
} | {
  readonly _tag: "UnknownError"
  readonly cause: unknown
} | {
  readonly _tag: "DecodeError"
  readonly cause: unknown
} | {
  readonly _tag: "TransactionError"
  readonly cause: unknown
}

/**
 * @since 1.0.0
 * @category errors
 */
export interface IndexedDbQueryError extends YieldableError {
  readonly [ErrorTypeId]: IndexedDbQueryError
  readonly _tag: "IndexedDbQueryError"
  readonly reason: ErrorReason
}

/**
 * @since 1.0.0
 * @category models
 */
export interface IndexedDbQueryBuilder<
  Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps = never
> {
  readonly [TypeId]: TypeId

  readonly tables: HashMap.HashMap<string, IndexedDbVersion.IndexedDbVersion.Tables<Source>>
  readonly database: globalThis.IDBDatabase

  readonly use: <A>(
    f: (database: globalThis.IDBDatabase) => Promise<A>
  ) => Effect.Effect<A, IndexedDbQueryError>

  readonly from: <
    A extends IndexedDbTable.IndexedDbTable.TableName<
      IndexedDbVersion.IndexedDbVersion.Tables<Source>
    >
  >(table: A) => IndexedDbQuery.From<Source, A>

  readonly clearAll: Effect.Effect<void, IndexedDbQueryError>

  readonly transaction: <
    Tables extends ReadonlyArray<
      IndexedDbTable.IndexedDbTable.TableName<
        IndexedDbVersion.IndexedDbVersion.Tables<Source>
      >
    >,
    Mode extends "readonly" | "readwrite" = "readonly"
  >(
    tables: Tables & {
      0: IndexedDbTable.IndexedDbTable.TableName<
        IndexedDbVersion.IndexedDbVersion.Tables<Source>
      >
    },
    mode: Mode,
    callback: (api: {
      readonly from: <A extends Tables[number]>(
        table: A
      ) => Mode extends "readwrite" ? IndexedDbQuery.From<Source, A> :
        Omit<
          IndexedDbQuery.From<Source, A>,
          "insert" | "insertAll" | "upsert" | "upsertAll" | "clear" | "delete"
        >
    }) => Effect.Effect<void>,
    options?: globalThis.IDBTransactionOptions
  ) => Effect.Effect<void>
}

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace IndexedDbQuery {
  /**
   * @since 1.0.0
   * @category models
   */
  export type SourceTableSchemaType<
    Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps,
    Table extends IndexedDbTable.IndexedDbTable.TableName<IndexedDbVersion.IndexedDbVersion.Tables<Source>>
  > = internal.IsKeyPathMissing<Source, Table> extends false ? IndexedDbTable.IndexedDbTable.AutoIncrement<
      IndexedDbTable.IndexedDbTable.WithName<
        IndexedDbVersion.IndexedDbVersion.Tables<Source>,
        Table
      >
    > extends true ?
        & /** keyPath when omitted becomes a `number` */ Omit<
          Schema.Schema.Type<
            IndexedDbVersion.IndexedDbVersion.SchemaWithName<Source, Table>
          >,
          IndexedDbTable.IndexedDbTable.KeyPath<
            IndexedDbTable.IndexedDbTable.WithName<
              IndexedDbVersion.IndexedDbVersion.Tables<Source>,
              Table
            >
          >
        >
        & {
          [
            K in IndexedDbTable.IndexedDbTable.KeyPath<
              IndexedDbTable.IndexedDbTable.WithName<
                IndexedDbVersion.IndexedDbVersion.Tables<Source>,
                Table
              >
            >
          ]:
            | Pick<
              Schema.Schema.Type<
                IndexedDbVersion.IndexedDbVersion.SchemaWithName<Source, Table>
              >,
              IndexedDbTable.IndexedDbTable.KeyPath<
                IndexedDbTable.IndexedDbTable.WithName<
                  IndexedDbVersion.IndexedDbVersion.Tables<Source>,
                  Table
                >
              >
            >[K]
            | number
        } :
    Schema.Schema.Type<
      IndexedDbVersion.IndexedDbVersion.SchemaWithName<Source, Table>
    > :
    Schema.Schema.Type<
      IndexedDbVersion.IndexedDbVersion.SchemaWithName<Source, Table>
    >

  /**
   * @since 1.0.0
   * @category models
   */
  export type ExtractIndexType<
    Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps,
    Table extends IndexedDbTable.IndexedDbTable.TableName<IndexedDbVersion.IndexedDbVersion.Tables<Source>>,
    Index extends IndexedDbDatabase.IndexedDbDatabase.IndexFromTable<Source, Table>
  > = internal.IsNever<Index> extends true ? Schema.Schema.Type<
      IndexedDbTable.IndexedDbTable.TableSchema<
        IndexedDbTable.IndexedDbTable.WithName<
          IndexedDbVersion.IndexedDbVersion.Tables<Source>,
          Table
        >
      >
    >[
      IndexedDbTable.IndexedDbTable.KeyPath<
        IndexedDbTable.IndexedDbTable.WithName<
          IndexedDbVersion.IndexedDbVersion.Tables<Source>,
          Table
        >
      >
    ]
    : Schema.Schema.Type<
      IndexedDbTable.IndexedDbTable.TableSchema<
        IndexedDbTable.IndexedDbTable.WithName<
          IndexedDbVersion.IndexedDbVersion.Tables<Source>,
          Table
        >
      >
    >[
      IndexedDbTable.IndexedDbTable.Indexes<
        IndexedDbTable.IndexedDbTable.WithName<
          IndexedDbVersion.IndexedDbVersion.Tables<Source>,
          Table
        >
      >[Index]
    ]

  /**
   * @since 1.0.0
   * @category models
   */
  export type ModifyWithKey<
    Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps,
    Table extends IndexedDbTable.IndexedDbTable.TableName<IndexedDbVersion.IndexedDbVersion.Tables<Source>>
  > = internal.IsKeyPathMissing<Source, Table> extends true ? IndexedDbTable.IndexedDbTable.AutoIncrement<
      IndexedDbTable.IndexedDbTable.WithName<
        IndexedDbVersion.IndexedDbVersion.Tables<Source>,
        Table
      >
    > extends false ? /** keyPath: null, autoIncrement: false */
        & SourceTableSchemaType<Source, Table>
        & { readonly key: globalThis.IDBValidKey } :
    /** keyPath: null, autoIncrement: true */
    SourceTableSchemaType<Source, Table> & { readonly key?: globalThis.IDBValidKey } :
    IndexedDbTable.IndexedDbTable.AutoIncrement<
      IndexedDbTable.IndexedDbTable.WithName<
        IndexedDbVersion.IndexedDbVersion.Tables<Source>,
        Table
      >
    > extends false ? /** keyPath: string, autoIncrement: false */ SourceTableSchemaType<Source, Table> :
    & /** keyPath: string, autoIncrement: true */ Omit<
      SourceTableSchemaType<Source, Table>,
      IndexedDbTable.IndexedDbTable.KeyPath<
        IndexedDbTable.IndexedDbTable.WithName<
          IndexedDbVersion.IndexedDbVersion.Tables<Source>,
          Table
        >
      >
    >
    & {
      [
        K in IndexedDbTable.IndexedDbTable.KeyPath<
          IndexedDbTable.IndexedDbTable.WithName<
            IndexedDbVersion.IndexedDbVersion.Tables<Source>,
            Table
          >
        >
      ]?: Pick<
        Schema.Schema.Type<
          IndexedDbVersion.IndexedDbVersion.SchemaWithName<Source, Table>
        >,
        IndexedDbTable.IndexedDbTable.KeyPath<
          IndexedDbTable.IndexedDbTable.WithName<
            IndexedDbVersion.IndexedDbVersion.Tables<Source>,
            Table
          >
        >
      >[K]
    }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface From<
    Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps = never,
    Table extends IndexedDbTable.IndexedDbTable.TableName<
      IndexedDbVersion.IndexedDbVersion.Tables<Source>
    > = never
  > {
    readonly [TypeId]: TypeId
    readonly tables: HashMap.HashMap<string, IndexedDbVersion.IndexedDbVersion.Tables<Source>>
    readonly table: Table
    readonly database: globalThis.IDBDatabase
    readonly IDBKeyRange: typeof globalThis.IDBKeyRange
    readonly transaction?: globalThis.IDBTransaction

    readonly clear: Effect.Effect<void, IndexedDbQueryError>

    readonly select: {
      <Index extends IndexedDbDatabase.IndexedDbDatabase.IndexFromTable<Source, Table>>(
        index: Index
      ): Select<Source, Table, Index>
      (): Select<Source, Table, never>
    }

    readonly count: {
      <Index extends IndexedDbDatabase.IndexedDbDatabase.IndexFromTable<Source, Table>>(
        index: Index
      ): Count<Source, Table, Index>
      (): Count<Source, Table, never>
    }

    readonly delete: {
      <Index extends IndexedDbDatabase.IndexedDbDatabase.IndexFromTable<Source, Table>>(
        index: Index
      ): Delete<Source, Table, Index>
      (): Delete<Source, Table, never>
    }

    readonly insert: (value: ModifyWithKey<Source, Table>) => Modify<Source, Table>
    readonly insertAll: (values: Array<ModifyWithKey<Source, Table>>) => ModifyAll<Source, Table>
    readonly upsert: (value: ModifyWithKey<Source, Table>) => Modify<Source, Table>
    readonly upsertAll: (values: Array<ModifyWithKey<Source, Table>>) => ModifyAll<Source, Table>
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
  > {
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
    Index extends IndexedDbDatabase.IndexedDbDatabase.IndexFromTable<Source, Table> = never
  > {
    [Symbol.iterator](): Effect.EffectGenerator<Effect.Effect<number>>

    readonly [TypeId]: TypeId
    readonly from: From<Source, Table>
    readonly index?: Index
    readonly only?: ExtractIndexType<Source, Table, Index>
    readonly lowerBound?: ExtractIndexType<Source, Table, Index>
    readonly upperBound?: ExtractIndexType<Source, Table, Index>
    readonly excludeLowerBound?: boolean
    readonly excludeUpperBound?: boolean

    readonly equals: (
      value: ExtractIndexType<Source, Table, Index>
    ) => Omit<Count<Source, Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly gte: (
      value: ExtractIndexType<Source, Table, Index>
    ) => Omit<Count<Source, Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly lte: (
      value: ExtractIndexType<Source, Table, Index>
    ) => Omit<Count<Source, Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly gt: (
      value: ExtractIndexType<Source, Table, Index>
    ) => Omit<Count<Source, Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly lt: (
      value: ExtractIndexType<Source, Table, Index>
    ) => Omit<Count<Source, Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly between: (
      lowerBound: ExtractIndexType<Source, Table, Index>,
      upperBound: ExtractIndexType<Source, Table, Index>,
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
    Index extends IndexedDbDatabase.IndexedDbDatabase.IndexFromTable<Source, Table> = never
  > {
    readonly [TypeId]: TypeId
    readonly from: From<Source, Table>
    readonly index?: Index

    readonly equals: (
      value: ExtractIndexType<Source, Table, Index>
    ) => Omit<Delete<Source, Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly gte: (
      value: ExtractIndexType<Source, Table, Index>
    ) => Omit<Delete<Source, Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly lte: (
      value: ExtractIndexType<Source, Table, Index>
    ) => Omit<Delete<Source, Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly gt: (
      value: ExtractIndexType<Source, Table, Index>
    ) => Omit<Delete<Source, Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly lt: (
      value: ExtractIndexType<Source, Table, Index>
    ) => Omit<Delete<Source, Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly between: (
      lowerBound: ExtractIndexType<Source, Table, Index>,
      upperBound: ExtractIndexType<Source, Table, Index>,
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
    Index extends IndexedDbDatabase.IndexedDbDatabase.IndexFromTable<Source, Table> = never
  > {
    [Symbol.iterator](): Effect.EffectGenerator<Effect.Effect<void>>

    readonly [TypeId]: TypeId
    readonly delete: DeletePartial<Source, Table, Index>
    readonly index?: Index
    readonly limitValue?: number
    readonly only?: ExtractIndexType<Source, Table, Index>
    readonly lowerBound?: ExtractIndexType<Source, Table, Index>
    readonly upperBound?: ExtractIndexType<Source, Table, Index>
    readonly excludeLowerBound?: boolean
    readonly excludeUpperBound?: boolean

    readonly equals: (
      value: ExtractIndexType<Source, Table, Index>
    ) => Omit<Delete<Source, Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly gte: (
      value: ExtractIndexType<Source, Table, Index>
    ) => Omit<Delete<Source, Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly lte: (
      value: ExtractIndexType<Source, Table, Index>
    ) => Omit<Delete<Source, Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly gt: (
      value: ExtractIndexType<Source, Table, Index>
    ) => Omit<Delete<Source, Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly lt: (
      value: ExtractIndexType<Source, Table, Index>
    ) => Omit<Delete<Source, Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly between: (
      lowerBound: ExtractIndexType<Source, Table, Index>,
      upperBound: ExtractIndexType<Source, Table, Index>,
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
    Index extends IndexedDbDatabase.IndexedDbDatabase.IndexFromTable<Source, Table> = never
  > {
    [Symbol.iterator](): Effect.EffectGenerator<Effect.Effect<Array<SourceTableSchemaType<Source, Table>>>>

    readonly [TypeId]: TypeId
    readonly from: From<Source, Table>
    readonly index?: Index
    readonly limitValue?: number
    readonly only?: ExtractIndexType<Source, Table, Index>
    readonly lowerBound?: ExtractIndexType<Source, Table, Index>
    readonly upperBound?: ExtractIndexType<Source, Table, Index>
    readonly excludeLowerBound?: boolean
    readonly excludeUpperBound?: boolean

    readonly equals: (
      value: ExtractIndexType<Source, Table, Index>
    ) => Omit<Select<Source, Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly gte: (
      value: ExtractIndexType<Source, Table, Index>
    ) => Omit<Select<Source, Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly lte: (
      value: ExtractIndexType<Source, Table, Index>
    ) => Omit<Select<Source, Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly gt: (
      value: ExtractIndexType<Source, Table, Index>
    ) => Omit<Select<Source, Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly lt: (
      value: ExtractIndexType<Source, Table, Index>
    ) => Omit<Select<Source, Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly between: (
      lowerBound: ExtractIndexType<Source, Table, Index>,
      upperBound: ExtractIndexType<Source, Table, Index>,
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
    Index extends IndexedDbDatabase.IndexedDbDatabase.IndexFromTable<Source, Table> = never
  > {
    [Symbol.iterator](): Effect.EffectGenerator<Effect.Effect<SourceTableSchemaType<Source, Table>>>

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
  > {
    [Symbol.iterator](): Effect.EffectGenerator<Effect.Effect<globalThis.IDBValidKey>>

    readonly [TypeId]: TypeId
    readonly operation: "add" | "put"
    readonly from: From<Source, Table>
    readonly value: ModifyWithKey<Source, Table>
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
  > {
    [Symbol.iterator](): Effect.EffectGenerator<Effect.Effect<Array<globalThis.IDBValidKey>>>

    readonly [TypeId]: TypeId
    readonly operation: "add" | "put"
    readonly from: From<Source, Table>
    readonly values: Array<ModifyWithKey<Source, Table>>
  }
}
