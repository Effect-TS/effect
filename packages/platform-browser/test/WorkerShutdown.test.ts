import { describe, it } from "@effect/vitest"
import { Effect } from "effect"

describe("Worker / shutdown lifecycle", () => {
  it.effect("BrowserWorker scope finalization should match Node/Bun two-phase shutdown", () =>
    Effect.gen(function*() {
      // Bug: BrowserWorker's scope finalizer only sends a close message
      // but does NOT call worker.terminate().
      //
      // Compare with NodeWorker which implements:
      //   1. Send close message to worker
      //   2. Wait for close acknowledgment with timeout
      //   3. Call thing.kill() if timeout exceeded
      //
      // See packages/platform-browser/src/BrowserWorker.ts
      // See packages/platform-node/src/NodeWorker.ts
      // See packages/platform-bun/src/BunWorker.ts
      yield* Effect.promise(() => import("@effect/platform-browser"))
      Effect.void
    }))
})
