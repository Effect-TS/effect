/**
 * @since 1.0.0
 */
import type { Effect } from "effect/Effect"
import type * as Logger from "effect/Logger"
import type { Scope } from "effect/Scope"
import type { PlatformError } from "./Error.js"
import type { FileSystem, OpenFileOptions } from "./FileSystem.js"
import * as internal from "./internal/platformLogger.js"

/**
 * Create a Logger from another string Logger that writes to the specified file.
 *
 * @since 1.0.0
 */
export const toFile: {
  (
    path: string,
    option?: OpenFileOptions | undefined
  ): <Message>(
    self: Logger.Logger<Message, string>
  ) => Effect<Logger.Logger<Message, void>, PlatformError, Scope | FileSystem>
  <Message>(
    self: Logger.Logger<Message, string>,
    path: string,
    options?: OpenFileOptions | undefined
  ): Effect<Logger.Logger<Message, void>, PlatformError, Scope | FileSystem>
} = internal.toFile
