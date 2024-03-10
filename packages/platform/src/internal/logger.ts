/**
 * @since 1.0.0
 */
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import * as Logger from "effect/Logger"
import * as Queue from "effect/Queue"
import * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import type { OpenFileOptions } from "../FileSystem.js"
import * as FileSystem from "./fileSystem.js"

/** @internal */
export const fileSystemLogger = (options: {
  path: string
  fileOptions?: OpenFileOptions
  format?: (_: Logger.Logger.Options<unknown>) => string
}) =>
  Effect.gen(function*(_) {
    const fs = yield* _(FileSystem.tag)
    const logFile = yield* _(fs.open(options.path, options.fileOptions))
    const scope = yield* _(Scope.Scope)
    const queue = yield* _(Queue.unbounded<string>())

    yield* _(
      Effect.forkIn(
        Stream.runForEachChunk(Stream.fromQueue(queue), (chunk) =>
          logFile.write(
            new TextEncoder().encode(Chunk.join(chunk, "\n") + "\n")
          )),
        scope
      )
    )

    yield* _(Effect.yieldNow())

    return Logger.make((o) => {
      const formatted = (options.format || Logger.stringLogger.log)(o)
      Queue.unsafeOffer(queue, formatted)
    })
  })
