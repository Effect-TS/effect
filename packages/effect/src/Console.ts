/**
 * @since 2.0.0
 */
import type * as Context from "./Context.js"
import type { Effect } from "./Effect.js"
import * as internal from "./internal/console.js"
import * as defaultConsole from "./internal/defaultServices/console.js"
import type * as Layer from "./Layer.js"
import type { Scope } from "./Scope.js"

/**
 * @since 2.0.0
 * @category type ids
 */
export const TypeId: unique symbol = defaultConsole.TypeId

/**
 * @since 2.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 2.0.0
 * @category model
 */
export interface Console {
  readonly [TypeId]: TypeId
  assert(condition: boolean, ...args: ReadonlyArray<any>): Effect<unknown>
  readonly clear: Effect<unknown>
  count(label?: string): Effect<unknown>
  countReset(label?: string): Effect<unknown>
  debug(...args: ReadonlyArray<any>): Effect<unknown>
  dir(item: any, options?: any): Effect<unknown>
  dirxml(...args: ReadonlyArray<any>): Effect<unknown>
  error(...args: ReadonlyArray<any>): Effect<unknown>
  group(options?: {
    readonly label?: string | undefined
    readonly collapsed?: boolean | undefined
  }): Effect<unknown>
  readonly groupEnd: Effect<unknown>
  info(...args: ReadonlyArray<any>): Effect<unknown>
  log(...args: ReadonlyArray<any>): Effect<unknown>
  table(tabularData: any, properties?: ReadonlyArray<string>): Effect<unknown>
  time(label?: string): Effect<unknown>
  timeEnd(label?: string): Effect<unknown>
  timeLog(label?: string, ...args: ReadonlyArray<any>): Effect<unknown>
  trace(...args: ReadonlyArray<any>): Effect<unknown>
  warn(...args: ReadonlyArray<any>): Effect<unknown>
  readonly unsafe: UnsafeConsole
}

/**
 * @since 2.0.0
 * @category model
 */
export interface UnsafeConsole {
  assert(condition: boolean, ...args: ReadonlyArray<any>): void
  clear(): void
  count(label?: string): void
  countReset(label?: string): void
  debug(...args: ReadonlyArray<any>): void
  dir(item: any, options?: any): void
  dirxml(...args: ReadonlyArray<any>): void
  error(...args: ReadonlyArray<any>): void
  group(options?: {
    readonly label?: string | undefined
    readonly collapsed?: boolean | undefined
  }): void
  groupEnd(): void
  info(...args: ReadonlyArray<any>): void
  log(...args: ReadonlyArray<any>): void
  table(tabularData: any, properties?: ReadonlyArray<string>): void
  time(label?: string): void
  timeEnd(label?: string): void
  timeLog(label?: string, ...args: ReadonlyArray<any>): void
  trace(...args: ReadonlyArray<any>): void
  warn(...args: ReadonlyArray<any>): void
}

/**
 * @since 2.0.0
 * @category context
 */
export const Console: Context.Tag<Console, Console> = defaultConsole.consoleTag

/**
 * @since 2.0.0
 * @category default services
 */
export const withConsole: {
  <C extends Console>(console: C): <A, E, R>(effect: Effect<A, E, R>) => Effect<A, E, R>
  <A, E, R, C extends Console>(effect: Effect<A, E, R>, console: C): Effect<A, E, R>
} = internal.withConsole

/**
 * @since 2.0.0
 * @category default services
 */
export const setConsole: <A extends Console>(console: A) => Layer.Layer<never> = internal.setConsole

/**
 * @since 2.0.0
 * @category accessor
 */
export const consoleWith: <A, E, R>(f: (console: Console) => Effect<A, E, R>) => Effect<A, E, R> = internal.consoleWith

/**
 * @since 2.0.0
 * @category accessor
 */
export const assert: (condition: boolean, ...args: ReadonlyArray<any>) => Effect<unknown> = internal.assert

/**
 * @since 2.0.0
 * @category accessor
 */
export const clear: Effect<unknown> = internal.clear

/**
 * @since 2.0.0
 * @category accessor
 */
export const count: (label?: string) => Effect<unknown> = internal.count

/**
 * @since 2.0.0
 * @category accessor
 */
export const countReset: (label?: string) => Effect<unknown> = internal.countReset

/**
 * @since 2.0.0
 * @category accessor
 */
export const debug: (...args: ReadonlyArray<any>) => Effect<unknown> = internal.debug

/**
 * @since 2.0.0
 * @category accessor
 */
export const dir: (item: any, options?: any) => Effect<unknown> = internal.dir

/**
 * @since 2.0.0
 * @category accessor
 */
export const dirxml: (...args: ReadonlyArray<any>) => Effect<unknown> = internal.dirxml

/**
 * @since 2.0.0
 * @category accessor
 */
export const error: (...args: ReadonlyArray<any>) => Effect<unknown> = internal.error

/**
 * @since 2.0.0
 * @category accessor
 */
export const group: (
  options?: { label?: string | undefined; collapsed?: boolean | undefined } | undefined
) => Effect<unknown, never, Scope> = internal.group

/**
 * @since 2.0.0
 * @category accessor
 */
export const info: (...args: ReadonlyArray<any>) => Effect<unknown> = internal.info

/**
 * @since 2.0.0
 * @category accessor
 */
export const log: (...args: ReadonlyArray<any>) => Effect<unknown> = internal.log

/**
 * @since 2.0.0
 * @category accessor
 */
export const table: (tabularData: any, properties?: ReadonlyArray<string>) => Effect<unknown> = internal.table

/**
 * @since 2.0.0
 * @category accessor
 */
export const time: (label?: string | undefined) => Effect<unknown, never, Scope> = internal.time

/**
 * @since 2.0.0
 * @category accessor
 */
export const timeLog: (label?: string, ...args: ReadonlyArray<any>) => Effect<unknown> = internal.timeLog

/**
 * @since 2.0.0
 * @category accessor
 */
export const trace: (...args: ReadonlyArray<any>) => Effect<unknown> = internal.trace

/**
 * @since 2.0.0
 * @category accessor
 */
export const warn: (...args: ReadonlyArray<any>) => Effect<unknown> = internal.warn

/**
 * @since 2.0.0
 * @category accessor
 */
export const withGroup: {
  (options?: {
    readonly label?: string | undefined
    readonly collapsed?: boolean | undefined
  }): <A, E, R>(self: Effect<A, E, R>) => Effect<A, E, R>
  <A, E, R>(self: Effect<A, E, R>, options?: {
    readonly label?: string | undefined
    readonly collapsed?: boolean | undefined
  }): Effect<A, E, R>
} = internal.withGroup

/**
 * @since 2.0.0
 * @category accessor
 */
export const withTime: {
  (label?: string): <A, E, R>(self: Effect<A, E, R>) => Effect<A, E, R>
  <A, E, R>(self: Effect<A, E, R>, label?: string): Effect<A, E, R>
} = internal.withTime
