import { FileSystem } from "@effect/platform"
import { NodeFileSystem, NodeRuntime } from "@effect/platform-node"
import * as ParcelWatcher from "@effect/platform-node/NodeFileSystem/ParcelWatcher"
import { Console, Effect, Layer, Stream } from "effect"

const EnvLive = NodeFileSystem.layer.pipe(Layer.provide(ParcelWatcher.layer))

Effect.gen(function*(_) {
  const fs = yield* _(FileSystem.FileSystem)

  yield* _(
    fs.watch("src"),
    Stream.runForEach(Console.log)
  )
}).pipe(Effect.provide(EnvLive), NodeRuntime.runMain)
