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
  assert(condition: boolean, ...args: ReadonlyArray<any>): Effect<never, never, void>
  readonly clear: Effect<never, never, void>
  count(label?: string): Effect<never, never, void>
  countReset(label?: string): Effect<never, never, void>
  debug(...args: ReadonlyArray<any>): Effect<never, never, void>
  dir(item: any, options?: any): Effect<never, never, void>
  dirxml(...args: ReadonlyArray<any>): Effect<never, never, void>
  error(...args: ReadonlyArray<any>): Effect<never, never, void>
  group(options?: {
    readonly label?: string | undefined
    readonly collapsed?: boolean | undefined
  }): Effect<never, never, void>
  readonly groupEnd: Effect<never, never, void>
  info(...args: ReadonlyArray<any>): Effect<never, never, void>
  log(...args: ReadonlyArray<any>): Effect<never, never, void>
  table(tabularData: any, properties?: ReadonlyArray<string>): Effect<never, never, void>
  time(label?: string): Effect<never, never, void>
  timeEnd(label?: string): Effect<never, never, void>
  timeLog(label?: string, ...args: ReadonlyArray<any>): Effect<never, never, void>
  trace(...args: ReadonlyArray<any>): Effect<never, never, void>
  warn(...args: ReadonlyArray<any>): Effect<never, never, void>
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
  <A extends Console>(console: A): <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A>
  <R, E, A extends Console>(effect: Effect<R, E, A>, console: A): Effect<R, E, A>
} = internal.withConsole

/**
 * @since 2.0.0
 * @category default services
 */
export const setConsole: <A extends Console>(console: A) => Layer.Layer<never, never, never> = internal.setConsole

/**
 * @since 2.0.0
 * @category accessor
 */
export const consoleWith: <R, E, A>(f: (console: Console) => Effect<R, E, A>) => Effect<R, E, A> = internal.consoleWith

/**
 * @since 2.0.0
 * @category accessor
 */
export const assert: (condition: boolean, ...args: ReadonlyArray<any>) => Effect<never, never, void> = internal.assert

/**
 * @since 2.0.0
 * @category accessor
 */
export const clear: Effect<never, never, void> = internal.clear

/**
 * @since 2.0.0
 * @category accessor
 */
export const count: (label?: string) => Effect<never, never, void> = internal.count

/**
 * @since 2.0.0
 * @category accessor
 */
export const countReset: (label?: string) => Effect<never, never, void> = internal.countReset

/**
 * @since 2.0.0
 * @category accessor
 */
export const debug: (...args: ReadonlyArray<any>) => Effect<never, never, void> = internal.debug

/**
 * @since 2.0.0
 * @category accessor
 */
export const dir: (item: any, options?: any) => Effect<never, never, void> = internal.dir

/**
 * @since 2.0.0
 * @category accessor
 */
export const dirxml: (...args: ReadonlyArray<any>) => Effect<never, never, void> = internal.dirxml

/**
 * @since 2.0.0
 * @category accessor
 */
export const error: (...args: ReadonlyArray<any>) => Effect<never, never, void> = internal.error

/**
 * @since 2.0.0
 * @category accessor
 */
export const group: (
  options?: {
    label?: string | undefined
    collapsed?: boolean | undefined
  }
) => Effect<Scope, never, void> = internal.group

/**
 * @since 2.0.0
 * @category accessor
 */
export const info: (...args: ReadonlyArray<any>) => Effect<never, never, void> = internal.info

/**
 * @since 2.0.0
 * @category accessor
 */
export const log: (...args: ReadonlyArray<any>) => Effect<never, never, void> = internal.log

/**
 * @since 2.0.0
 * @category accessor
 */
export const table: (tabularData: any, properties?: ReadonlyArray<string>) => Effect<never, never, void> =
  internal.table

/**
 * @since 2.0.0
 * @category accessor
 */
export const time: (label?: string) => Effect<Scope, never, void> = internal.time

/**
 * @since 2.0.0
 * @category accessor
 */
export const timeLog: (label?: string, ...args: ReadonlyArray<any>) => Effect<never, never, void> = internal.timeLog

/**
 * @since 2.0.0
 * @category accessor
 */
export const trace: (...args: ReadonlyArray<any>) => Effect<never, never, void> = internal.trace

/**
 * @since 2.0.0
 * @category accessor
 */
export const warn: (...args: ReadonlyArray<any>) => Effect<never, never, void> = internal.warn

/**
 * @since 2.0.0
 * @category accessor
 */
export const withGroup: {
  (options?: {
    readonly label?: string | undefined
    readonly collapsed?: boolean | undefined
  }): <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A>
  <R, E, A>(self: Effect<R, E, A>, options?: {
    readonly label?: string | undefined
    readonly collapsed?: boolean | undefined
  }): Effect<R, E, A>
} = internal.withGroup

/**
 * @since 2.0.0
 * @category accessor
 */
export const withTime: {
  (label?: string): <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A>
  <R, E, A>(self: Effect<R, E, A>, label?: string): Effect<R, E, A>
} = internal.withTime
