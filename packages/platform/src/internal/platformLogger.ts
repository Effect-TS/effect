/**
 * @since 1.0.0
 */
import * as Chunk from "effect/Chunk"
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
      const write = (_: string) => logFile.write(encoder.encode(_))

      yield* _(
        queue.take,
        Effect.flatMap((message) => write(message + "\n")),
        Effect.forever,
        Effect.forkScoped
      )

      yield* _(Effect.addFinalizer(() =>
        Effect.flatMap(
          queue.takeAll,
          (chunk) =>
            chunk.length > 0
              ? Effect.ignoreLogged(write(Chunk.join(chunk, "\n") + "\n"))
              : Effect.unit
        )
      ))

      return Logger.make((options) => {
        Queue.unsafeOffer(queue, self.log(options))
      })
    })
)
