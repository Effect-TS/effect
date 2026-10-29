import { assert, describe, it } from "@effect/vitest"
import { Effect, Exit, Request, RequestResolver } from "effect"
import { AsyncLocalStorage } from "node:async_hooks"
import { setFlagsFromString } from "node:v8"
import { runInNewContext } from "node:vm"

// Kept in its own file: the batch pool is module-level, so the test relies on
// a fresh module instance to force construction of a new batch.

describe("Effect.request batch pooling", () => {
  it("does not retain the async context of a completed request", async () => {
    setFlagsFromString("--expose-gc")
    const gc = runInNewContext("gc") as () => void
    class Signaled extends Request.Class<{ signal: AbortSignal }, string> {}
    const resolver = RequestResolver.make<Signaled>((entries) =>
      Effect.sync(() => {
        for (const entry of entries) entry.completeUnsafe(Exit.succeed("done"))
      })
    )
    const storage = new AsyncLocalStorage<{ data: Array<string> }>()
    let reference!: WeakRef<object>

    await storage.run({ data: new Array(100_000).fill("example") }, async () => {
      reference = new WeakRef(storage.getStore()!)
      await Effect.runPromise(Effect.scoped(Effect.gen(function*() {
        const signal = yield* Effect.abortSignal
        return yield* Effect.request(new Signaled({ signal }), resolver)
      })))
    })

    for (let i = 0; i < 5; i++) {
      await new Promise((resolve) => setImmediate(resolve))
      gc()
    }
    assert.isUndefined(reference.deref())
  })
})
