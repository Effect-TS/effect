import { Tag } from "@effect/data/Context"
import * as Effect from "@effect/io/Effect"
import * as Layer from "@effect/io/Layer"
import type { Console as Console_ } from "@effect/platform/Console"

/**
 * @since 1.0.0
 * @category tag
 */
export const Console = Tag<Console_>()

/** @internal */
const consoleImpl = Console.of({
  assert(condition, ...args) {
    return Effect.sync(() => {
      console.assert(condition, ...args)
    })
  },
  clear() {
    return Effect.sync(() => {
      console.clear()
    })
  },
  count(label) {
    return Effect.sync(() => {
      console.count(label)
    })
  },
  countReset(label) {
    return Effect.sync(() => {
      console.countReset(label)
    })
  },
  debug(...args) {
    return Effect.sync(() => {
      console.debug(...args)
    })
  },
  dir(...args) {
    return Effect.sync(() => {
      console.dir(...args)
    })
  },
  dirxml(...args) {
    return Effect.sync(() => {
      console.dirxml(...args)
    })
  },
  error(...args) {
    return Effect.sync(() => {
      console.error(...args)
    })
  },
  group(options) {
    return Effect.acquireRelease(
      options?.collapsed ?
        Effect.sync(() => console.groupCollapsed(options?.label)) :
        Effect.sync(() => console.group(options?.label)),
      () => Effect.sync(() => console.groupEnd())
    )
  },
  info(...args) {
    return Effect.sync(() => {
      console.info(...args)
    })
  },
  log(...args) {
    return Effect.sync(() => {
      console.log(...args)
    })
  },
  table(tabularData, properties) {
    return Effect.sync(() => {
      console.table(tabularData, properties)
    })
  },
  time(label) {
    return Effect.acquireRelease(
      Effect.sync(() => console.time(label)),
      () => Effect.sync(() => console.timeEnd(label))
    )
  },
  timeLog(label, ...args) {
    return Effect.sync(() => {
      console.timeLog(label, ...args)
    })
  },
  trace(...args) {
    return Effect.sync(() => {
      console.trace(...args)
    })
  },
  warn(...args) {
    return Effect.sync(() => {
      console.warn(...args)
    })
  },
  withGroup(options) {
    return (self) =>
      Effect.acquireUseRelease(
        options?.collapsed ?
          Effect.sync(() => console.groupCollapsed(options?.label)) :
          Effect.sync(() => console.group(options?.label)),
        () => self,
        () => Effect.sync(() => console.groupEnd())
      )
  },
  withTime(label) {
    return (self) =>
      Effect.acquireUseRelease(
        Effect.sync(() => console.time(label)),
        () => self,
        () => Effect.sync(() => console.timeEnd(label))
      )
  }
})

/** @internal */
export const layer = Layer.succeed(Console, consoleImpl)

/** @internal */
export const assert = (condition: boolean, ...args: ReadonlyArray<any>) =>
  Effect.flatMap(Console, (_) => _.assert(condition, ...args))

/** @internal */
export const clear = () => Effect.flatMap(Console, (_) => _.clear())

/** @internal */
export const count = (label?: string) => Effect.flatMap(Console, (_) => _.count(label))

/** @internal */
export const countReset = (label?: string) => Effect.flatMap(Console, (_) => _.countReset(label))

/** @internal */
export const debug = (...args: ReadonlyArray<any>) => Effect.flatMap(Console, (_) => _.debug(...args))

/** @internal */
export const dir = (...args: ReadonlyArray<any>) => Effect.flatMap(Console, (_) => _.dir(...args))

/** @internal */
export const dirxml = (...args: ReadonlyArray<any>) => Effect.flatMap(Console, (_) => _.dirxml(...args))

/** @internal */
export const error = (...args: ReadonlyArray<any>) => Effect.flatMap(Console, (_) => _.error(...args))

/** @internal */
export const group = (options?: { label?: string; collapsed?: boolean }) =>
  Effect.flatMap(Console, (_) => _.group(options))

/** @internal */
export const info = (...args: ReadonlyArray<any>) => Effect.flatMap(Console, (_) => _.info(...args))

/** @internal */
export const log = (...args: ReadonlyArray<any>) => Effect.flatMap(Console, (_) => _.log(...args))

/** @internal */
export const table = (tabularData: any, properties?: ReadonlyArray<string>) =>
  Effect.flatMap(Console, (_) => _.table(tabularData, properties))

/** @internal */
export const time = (label?: string) => Effect.flatMap(Console, (_) => _.time(label))

/** @internal */
export const timeLog = (label?: string, ...args: ReadonlyArray<any>) =>
  Effect.flatMap(Console, (_) => _.timeLog(label, ...args))

/** @internal */
export const trace = (...args: ReadonlyArray<any>) => Effect.flatMap(Console, (_) => _.trace(...args))

/** @internal */
export const warn = (...args: ReadonlyArray<any>) => Effect.flatMap(Console, (_) => _.warn(...args))

/** @internal */
export const withGroup = (options?: { label?: string; collapsed?: boolean }) =>
  <R, E, A>(
    self: Effect.Effect<R, E, A>
  ) => Effect.flatMap(Console, (_) => _.withGroup(options)(self))

/** @internal */
export const withTime = (label?: string) =>
  <R, E, A>(
    self: Effect.Effect<R, E, A>
  ) => Effect.flatMap(Console, (_) => _.withTime(label)(self))
