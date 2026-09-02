import * as NodeChildProcessSpawner from "@effect/platform-node-shared/NodeChildProcessSpawner"
import * as NodeFileSystem from "@effect/platform-node-shared/NodeFileSystem"
import * as NodePath from "@effect/platform-node-shared/NodePath"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Stream } from "effect"
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process"

const services = NodeChildProcessSpawner.layer.pipe(
  Layer.provide(Layer.mergeAll(NodeFileSystem.layer, NodePath.layer))
)

describe("pipeline stdin", () => {
  for (const mode of ["standalone handle", "pipeline configured", "pipeline handle"] as const) {
    it.live(mode, () =>
      Effect.gen(function*() {
        const input = Stream.make(new TextEncoder().encode("hello"))
        const root = ChildProcess.make(process.execPath, [
          "-e",
          "process.stdin.on(\"data\", chunk => process.stdout.write(chunk.toString().toUpperCase()));" +
          "process.stderr.write(String(process.pid));"
        ], { stdin: mode === "pipeline configured" ? input : "pipe" })
        const command = mode === "standalone handle" ? root : root.pipe(
          ChildProcess.pipeTo(ChildProcess.make(process.execPath, [
            "-e",
            "process.stdin.pipe(process.stdout); process.stderr.write(String(process.pid));"
          ]))
        )
        const handle = yield* command
        if (mode !== "pipeline configured") {
          yield* Stream.run(input, handle.stdin)
        }
        const output = yield* handle.stdout.pipe(Stream.decodeText(), Stream.mkString)
        const stderr = yield* handle.stderr.pipe(Stream.decodeText(), Stream.mkString)
        const exitCode = yield* handle.exitCode

        assert.strictEqual(exitCode, ChildProcessSpawner.ExitCode(0))
        assert.strictEqual(yield* handle.isRunning, false)
        assert.strictEqual(stderr, String(handle.pid))
        // The pipeline's input belongs to the root, while output and metadata belong to the tail.
        assert.strictEqual(output, "HELLO")
      }).pipe(Effect.provide(services)))
  }
})
