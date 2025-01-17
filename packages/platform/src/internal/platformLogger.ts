/**
 * @since 1.0.0
 */
import type { DurationInput } from "effect/Duration"
import * as Effect from "effect/Effect"
import { dual } from "effect/Function"
import * as Logger from "effect/Logger"
import type * as Scope from "effect/Scope"
import type { PlatformError } from "../Error.js"
import * as FileSystem from "../FileSystem.js"

/** @internal */
export const toFile = dual<
  (
    path: string,
    options?:
      | FileSystem.OpenFileOptions & {
        readonly batchWindow?: DurationInput | undefined
      }
      | undefined
  ) => <Message>(
    self: Logger.Logger<Message, string>
  ) => Effect.Effect<Logger.Logger<Message, void>, PlatformError, Scope.Scope | FileSystem.FileSystem>,
  <Message>(
    self: Logger.Logger<Message, string>,
    path: string,
    options?:
      | FileSystem.OpenFileOptions & {
        readonly batchWindow?: DurationInput | undefined
      }
      | undefined
  ) => Effect.Effect<Logger.Logger<Message, void>, PlatformError, Scope.Scope | FileSystem.FileSystem>
>(
  (args) => Logger.isLogger(args[0]),
  (self, path, options) =>
    Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      const logFile = yield* fs.open(path, { flag: "a+", ...options })
      const encoder = new TextEncoder()
      return yield* Logger.batched(
        self,
        options?.batchWindow ?? 1000,
        (output) => Effect.ignore(logFile.write(encoder.encode(output.join("\n") + "\n")))
      )
    })
)
