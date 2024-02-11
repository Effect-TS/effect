/**
 * @since 2.0.0
 */
import * as Context from "effect/Context"
import type { Effect } from "effect/Effect"
import type { Scope } from "effect/Scope"
import type { Stream } from "effect/Stream"
import type { SqlError } from "./Error.js"
import type { Primitive, Statement } from "./Statement.js"

/**
 * @category model
 * @since 2.0.0
 */
export interface Connection {
  readonly execute: <A extends object = Row>(
    statement: Statement<A>
  ) => Effect<ReadonlyArray<A>, SqlError>

  readonly executeStream: <A extends object = Row>(
    statement: Statement<A>
  ) => Stream<A, SqlError>

  readonly executeWithoutTransform: <A extends object = Row>(
    statement: Statement<A>
  ) => Effect<ReadonlyArray<A>, SqlError>

  readonly executeValues: <A extends object = Row>(
    statement: Statement<A>
  ) => Effect<ReadonlyArray<ReadonlyArray<Primitive>>, SqlError>

  readonly executeRaw: <A extends object = Row>(
    sql: string,
    params?: ReadonlyArray<Primitive> | undefined
  ) => Effect<ReadonlyArray<A>, SqlError>
}

/**
 * @since 2.0.0
 */
export namespace Connection {
  /**
   * @category model
   * @since 2.0.0
   */
  export type Acquirer = Effect<Connection, SqlError, Scope>
}

/**
 * @category tag
 * @since 2.0.0
 */
export const Connection = Context.GenericTag<Connection>("@services/Connection")

/**
 * @category model
 * @since 2.0.0
 */
export type Row = { readonly [column: string]: Primitive }
