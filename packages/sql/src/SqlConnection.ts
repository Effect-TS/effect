/**
 * @since 1.0.0
 */
import * as Context from "effect/Context"
import type { Effect } from "effect/Effect"
import type { Scope } from "effect/Scope"
import type { Stream } from "effect/Stream"
import type { SqlError } from "./SqlError.js"

/**
 * @category model
 * @since 1.0.0
 */
export interface Connection {
  readonly execute: (
    sql: string,
    params: ReadonlyArray<unknown>,
    transformRows: (<A extends object>(row: ReadonlyArray<A>) => ReadonlyArray<A>) | undefined
  ) => Effect<ReadonlyArray<any>, SqlError>

  /**
   * Execute the specified SQL query and return the raw results directly from
   * underlying SQL client.
   */
  readonly executeRaw: (
    sql: string,
    params: ReadonlyArray<unknown>
  ) => Effect<unknown, SqlError>

  readonly executeStream: (
    sql: string,
    params: ReadonlyArray<unknown>,
    transformRows: (<A extends object>(row: ReadonlyArray<A>) => ReadonlyArray<A>) | undefined
  ) => Stream<any, SqlError>

  readonly executeValues: (
    sql: string,
    params: ReadonlyArray<unknown>
  ) => Effect<ReadonlyArray<ReadonlyArray<unknown>>, SqlError>

  readonly executeUnprepared: (
    sql: string,
    params: ReadonlyArray<unknown>,
    transformRows: (<A extends object>(row: ReadonlyArray<A>) => ReadonlyArray<A>) | undefined
  ) => Effect<ReadonlyArray<any>, SqlError>
}

/**
 * @since 1.0.0
 */
export namespace Connection {
  /**
   * @category model
   * @since 1.0.0
   */
  export type Acquirer = Effect<Connection, SqlError, Scope>
}

/**
 * @category tag
 * @since 1.0.0
 */
export const Connection = Context.GenericTag<Connection>("@services/Connection")

/**
 * @category model
 * @since 1.0.0
 */
export type Row = { readonly [column: string]: unknown }
