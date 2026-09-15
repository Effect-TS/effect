import { assert, describe, it } from "@effect/vitest"
import { Cause, Channel, Effect, Exit, Fiber, Latch, Option } from "effect"

describe("Channel.onExit", () => {
  it.effect("preserves output and finalizes once per execution of the same value", () =>
    Effect.gen(function*() {
      const exits: Array<Exit.Exit<void, never>> = []
      const source = Channel.fromIterable([1, 2, 3]).pipe(
        Channel.onExit((exit) =>
          Effect.sync(() => {
            exits.push(exit)
          })
        )
      )
      const run = Channel.runCollect(source)
      assert.deepStrictEqual(yield* run, [1, 2, 3])
      assert.deepStrictEqual(exits, [Exit.void])
      assert.deepStrictEqual(yield* run, [1, 2, 3])
      assert.deepStrictEqual(exits, [Exit.void, Exit.void])
    }))

  for (
    const [name, cause] of [
      ["typed failure", Cause.fail("source")],
      ["defect", Cause.die("source")]
    ] as const
  ) {
    it.effect(`observes and preserves a source ${name} exactly once`, () =>
      Effect.gen(function*() {
        const exits: Array<Exit.Exit<void, string>> = []
        const exit = yield* Channel.failCause(cause).pipe(
          Channel.onExit((exit) =>
            Effect.sync(() => {
              exits.push(exit)
            })
          ),
          Channel.runCollect,
          Effect.exit
        )
        assert.deepStrictEqual(exits, [Exit.failCause(cause)])
        assert.deepStrictEqual(exit, Exit.failCause(cause))
      }))
  }

  for (
    const [name, finalizer] of [
      ["typed failure", Effect.fail("finalizer")],
      ["defect", Effect.die("finalizer")]
    ] as const
  ) {
    it.effect(`propagates a finalizer ${name} after success exactly once`, () =>
      Effect.gen(function*() {
        const exits: Array<Exit.Exit<void, never>> = []
        const exit = yield* Channel.succeed(1).pipe(
          Channel.onExit((exit) =>
            Effect.andThen(
              Effect.sync(() => {
                exits.push(exit)
              }),
              finalizer
            )
          ),
          Channel.runCollect,
          Effect.exit
        )
        assert.deepStrictEqual(exits, [Exit.void])
        assert.deepStrictEqual(
          exit,
          Exit.failCause(name === "typed failure" ? Cause.fail("finalizer") : Cause.die("finalizer"))
        )
      }))

    it.effect(`combines a source failure with a finalizer ${name} exactly once`, () =>
      Effect.gen(function*() {
        const exits: Array<Exit.Exit<void, string>> = []
        const exit = yield* Channel.fail("source").pipe(
          Channel.onExit((exit) =>
            Effect.andThen(
              Effect.sync(() => {
                exits.push(exit)
              }),
              finalizer
            )
          ),
          Channel.runCollect,
          Effect.exit
        )
        assert.deepStrictEqual(exits, [Exit.fail("source")])
        assert.deepStrictEqual(
          exit,
          Exit.failCause(Cause.combine(
            Cause.fail("source"),
            name === "typed failure" ? Cause.fail("finalizer") : Cause.die("finalizer")
          ))
        )
      }))
  }

  it.effect("finalizes exactly once when creating the pull fails", () =>
    Effect.gen(function*() {
      const exits: Array<Exit.Exit<void, string>> = []
      const exit = yield* Channel.unwrap(Effect.as(Effect.fail("setup"), Channel.empty)).pipe(
        Channel.onExit((exit) =>
          Effect.sync(() => {
            exits.push(exit)
          })
        ),
        Channel.runCollect,
        Effect.exit
      )
      assert.deepStrictEqual(exits, [Exit.fail("setup")])
      assert.deepStrictEqual(exit, Exit.fail("setup"))
    }))

  for (const fails of [false, true]) {
    it.effect(`finalizes an interrupted source exactly once${fails ? " with a failing finalizer" : ""}`, () =>
      Effect.gen(function*() {
        const started = yield* Latch.make()
        const exits: Array<Exit.Exit<void, never>> = []
        const fiber = yield* Channel.fromEffect(Effect.andThen(started.open, Effect.never)).pipe(
          Channel.onExit((exit) =>
            Effect.andThen(
              Effect.sync(() => {
                exits.push(exit)
              }),
              fails ? Effect.fail("finalizer") : Effect.void
            )
          ),
          Channel.runCollect,
          Effect.forkChild
        )
        yield* started.await
        yield* Fiber.interrupt(fiber)
        const exit = yield* Fiber.await(fiber)
        assert.strictEqual(exits.length, 1)
        assert.isTrue(Exit.isFailure(exits[0]) && Cause.hasInterrupts(exits[0].cause))
        assert.isTrue(Exit.isFailure(exit))
        if (Exit.isFailure(exit)) {
          assert.isTrue(Cause.hasInterrupts(exit.cause))
          // Scope cleanup has no remaining pull on which to report a typed error.
          assert.deepStrictEqual<ReadonlyArray<Cause.Reason<string>>>(
            exit.cause.reasons.filter((reason) => !Cause.isInterruptReason(reason)),
            fails ? Cause.die("finalizer").reasons : []
          )
        }
      }))

    it.effect(`finalizes early termination exactly once${fails ? " with a failing finalizer" : ""}`, () =>
      Effect.gen(function*() {
        const exits: Array<Exit.Exit<void, never>> = []
        const source = Channel.fromIterable([1, 2, 3]).pipe(
          Channel.onExit((exit) =>
            Effect.andThen(
              Effect.sync(() => {
                exits.push(exit)
              }),
              fails ? Effect.fail("finalizer") : Effect.void
            )
          )
        )
        const exit = yield* Effect.exit(Channel.runHead(source))
        assert.strictEqual(exits.length, 1)
        assert.isTrue(Exit.isSuccess(exits[0]))
        if (fails) {
          assert.deepStrictEqual(exit, Exit.die("finalizer"))
        } else {
          assert.deepStrictEqual(exit, Exit.succeed(Option.some(1)))
        }
      }))
  }

  it.effect("finishes the finalizer once when interrupted during normal completion", () =>
    Effect.gen(function*() {
      const started = yield* Latch.make()
      const release = yield* Latch.make()
      let startedCount = 0
      let completedCount = 0
      const fiber = yield* Channel.succeed(1).pipe(
        Channel.onExit(() =>
          Effect.gen(function*() {
            startedCount++
            yield* started.open
            yield* release.await
            completedCount++
          })
        ),
        Channel.runCollect,
        Effect.forkChild
      )
      yield* started.await
      fiber.interruptUnsafe()
      yield* release.open
      yield* Fiber.await(fiber)
      assert.strictEqual(startedCount, 1)
      assert.strictEqual(completedCount, 1)
    }))

  it.effect("passes the channel done value to the finalizer and downstream", () =>
    Effect.gen(function*() {
      const exits: Array<Exit.Exit<number, never>> = []
      const result = yield* Channel.end(42).pipe(
        Channel.onExit((exit) =>
          Effect.sync(() => {
            exits.push(exit)
          })
        ),
        Channel.runDrain
      )
      assert.strictEqual(result, 42)
      assert.deepStrictEqual(exits, [Exit.succeed(42)])
    }))
})
