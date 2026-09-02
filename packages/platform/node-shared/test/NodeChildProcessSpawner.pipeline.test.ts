import * as NodeChildProcessSpawner from "@effect/platform-node-shared/NodeChildProcessSpawner"
import * as NodeFileSystem from "@effect/platform-node-shared/NodeFileSystem"
import * as NodePath from "@effect/platform-node-shared/NodePath"
import { assert, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Stream from "effect/Stream"
import * as ChildProcess from "effect/unstable/process/ChildProcess"

const NodeServices = NodeChildProcessSpawner.layer.pipe(
  Layer.provideMerge(Layer.mergeAll(NodeFileSystem.layer, NodePath.layer))
)

it.live("writes pipeline stdin to the first process", () =>
  Effect.gen(function*() {
    const handle = yield* ChildProcess.make(process.execPath, [
      "-e",
      "process.stdin.on(\"data\", chunk => process.stdout.write(chunk.toString().toUpperCase()))"
    ]).pipe(ChildProcess.pipeTo(ChildProcess.make(process.execPath, [
      "-e",
      "process.stdin.pipe(process.stdout)"
    ])))

    yield* Stream.run(Stream.make(new TextEncoder().encode("hello")), handle.stdin)
    const output = yield* handle.stdout.pipe(Stream.decodeText(), Stream.mkString)
    yield* handle.kill()

    assert.strictEqual(output, "HELLO")
  }).pipe(Effect.provide(NodeServices)))
