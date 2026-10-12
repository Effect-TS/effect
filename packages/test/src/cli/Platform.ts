// Runtime platforms (Node, Bun or Deno), independent of any particular program. Each
// runtime's module default-exports `makePlatform({ layer, run })`; the entry point
// combines them with `makePlatforms({ node, bun, deno })`, whose `run` imports only the
// current runtime's module and hands the program over to that platform's own `run`.
// The services a program may use are inferred: whatever every platform provides.
import * as Effect from "effect/Effect"
import type * as Layer from "effect/Layer"

export type Runtime = "node" | "bun" | "deno"

/** A runtime's implementation of the services `R`, plus its way of running a main program. */
export interface Platform<R> {
  readonly layer: Layer.Layer<R>
  /** Runs a main program: signal handling, exit codes, error reporting (e.g. `NodeRuntime.runMain`). */
  readonly run: <A, E>(effect: Effect.Effect<A, E>) => void
}

/** Declares a runtime's platform; `R` is inferred from its layer. Default-export the result. */
export const makePlatform = <R>(platform: Platform<R>): Platform<R> => platform

/**
 * For each runtime, a lazy import of the module that default-exports its platform. Write
 * each entry as `() => import("./platform/node.ts")`: the build rewrites `.ts` to `.js` in
 * literal `import()` calls, but not in path strings.
 */
export type Imports = {
  readonly [K in Runtime]: () => Promise<{ readonly default: Platform<any> }>
}

/** The services one runtime's platform provides. */
export type Provides<I extends Imports, K extends Runtime> = Awaited<ReturnType<I[K]>>["default"] extends
  Platform<infer R> ? R : never

/** The services every runtime's platform provides: the members common to all of them. */
export type Services<I extends Imports> = Extract<Provides<I, "node">, Extract<Provides<I, "bun">, Provides<I, "deno">>>

export interface Platforms<R> {
  /** The current runtime's platform. Only its module is imported. */
  readonly load: Effect.Effect<Platform<R>>
  /**
   * Loads the current runtime's platform, then hands `main`, with the platform's layer
   * provided, over to that platform's `run` (signal handling, exit codes, error
   * reporting). If loading itself fails, the cause is logged and the process exits with 1.
   */
  readonly run: <A, E>(main: Effect.Effect<A, E, R>) => void
}

export const detect = (): Runtime => "Bun" in globalThis ? "bun" : "Deno" in globalThis ? "deno" : "node"

export const makePlatforms = <I extends Imports>(imports: I): Platforms<Services<I>> => {
  const load: Effect.Effect<Platform<Services<I>>> = Effect.promise(() => imports[detect()]()).pipe(
    Effect.map((module) => module.default)
  )
  const run = <A, E>(main: Effect.Effect<A, E, Services<I>>): void => {
    Effect.runFork(
      load.pipe(
        Effect.flatMap((platform) => Effect.sync(() => platform.run(Effect.provide(main, platform.layer)))),
        Effect.tapCause((cause) =>
          Effect.andThen(Effect.logError(cause), Effect.sync(() => (globalThis.process.exitCode = 1)))
        )
      )
    )
  }
  return { load, run }
}

/**
 * URL of the module at `path` (no extension) relative to `base`, with the extension `base`
 * itself was loaded with: `.ts` when running from source, `.js` once built. The build
 * rewrites `.ts` in `import()` specifiers, but not in plain file URLs like this one.
 */
export const moduleUrl = (path: string, base: string): URL =>
  new URL(`${path}${base.endsWith(".ts") ? ".ts" : ".js"}`, base)
