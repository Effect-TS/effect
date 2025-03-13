/**
 * @since 1.0.0
 */
import type { DurationInput } from "effect/Duration"
import type { Effect } from "effect/Effect"
import type * as Logger from "effect/Logger"
import type { Scope } from "effect/Scope"
import type { PlatformError } from "./Error.js"
import type { FileSystem, OpenFileOptions } from "./FileSystem.js"
import * as internal from "./internal/platformLogger.js"

/**
 * Create a Logger from another string Logger that writes to the specified file.
 *
 * **Example**
 *
 * ```ts
 * import { PlatformLogger } from "@effect/platform"
 * import { NodeFileSystem, NodeRuntime } from "@effect/platform-node"
 * import { Effect, Layer, Logger } from "effect"
 *
 * const fileLogger = Logger.logfmtLogger.pipe(
 *   PlatformLogger.toFile("/tmp/log.txt")
 * )
 * const LoggerLive = Logger.replaceScoped(Logger.defaultLogger, fileLogger).pipe(
 *   Layer.provide(NodeFileSystem.layer)
 * )
 *
 * Effect.log("a").pipe(
 *   Effect.zipRight(Effect.log("b")),
 *   Effect.zipRight(Effect.log("c")),
 *   Effect.provide(LoggerLive),
 *   NodeRuntime.runMain
 * )
 * ```
 *
 * @since 1.0.0
 */
export const toFile: {
  (
    path: string,
    options?:
      | (OpenFileOptions & {
        readonly batchWindow?:
          | DurationInput
          | undefined
      })
      | undefined
  ): <Message>(
    self: Logger.Logger<Message, string>
  ) => Effect<Logger.Logger<Message, void>, PlatformError, Scope | FileSystem>
  <Message>(
    self: Logger.Logger<Message, string>,
    path: string,
    options?:
      | (OpenFileOptions & {
        readonly batchWindow?:
          | DurationInput
          | undefined
      })
      | undefined
  ): Effect<Logger.Logger<Message, void>, PlatformError, Scope | FileSystem>
} = internal.toFile
