import { assert, describe, it } from "@effect/vitest"
import { Cause, Effect, Exit, Fiber, Latch, Stream } from "effect"

describe("Stream.onExit", () => {
  it.effect("preserves output and finalizes once per execution of the same value", () =>
    Effect.gen(function*() {
      const exits: Array<Exit.Exit<void, never>> = []
      const source = Stream.fromIterable([1, 2, 3]).pipe(
        Stream.onExit((exit) =>
          Effect.sync(() => {
            exits.push(exit)
          })
        )
      )
      const run = Stream.runCollect(source)
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
        const exit = yield* Stream.failCause(cause).pipe(
          Stream.onExit((exit) =>
            Effect.sync(() => {
              exits.push(exit)
            })
          ),
          Stream.runCollect,
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
        const exit = yield* Stream.succeed(1).pipe(
          Stream.onExit((exit) =>
            Effect.andThen(
              Effect.sync(() => {
                exits.push(exit)
              }),
              finalizer
            )
          ),
          Stream.runCollect,
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
        const exit = yield* Stream.fail("source").pipe(
          Stream.onExit((exit) =>
            Effect.andThen(
              Effect.sync(() => {
                exits.push(exit)
              }),
              finalizer
            )
          ),
          Stream.runCollect,
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
      const exit = yield* Stream.unwrap(Effect.as(Effect.fail("setup"), Stream.empty)).pipe(
        Stream.onExit((exit) =>
          Effect.sync(() => {
            exits.push(exit)
          })
        ),
        Stream.runCollect,
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
        const fiber = yield* Stream.fromEffect(Effect.andThen(started.open, Effect.never)).pipe(
          Stream.onExit((exit) =>
            Effect.andThen(
              Effect.sync(() => {
                exits.push(exit)
              }),
              fails ? Effect.fail("finalizer") : Effect.void
            )
          ),
          Stream.runCollect,
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
        const source = Stream.fromIterable([1, 2, 3]).pipe(
          Stream.onExit((exit) =>
            Effect.andThen(
              Effect.sync(() => {
                exits.push(exit)
              }),
              fails ? Effect.fail("finalizer") : Effect.void
            )
          )
        )
        const exit = yield* Effect.exit(source.pipe(Stream.take(1), Stream.runCollect))
        assert.strictEqual(exits.length, 1)
        assert.isTrue(Exit.isSuccess(exits[0]))
        if (fails) {
          assert.deepStrictEqual(exit, Exit.die("finalizer"))
        } else {
          assert.deepStrictEqual(exit, Exit.succeed([1]))
        }
      }))
  }

  it.effect("finishes the finalizer once when interrupted during normal completion", () =>
    Effect.gen(function*() {
      const started = yield* Latch.make()
      const release = yield* Latch.make()
      let startedCount = 0
      let completedCount = 0
      const fiber = yield* Stream.succeed(1).pipe(
        Stream.onExit(() =>
          Effect.gen(function*() {
            startedCount++
            yield* started.open
            yield* release.await
            completedCount++
          })
        ),
        Stream.runCollect,
        Effect.forkChild
      )
      yield* started.await
      fiber.interruptUnsafe()
      yield* release.open
      yield* Fiber.await(fiber)
      assert.strictEqual(startedCount, 1)
      assert.strictEqual(completedCount, 1)
    }))
})
