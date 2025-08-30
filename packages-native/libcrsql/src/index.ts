/**
 * Root entrypoint: absolute path getters with zero external dependencies.
 *
 * @since 0.16.300
 */
import * as fs from "node:fs"
import { fileURLToPath } from "node:url"
import {
  buildRelativeLibraryPath,
  detectPlatform,
  isSupportedPlatform,
  SUPPORTED_PLATFORMS as _SUPPORTED_PLATFORMS
} from "./platform.js"
import { CRSQLITE_VERSION as _CRSQLITE_VERSION } from "./version.js"

import type { Platform as _Platform } from "./platform.js"

/**
 * Synchronous absolute path resolution for the cr-sqlite extension binary.
 *
 * - Returns an absolute path string that you can pass to `db.loadExtension()`.
 * - Throws native Error with `code` set to `ERR_PLATFORM_UNSUPPORTED` or
 *   `ERR_EXTENSION_NOT_FOUND`.
 *
 * @since 0.16.300
 * @example
 * import { getCrSqliteExtensionPathSync } from "@effect-native/libcrsql"
 *
 * const path = getCrSqliteExtensionPathSync()
 * console.log(path)
 */
export const getCrSqliteExtensionPathSync = (platform?: Platform): string => {
  const target = platform ?? detectPlatform()
  if (!isSupportedPlatform(target)) {
    const err: NodeJS.ErrnoException = new Error(
      `Platform "${target}" is not supported. Detected: ${process.platform}-${process.arch}. Supported: ${
        SUPPORTED_PLATFORMS.join(", ")
      }`
    )
    err.code = "ERR_PLATFORM_UNSUPPORTED"
    throw err
  }
  const abs = fileURLToPath(new URL(`../${buildRelativeLibraryPath(target)}`, import.meta.url))
  // Best-effort existence check without external deps.
  // Note: this synchronous check runs once per import/use and ensures the
  // contract of this package (absolute path to an existing native binary).
  // If needed, we can memoize this at runtime, but import memoization already
  // avoids repeated work in typical usage.
  try {
    fs.accessSync(abs)
  } catch {
    const err: NodeJS.ErrnoException = new Error(`Extension binary not found: ${abs}`)
    err.code = "ERR_EXTENSION_NOT_FOUND"
    throw err
  }
  return abs
}

/**
 * Absolute path to the cr-sqlite binary for the current platform, computed at import time.
 *
 * - Useful for the simplest use cases: just import and load.
 * - Throws on unsupported platform or if the binary is not present.
 *
 * @since 0.16.300
 * @example
 * import { pathToCrSqliteExtension } from "@effect-native/libcrsql"
 * console.log(pathToCrSqliteExtension)
 */
export const pathToCrSqliteExtension: string = getCrSqliteExtensionPathSync()

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
/**
 * Bundled upstream cr-sqlite version.
 * @since 0.16.300
 */
export const CRSQLITE_VERSION = _CRSQLITE_VERSION
