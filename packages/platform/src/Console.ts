/**
 * @since 1.0.0
 */
import type * as Context from "@effect/data/Context"
import type { Effect } from "@effect/io/Effect"
import type { Layer } from "@effect/io/Layer"
import type { Scope } from "@effect/io/Scope"
import * as internal from "@effect/platform/internal/console"

/**
 * @since 1.0.0
 * @category model
 */
export interface Console {
  assert(condition: boolean, ...args: ReadonlyArray<any>): Effect<never, never, void>
  clear(): Effect<never, never, void>
  count(label?: string): Effect<never, never, void>
  countReset(label?: string): Effect<never, never, void>
  debug(...args: ReadonlyArray<any>): Effect<never, never, void>
  dir(...args: ReadonlyArray<any>): Effect<never, never, void>
  dirxml(...args: ReadonlyArray<any>): Effect<never, never, void>
  error(...args: ReadonlyArray<any>): Effect<never, never, void>
  group(options?: {
    readonly label?: string
    readonly collapsed?: boolean
  }): Effect<Scope, never, void>
  info(...args: ReadonlyArray<any>): Effect<never, never, void>
  log(...args: ReadonlyArray<any>): Effect<never, never, void>
  table(tabularData: any, properties?: ReadonlyArray<string>): Effect<never, never, void>
  time(label?: string): Effect<Scope, never, void>
  timeLog(label?: string, ...args: ReadonlyArray<any>): Effect<never, never, void>
  trace(...args: ReadonlyArray<any>): Effect<never, never, void>
  warn(...args: ReadonlyArray<any>): Effect<never, never, void>
  withGroup(options?: {
    readonly label?: string
    readonly collapsed?: boolean
  }): <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A>
  withTime(label?: string): <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A>
}

/**
 * @since 1.0.0
 * @category tag
 */
export const Console: Context.Tag<Console, Console> = internal.Console

/**
 * @since 1.0.0
 * @category layer
 */
export const layer: Layer<never, never, Console> = internal.layer

/**
 * @since 1.0.0
 * @category accessor
 */
export const assert: (condition: boolean, ...args: ReadonlyArray<any>) => Effect<Console, never, void> = internal.assert

/**
 * @since 1.0.0
 * @category accessor
 */
export const clear: () => Effect<Console, never, void> = internal.clear

/**
 * @since 1.0.0
 * @category accessor
 */
export const count: (label?: string) => Effect<Console, never, void> = internal.count

/**
 * @since 1.0.0
 * @category accessor
 */
export const countReset: (label?: string) => Effect<Console, never, void> = internal.countReset

/**
 * @since 1.0.0
 * @category accessor
 */
export const debug: (...args: ReadonlyArray<any>) => Effect<Console, never, void> = internal.debug

/**
 * @since 1.0.0
 * @category accessor
 */
export const dir: (...args: ReadonlyArray<any>) => Effect<Console, never, void> = internal.dir

/**
 * @since 1.0.0
 * @category accessor
 */
export const dirxml: (...args: ReadonlyArray<any>) => Effect<Console, never, void> = internal.dirxml

/**
 * @since 1.0.0
 * @category accessor
 */
export const error: (...args: ReadonlyArray<any>) => Effect<Console, never, void> = internal.error

/**
 * @since 1.0.0
 * @category accessor
 */
export const group: (
  options?: { label?: string; collapsed?: boolean }
) => Effect<Console | Scope, never, void> = internal.group

/**
 * @since 1.0.0
 * @category accessor
 */
export const info: (...args: ReadonlyArray<any>) => Effect<Console, never, void> = internal.info

/**
 * @since 1.0.0
 * @category accessor
 */
export const log: (...args: ReadonlyArray<any>) => Effect<Console, never, void> = internal.log

/**
 * @since 1.0.0
 * @category accessor
 */
export const table: (tabularData: any, properties?: ReadonlyArray<string>) => Effect<Console, never, void> =
  internal.table

/**
 * @since 1.0.0
 * @category accessor
 */
export const time: (label?: string) => Effect<Console | Scope, never, void> = internal.time

/**
 * @since 1.0.0
 * @category accessor
 */
export const timeLog: (label?: string, ...args: ReadonlyArray<any>) => Effect<Console, never, void> = internal.timeLog

/**
 * @since 1.0.0
 * @category accessor
 */
export const trace: (...args: ReadonlyArray<any>) => Effect<Console, never, void> = internal.trace

/**
 * @since 1.0.0
 * @category accessor
 */
export const warn: (...args: ReadonlyArray<any>) => Effect<Console, never, void> = internal.warn

/**
 * @since 1.0.0
 * @category accessor
 */
export const withGroup: (
  options?: { label?: string; collapsed?: boolean }
) => <R, E, A>(self: Effect<R, E, A>) => Effect<Console | R, E, A> = internal.withGroup

/**
 * @since 1.0.0
 * @category accessor
 */
export const withTime: (label?: string) => <R, E, A>(self: Effect<R, E, A>) => Effect<Console | R, E, A> =
  internal.withTime
