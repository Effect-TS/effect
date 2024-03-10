/**
 * @since 1.0.0
 */
import * as Effect from "effect/Effect"
import { dual } from "effect/Function"
import * as Logger from "effect/Logger"
import * as Predicate from "effect/Predicate"
import * as Queue from "effect/Queue"
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
      const queue = yield* _(Queue.unbounded<string>())
      const encoder = new TextEncoder()

      yield* _(
        queue.take,
        Effect.flatMap((message) => logFile.write(encoder.encode(message + "\n"))),
        Effect.forever,
        Effect.forkScoped
      )

      return Logger.make((options) => {
        Queue.unsafeOffer(queue, self.log(options))
      })
    })
)
