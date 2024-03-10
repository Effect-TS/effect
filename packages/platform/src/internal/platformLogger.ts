/**
 * @since 1.0.0
 */
import * as Effect from "effect/Effect"
import * as FiberSet from "effect/FiberSet"
import { dual } from "effect/Function"
import * as Logger from "effect/Logger"
import * as Predicate from "effect/Predicate"
import type * as Scope from "effect/Scope"
import type { PlatformError } from "../Error.js"
import * as FileSystem from "../FileSystem.js"

/** @internal */
export const toFile = dual<
  (
    path: string,
    option?: FileSystem.OpenFileOptions
  ) => <Message>(
    self: Logger.Logger<Message, string>
  ) => Effect.Effect<Logger.Logger<Message, void>, PlatformError, Scope.Scope | FileSystem.FileSystem>,
  <Message>(
    self: Logger.Logger<Message, string>,
    path: string,
    options?: FileSystem.OpenFileOptions
  ) => Effect.Effect<Logger.Logger<Message, void>, PlatformError, Scope.Scope | FileSystem.FileSystem>
>(
  (args) => Predicate.hasProperty(args[0], Logger.LoggerTypeId),
  (self, path, options) =>
    Effect.gen(function*(_) {
      const fs = yield* _(FileSystem.FileSystem)
      const logFile = yield* _(fs.open(path, options))
      const encoder = new TextEncoder()
      const run = yield* _(FiberSet.makeRuntime<never>())

      return Logger.make((options) => {
        run(Effect.uninterruptible(logFile.write(encoder.encode(self.log(options) + "\n"))))
      })
    })
)
