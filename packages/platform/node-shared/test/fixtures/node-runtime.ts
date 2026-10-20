import * as NodeRuntime from "@effect/platform-node-shared/NodeRuntime"
import * as Effect from "effect/Effect"
import { readSync, writeSync } from "node:fs"

NodeRuntime.runMain(Effect.scoped(Effect.gen(function*() {
  yield* Effect.addFinalizer(() =>
    Effect.sync(() => {
      writeSync(1, "finalizer ran\n")
    })
  )
  if (process.argv[2] === "yield-first") {
    yield* Effect.yieldNow
  }
  writeSync(1, "ready\n")
  readSync(0, new Uint8Array(1), 0, 1, null)
  return yield* Effect.never
})))
