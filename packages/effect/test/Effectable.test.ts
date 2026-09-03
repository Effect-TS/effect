import { assert, describe, it } from "@effect/vitest"
import { Context, Effect, Effectable, Exit, Fiber } from "effect"

// A single immediate snapshot of finite programs, not a polling window. Always
// interrupt and await even when the assertion in the caller will fail.
const snapshot = async <A, E>(effect: Effect.Effect<A, E>) => {
  const fiber = Effect.runFork(effect)
  let sampled: Exit.Exit<A, E> | undefined
  try {
    sampled = fiber.pollUnsafe()
    return sampled
  } finally {
    fiber.interruptUnsafe()
    const terminal = await Effect.runPromise(Fiber.await(fiber))
    assert.isDefined(fiber.pollUnsafe())
    if (sampled === undefined) assert.isTrue(Exit.hasInterrupts(terminal))
    else assert.strictEqual(terminal, sampled)
  }
}

class Answer extends Effectable.Class<number> {
  readonly override = Effect.succeed(42)
}

class Failed extends Effectable.Class<never, string> {
  readonly override = Effect.fail("expected")
}

class AnswerService extends Context.Service<AnswerService, { readonly answer: number }>()("r5/AnswerService") {}

class ServiceAnswer extends Effectable.Class<number, never, AnswerService> {
  readonly override = Effect.map(AnswerService, (service) => service.answer)
}

describe("Effectable.Class R5", () => {
  it("E01 finite success delegates to override", async () => {
    const answer: Effect.Effect<number> = new Answer()
    assert.deepEqual(await snapshot(answer), Exit.succeed(42))
  })

  it("E02 finite typed failure delegates to override", async () => {
    const failed: Effect.Effect<never, string> = new Failed()
    assert.deepEqual(await snapshot(failed), Exit.fail("expected"))
  })

  it("E03 Effect.gen yields the class success", async () => {
    const program = Effect.gen(function*() {
      return (yield* new Answer()) + 1
    })
    assert.deepEqual(await snapshot(program), Exit.succeed(43))
  })

  it("E04 Effect.gen yields the class failure", async () => {
    const program = Effect.gen(function*() {
      return yield* new Failed()
    })
    assert.deepEqual(await snapshot(program), Exit.fail("expected"))
  })

  it("E05 getter stays lazy and reads this on every run", async () => {
    class GetterAnswer extends Effectable.Class<number> {
      reads = 0
      answer = 42
      get override() {
        this.reads++
        return Effect.succeed(this.answer)
      }
    }
    const answer = new GetterAnswer()
    assert.strictEqual(answer.reads, 0)
    const first = await snapshot(answer)
    const readsAfterFirst = answer.reads
    answer.answer = 43
    const second = await snapshot(answer)
    assert.strictEqual(readsAfterFirst, 1)
    assert.strictEqual(answer.reads, 2)
    assert.deepEqual(first, Exit.succeed(42))
    assert.deepEqual(second, Exit.succeed(43))
  })

  it("E06 field override executes repeatedly with the subclass receiver", async () => {
    class Counter extends Effectable.Class<number> {
      value = 41
      readonly override = Effect.sync(() => ++this.value)
    }
    const counter = new Counter()
    const first = await snapshot(counter)
    const second = await snapshot(counter)
    assert.deepEqual(first, Exit.succeed(42))
    assert.deepEqual(second, Exit.succeed(43))
    assert.strictEqual(counter.value, 43)
  })

  it("E07 delegates with the provided service on each run", async () => {
    const answer: Effect.Effect<number, never, AnswerService> = new ServiceAnswer()
    const first = await snapshot(Effect.provideService(answer, AnswerService, { answer: 42 }))
    const second = await snapshot(Effect.provideService(answer, AnswerService, { answer: 43 }))
    assert.deepEqual(first, Exit.succeed(42))
    assert.deepEqual(second, Exit.succeed(43))
  })

  it("EC01 direct finite overrides finish", async () => {
    assert.deepEqual(await snapshot(new Answer().override), Exit.succeed(42))
    assert.deepEqual(await snapshot(new Failed().override), Exit.fail("expected"))
  })

  it("EC02 direct service override finishes", async () => {
    const direct = Effect.provideService(new ServiceAnswer().override, AnswerService, { answer: 42 })
    assert.deepEqual(await snapshot(direct), Exit.succeed(42))
  })

  it("EC03 finite Prototype evaluator preserves its receiver and API", async () => {
    const prototype = Object.assign(
      Effectable.Prototype<Effect.Effect<number> & { answer: number }>({
        label: "R5PrototypeControl",
        evaluate() {
          return Effect.succeed(this.answer)
        }
      }),
      { answer: 42 }
    )
    assert.deepEqual(await snapshot(prototype), Exit.succeed(42))
    prototype.answer = 43
    assert.deepEqual(await snapshot(prototype), Exit.succeed(43))
  })
})
