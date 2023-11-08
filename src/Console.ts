import type { TypeId, UnsafeConsole } from "./Console.impl.js"
import type { Effect } from "./Effect.js"

export * from "./Console.impl.js"
export * from "./internal/Jumpers/Console.js"

export declare namespace Console {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./Console.impl.js"
}
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
    readonly label?: string
    readonly collapsed?: boolean
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
