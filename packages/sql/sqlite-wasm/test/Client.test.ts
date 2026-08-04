import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import { vi } from "vitest"

const state = vi.hoisted(() => ({ vfsCloseCalls: 0 }))

vi.mock("@effect/wa-sqlite/dist/wa-sqlite.mjs", () => ({ default: async () => ({}) }))
vi.mock("@effect/wa-sqlite/src/examples/AccessHandlePoolVFS.js", () => ({
  AccessHandlePoolVFS: {
    create: async () => ({
      close: async () => {
        state.vfsCloseCalls++
      }
    })
  }
}))
vi.mock("@effect/wa-sqlite", () => ({
  Factory: () => ({
    close() {},
    open_v2: () => 1,
    vfs_register() {}
  })
}))

import { OpfsWorker } from "@effect/sql-sqlite-wasm"

class FakePort extends EventTarget {
  close() {}

  postMessage(message: ReadonlyArray<unknown>): void {
    if (message[0] === "ready") {
      queueMicrotask(() => this.dispatchEvent(new MessageEvent("message", { data: ["close"] })))
    }
  }
}

describe("Client", () => {
  it.effect("should work", () => Effect.void)

  it.effect("closes the OPFS VFS when the worker loop closes", () =>
    Effect.gen(function*() {
      yield* OpfsWorker.run({ port: new FakePort(), dbName: "test.db" })
      assert.strictEqual(state.vfsCloseCalls, 1)
    }))
})
