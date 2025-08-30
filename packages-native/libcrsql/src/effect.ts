/**
 * Effect entrypoint: idiomatic Effect API with TaggedError failures.
 *
 * @since 0.16.300
 */
import { Brand, Data, Effect } from "effect"
import * as fs from "node:fs"
import { fileURLToPath } from "node:url"
import {
  buildRelativeLibraryPath,
  detectPlatform,
  isSupportedPlatform,
  SUPPORTED_PLATFORMS as _SUPPORTED_PLATFORMS
} from "./platform.js"
import type { Platform as _Platform } from "./platform.js"

/**
 * Error indicating that a platform-arch combination is not supported.
 * @since 0.16.300
 */
export class PlatformNotSupportedError extends Data.TaggedError("PlatformNotSupportedError")<{
  readonly platform: string
  readonly supportedPlatforms: ReadonlyArray<string>
  readonly detectedArch: string
  readonly detectedPlatform: string
}> {
  /**
   * @since 0.16.300
   */
  get message() {
    return `Platform "${this.platform}" is not supported. Detected: ${this.detectedPlatform}-${this.detectedArch}. Supported: ${
      this.supportedPlatforms.join(", ")
    }`
  }
}

/**
 * Error indicating that the resolved binary path does not exist.
 * @since 0.16.300
 */
export class ExtensionNotFoundError extends Data.TaggedError("ExtensionNotFoundError")<{
  readonly path: string
  readonly platform: string
}> {}

/**
 * Branded absolute path to the cr-sqlite binary.
 * @since 0.16.300
 */
export type ExtensionPath = string & Brand.Brand<"ExtensionPath">
/**
 * Brand constructor for `ExtensionPath`.
 * @since 0.16.300
 */
export const ExtensionPath = Brand.nominal<ExtensionPath>()

// Uses a best-effort Node fs sync check without depending on @effect/platform.
/**
 * Effect-based absolute path resolution with idiomatic TaggedError failures.
 *
 * - Succeeds with a branded `ExtensionPath` string.
 * - Fails with `PlatformNotSupportedError` or `ExtensionNotFoundError`.
 *
 * @since 0.16.300
 * @example
 * import { getCrSqliteExtensionPath } from "@effect-native/libcrsql/effect"
 * import { Effect } from "effect"
 *
 * const program = getCrSqliteExtensionPath()
 * Effect.runPromise(program)
 */
export const getCrSqliteExtensionPath = (
  platform?: Platform
): Effect.Effect<ExtensionPath, PlatformNotSupportedError | ExtensionNotFoundError> =>
  Effect.gen(function*() {
    const target = platform ?? detectPlatform()
    if (!isSupportedPlatform(target)) {
      return yield* Effect.fail(
        new PlatformNotSupportedError({
          platform: target,
          supportedPlatforms: SUPPORTED_PLATFORMS,
          detectedArch: process.arch,
          detectedPlatform: process.platform
        })
      )
    }
    const abs = fileURLToPath(new URL(`../${buildRelativeLibraryPath(target)}`, import.meta.url))

    const exists = yield* Effect.sync(() => {
      try {
        // Synchronous check is acceptable here since this path is computed
        // infrequently and typically only once per process.
        fs.accessSync(abs)
        return true
      } catch {
        return false
      }
    })

    if (!exists) {
      return yield* Effect.fail(new ExtensionNotFoundError({ path: abs, platform: target }))
    }

    return ExtensionPath(abs)
  })

/**
 * Supported platform-arch identifiers.
 * @since 0.16.300
 */
export type Platform = _Platform

/**
 * List of supported platforms.
 * @since 0.16.300
 */
export const SUPPORTED_PLATFORMS = _SUPPORTED_PLATFORMS
