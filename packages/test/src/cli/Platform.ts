// Runtime platforms (Node, Bun or Deno), independent of any particular program. A program
// describes its platforms as a map from runtime to a lazy import (`Imports`); `runMain`
// imports only the current runtime's module and hands the program over to that platform's
// own `runMain`. Nothing here knows what the program is or which services it needs.
import * as Effect from "effect/Effect"
import type * as Layer from "effect/Layer"

export type Runtime = "node" | "bun" | "deno"

/** A runtime's implementation of the services `R`, plus its way of running a main program. */
export interface Platform<R> {
  readonly runtime: Runtime
  readonly layer: Layer.Layer<R>
  readonly runMain: <E, A>(effect: Effect.Effect<A, E>) => void
}

/**
 * For each runtime, a lazy import of the module that exports its `platform`. Write each
 * entry as `() => import("./platform/node.ts")`: the build rewrites `.ts` to `.js` in
 * literal `import()` calls, but not in path strings.
 */
export type Imports<R> = {
  readonly [K in Runtime]: () => Promise<{ readonly platform: Platform<R> }>
}

export const detect = (): Runtime => "Bun" in globalThis ? "bun" : "Deno" in globalThis ? "deno" : "node"

/** The current runtime's platform. Only its module is imported. */
export const load = <R>(imports: Imports<R>): Effect.Effect<Platform<R>> =>
  Effect.promise(() => imports[detect()]()).pipe(Effect.map((module) => module.platform))

/**
 * Loads the current runtime's platform, then hands `main`, with the platform's layer
 * provided, over to that platform's `runMain` (signal handling, exit codes, error
 * reporting). If loading itself fails, the cause is logged and the process exits with 1.
 */
export const runMain = <R, A, E>(imports: Imports<R>, main: Effect.Effect<A, E, R>): void => {
  Effect.runFork(
    load(imports).pipe(
      Effect.flatMap((platform) => Effect.sync(() => platform.runMain(Effect.provide(main, platform.layer)))),
      Effect.tapCause((cause) =>
        Effect.andThen(Effect.logError(cause), Effect.sync(() => (globalThis.process.exitCode = 1)))
      )
    )
  )
}

/**
 * URL of the module at `path` (no extension) relative to `base`, with the extension `base`
 * itself was loaded with: `.ts` when running from source, `.js` once built. The build
 * rewrites `.ts` in `import()` specifiers, but not in plain file URLs like this one.
 */
export const moduleUrl = (path: string, base: string): URL =>
  new URL(`${path}${base.endsWith(".ts") ? ".ts" : ".js"}`, base)
