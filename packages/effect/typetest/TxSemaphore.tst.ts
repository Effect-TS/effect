import { type Effect, TxSemaphore } from "effect"
import { describe, expect, it } from "tstyche"

declare const semaphore: TxSemaphore.TxSemaphore

describe("TxSemaphore", () => {
  it("data-last operations", () => {
    expect(TxSemaphore.acquireN(2)(semaphore)).type.toBe<Effect.Effect<void>>()
    expect(TxSemaphore.tryAcquireN(2)(semaphore)).type.toBe<Effect.Effect<boolean>>()
    expect(TxSemaphore.releaseN(2)(semaphore)).type.toBe<Effect.Effect<void>>()
  })
})
