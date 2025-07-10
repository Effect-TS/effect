import { FileSystem } from "@effect/platform"
import { NodeFileSystem, NodeRuntime } from "@effect/platform-node"
import * as ParcelWatcher from "@effect/platform-node/NodeFileSystem/ParcelWatcher"
import { Console, Effect, Layer, Stream } from "effect"

const EnvLive = NodeFileSystem.layer.pipe(Layer.provide(ParcelWatcher.layer))

Effect.gen(function*() {
  const fs = yield* FileSystem.FileSystem

  yield* fs.watch("src", { recursive: true }).pipe(
    Stream.runForEach(Console.log)
  )
}).pipe(Effect.provide(EnvLive), NodeRuntime.runMain)
