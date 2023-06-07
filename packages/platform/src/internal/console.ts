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
    return (self) =>
      Effect.acquireUseRelease(
        options?.collapsed ?
          Effect.sync(() => console.groupCollapsed(options?.label)) :
          Effect.sync(() => console.group(options?.label)),
        () => self,
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
    return (self) =>
      Effect.acquireUseRelease(
        Effect.sync(() => console.time(label)),
        () => self,
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
  }
})

/** @internal */
export const layer = Layer.succeed(Console, consoleImpl)
