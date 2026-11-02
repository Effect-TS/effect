import * as BunChildProcessSpawner from "@effect/platform-bun/BunChildProcessSpawner"
import * as BunFileSystem from "@effect/platform-bun/BunFileSystem"
import * as BunPath from "@effect/platform-bun/BunPath"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { ChildProcess } from "effect/process"
import * as Stream from "effect/Stream"

const layer = BunChildProcessSpawner.layer.pipe(
  Layer.provideMerge(Layer.mergeAll(BunFileSystem.layer, BunPath.layer))
)

describe.skipIf(process.platform === "win32")("BunChildProcessSpawner", () => {
  it.live("scope release completes when a backpressured stdin stream is never read", () =>
    Effect.gen(function*() {
      const chunk = new Uint8Array(64 * 1024)
      const endless = Stream.fromIterable({
        *[Symbol.iterator]() {
          while (true) yield chunk
        }
      })
      const start = Date.now()
      const handle = yield* Effect.scoped(Effect.gen(function*() {
        const handle = yield* ChildProcess.make("sleep", ["600"], { stdin: endless })
        yield* Effect.sleep("200 millis")
        return handle
      }))

      assert.isBelow(Date.now() - start, 3_000)
      assert.isFalse(yield* handle.isRunning)
    }).pipe(Effect.provide(layer)))
})
