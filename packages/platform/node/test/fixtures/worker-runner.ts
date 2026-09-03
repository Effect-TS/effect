import * as NodeWorkerRunner from "@effect/platform-node/NodeWorkerRunner"
import * as Effect from "effect/Effect"
import * as WorkerRunner from "effect/unstable/workers/WorkerRunner"
import * as assert from "node:assert/strict"
import { parentPort } from "node:worker_threads"

export interface Request {
  readonly kind: "object" | "transfer"
  readonly mode: "safe" | "unsafe"
}

const port = parentPort ?? process
const events = ["message", "messageerror", "error"] as const
const before = events.map((event) => port.listenerCount(event))
const object = { value: 42, nested: ["node", 7] }

await Effect.runPromise(
  Effect.gen(function*() {
    const platform = yield* WorkerRunner.WorkerRunnerPlatform
    const runner = yield* platform.start<unknown, Request>()
    yield* runner.run((portId, request) =>
      Effect.gen(function*() {
        if (request.kind === "object") {
          if (request.mode === "safe") {
            yield* runner.send(portId, object)
          } else {
            runner.sendUnsafe(portId, object)
          }
          return
        }

        // Each request owns a fresh buffer, including the unsafe comparison.
        const bytes = new Uint8Array([7, 8, 9])
        if (request.mode === "safe") {
          yield* runner.send(portId, { bytes }, [bytes.buffer])
        } else {
          runner.sendUnsafe(portId, { bytes }, [bytes.buffer])
        }
        yield* runner.send(portId, { byteLength: bytes.buffer.byteLength })
      })
    )
  }).pipe(Effect.provide(NodeWorkerRunner.layer))
)

// A normal parent-side scope close must preserve the runner's listener cleanup.
assert.deepStrictEqual(events.map((event) => port.listenerCount(event)), before)
