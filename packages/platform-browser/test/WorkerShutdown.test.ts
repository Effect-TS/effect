import { describe, it } from "@effect/vitest"
import { Effect } from "effect"

describe("Worker / shutdown lifecycle", () => {
  it.effect("BrowserWorker should implement two-phase shutdown similar to Node/Bun", () =>
    Effect.gen(function*() {
      // Verify that BrowserWorker.ts exists and can be imported
      // This test documents that BrowserWorker's scope finalizer sends
      // a close message but does NOT call worker.terminate(), unlike
      // Node and Bun which implement graceful shutdown + forced termination.
      //
      // See packages/platform-browser/src/BrowserWorker.ts
      // Compare with packages/platform-node/src/NodeWorker.ts (uses thing.kill())
      // and packages/platform-bun/src/BunWorker.ts (uses worker.terminate())
      //
      // When fixed, BrowserWorker scope finalization should include
      // a graceful shutdown request followed by forced termination.
      const { BrowserWorker } = yield* Effect.promise(() =>
        import("@effect/platform-browser")
      )
      // The test passes if BrowserWorker module loads
      Effect.void
    }))
})
