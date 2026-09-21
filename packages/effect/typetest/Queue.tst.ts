import { type Cause, type Effect, Queue } from "effect"
import { describe, expect, it } from "tstyche"

interface TestError {
  readonly _tag: "TestError"
}

declare const enqueue: Queue.Enqueue<number, TestError>
declare const dequeue: Queue.Dequeue<number, TestError>
declare const error: TestError
declare const cause: Cause.Cause<TestError>

describe("Queue", () => {
  it("data-last operations", () => {
    expect(Queue.offer(1)(enqueue)).type.toBe<Effect.Effect<boolean>>()
    expect(Queue.offerUnsafe(1)(enqueue)).type.toBe<boolean>()
    expect(Queue.offerAll([1, 2, 3])(enqueue)).type.toBe<Effect.Effect<Array<number>>>()
    expect(Queue.offerAllUnsafe([1, 2, 3])(enqueue)).type.toBe<Array<number>>()
    expect(Queue.fail(error)(enqueue)).type.toBe<Effect.Effect<boolean>>()
    expect(Queue.failCauseUnsafe(cause)(enqueue)).type.toBe<boolean>()
    expect(Queue.takeN(2)(dequeue)).type.toBe<Effect.Effect<Array<number>, TestError>>()
    expect(Queue.takeBetween(1, 2)(dequeue)).type.toBe<Effect.Effect<Array<number>, TestError>>()
  })
})
