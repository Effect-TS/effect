/**
 * Effect entrypoint: idiomatic Effect API for resolving the libsqlite3 path.
 * @since 0.0.0
 */
import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { getLibSqlitePathSync } from "./index.js"

/** @since 0.0.0 */
export class PlatformNotSupportedError extends Data.TaggedError("PlatformNotSupportedError")<{
  readonly platform: string
  readonly help: string
}> {}

/** @since 0.0.0 */
export interface LibSqliteService {
  readonly path: string
}

/** @since 0.0.0 */
export const LibSqlite = Context.GenericTag<LibSqliteService>("effect-native/LibSqlite")

/**
 * Live Layer providing the resolved path.
 * @since 0.0.0
 */
export const LibSqliteLive = Layer.sync(LibSqlite, () => ({ path: getLibSqlitePathSync() }))

/**
 * Effectful accessor to the path, mapping unsupported platforms into a typed error.
 * @since 0.0.0
 * @example
 * import { getLibSqlitePath } from "@effect-native/libsqlite/effect"
 * import * as Effect from "effect/Effect"
 * const program = Effect.gen(function* () {
 *   const p = yield* getLibSqlitePath
 *   return p
 * })
 */
export const getLibSqlitePath: Effect.Effect<string, PlatformNotSupportedError> = Effect.try({
  try: () => getLibSqlitePathSync(),
  catch: () =>
    new PlatformNotSupportedError({
      platform: `${process.platform}-${process.arch}`,
      help: [
        "Unsupported platform detected.",
        "Supported: darwin-aarch64, darwin-x86_64, linux-x86_64 (glibc), linux-aarch64 (glibc).",
        "If you'd like support for this platform, please open an issue and we'll prioritize it."
      ].join(" ")
    })
})
