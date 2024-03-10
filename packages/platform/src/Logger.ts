/**
 * @since 1.0.0
 */
import type { Effect } from "effect/Effect"
import type * as Logger from "effect/Logger"
import type { Scope } from "effect/Scope"
import type { PlatformError } from "./Error.js"
import type { FileSystem, OpenFileOptions } from "./FileSystem.js"
import * as internal from "./internal/logger.js"

/**
 * Creates a Logger that writes to the specified file.
 *
 * @since 1.0.0
 */
export const fileSystemLogger: (options: {
  path: string
  fileOptions?: OpenFileOptions
  format?: (_: Logger.Logger.Options<unknown>) => string
}) => Effect<Logger.Logger<unknown, void>, PlatformError, FileSystem | Scope> = internal.fileSystemLogger
