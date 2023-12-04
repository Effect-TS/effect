import type * as Console from "../Console.js"
import * as Context from "../Context.js"
import type * as Effect from "../Effect.js"
import { dual } from "../Function.js"
import type * as Layer from "../Layer.js"
import type * as Scope from "../Scope.js"
import * as core from "./core.js"
import * as defaultServices from "./defaultServices.js"
import * as defaultConsole from "./defaultServices/console.js"
import * as fiberRuntime from "./fiberRuntime.js"
import * as layer from "./layer.js"

/** @internal */
export const console: Effect.Effect<never, never, Console.Console> = core.map(
  core.fiberRefGet(defaultServices.currentServices),
  Context.get(defaultConsole.consoleTag)
)

/** @internal */
export const consoleWith = <R, E, A>(f: (console: Console.Console) => Effect.Effect<R, E, A>) =>
  core.fiberRefGetWith(
    defaultServices.currentServices,
    (services) => f(Context.get(services, defaultConsole.consoleTag))
  )

/** @internal */
export const withConsole = dual<
  <A extends Console.Console>(console: A) => <R, E, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>,
  <R, E, A extends Console.Console>(effect: Effect.Effect<R, E, A>, console: A) => Effect.Effect<R, E, A>
>(2, (effect, value) =>
  core.fiberRefLocallyWith(
    effect,
    defaultServices.currentServices,
    Context.add(defaultConsole.consoleTag, value)
  ))

/** @internal */
export const withConsoleScoped = <A extends Console.Console>(console: A): Effect.Effect<Scope.Scope, never, void> =>
  fiberRuntime.fiberRefLocallyScopedWith(
    defaultServices.currentServices,
    Context.add(defaultConsole.consoleTag, console)
  )

/** @internal */
export const setConsole = <A extends Console.Console>(console: A): Layer.Layer<never, never, never> =>
  layer.scopedDiscard(
    fiberRuntime.fiberRefLocallyScopedWith(
      defaultServices.currentServices,
      Context.add(defaultConsole.consoleTag, console)
    )
  )

/** @internal */
export const assert = (condition: boolean, ...args: ReadonlyArray<any>) =>
  consoleWith((_) => _.assert(condition, ...args))

/** @internal */
export const clear = consoleWith((_) => _.clear)

/** @internal */
export const count = (label?: string) => consoleWith((_) => _.count(label))

/** @internal */
export const countReset = (label?: string) => consoleWith((_) => _.countReset(label))

/** @internal */
export const debug = (...args: ReadonlyArray<any>) => consoleWith((_) => _.debug(...args))

/** @internal */
export const dir = (item: any, options?: any) => consoleWith((_) => _.dir(item, options))

/** @internal */
export const dirxml = (...args: ReadonlyArray<any>) => consoleWith((_) => _.dirxml(...args))

/** @internal */
export const error = (...args: ReadonlyArray<any>) => consoleWith((_) => _.error(...args))

/** @internal */
export const group = (options?: {
  label?: string | undefined
  collapsed?: boolean | undefined
}) =>
  consoleWith((_) =>
    fiberRuntime.acquireRelease(
      _.group(options),
      () => _.groupEnd
    )
  )

/** @internal */
export const info = (...args: ReadonlyArray<any>) => consoleWith((_) => _.info(...args))

/** @internal */
export const log = (...args: ReadonlyArray<any>) => consoleWith((_) => _.log(...args))

/** @internal */
export const table = (tabularData: any, properties?: ReadonlyArray<string>) =>
  consoleWith((_) => _.table(tabularData, properties))

/** @internal */
export const time = (label?: string) =>
  consoleWith((_) =>
    fiberRuntime.acquireRelease(
      _.time(label),
      () => _.timeEnd(label)
    )
  )

/** @internal */
export const timeLog = (label?: string, ...args: ReadonlyArray<any>) => consoleWith((_) => _.timeLog(label, ...args))

/** @internal */
export const trace = (...args: ReadonlyArray<any>) => consoleWith((_) => _.trace(...args))

/** @internal */
export const warn = (...args: ReadonlyArray<any>) => consoleWith((_) => _.warn(...args))

/** @internal */
export const withGroup = dual<
  (
    options?: {
      readonly label?: string | undefined
      readonly collapsed?: boolean | undefined
    }
  ) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>,
  <R, E, A>(
    self: Effect.Effect<R, E, A>,
    options?: {
      readonly label?: string | undefined
      readonly collapsed?: boolean | undefined
    }
  ) => Effect.Effect<R, E, A>
>((args) => core.isEffect(args[0]), (self, options) =>
  consoleWith((_) =>
    core.acquireUseRelease(
      _.group(options),
      () => self,
      () => _.groupEnd
    )
  ))

/** @internal */
export const withTime = dual<
  (label?: string) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>,
  <R, E, A>(self: Effect.Effect<R, E, A>, label?: string) => Effect.Effect<R, E, A>
>((args) => core.isEffect(args[0]), (self, label) =>
  consoleWith((_) =>
    core.acquireUseRelease(
      _.time(label),
      () => self,
      () => _.timeEnd(label)
    )
  ))
