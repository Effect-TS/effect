import { alwaysFail, repeat } from "@effect/core/test/io/Schedule/test-utils"

describe.concurrent("Schedule", () => {
  describe.concurrent("repeat an action a single time", () => {
    it("repeat on failure does not actually repeat", () =>
      Do(($) => {
        const ref = $(Ref.make(0))
        const result = $(
          alwaysFail(ref).foldEffect(
            Effect.succeed,
            () => Effect.succeed("it should never be a success")
          )
        )
        assert.strictEqual(result, "Error: 1")
      }).unsafeRunPromiseExit())

    it("repeat a scheduled repeat repeats the whole number", () =>
      Do(($) => {
        const n = 42
        const ref = $(Ref.make(0))
        const io = ref.update((n) => n + 1).repeat(Schedule.recurs(n))
        $(io.repeat(Schedule.recurs(1)))
        const result = $(ref.get)
        assert.strictEqual(result, (n + 1) * 2)
      }).unsafeRunPromise())
  })

  describe.concurrent("repeat an action two times and call ensuring should", () => {
    it("run the specified finalizer as soon as the schedule is complete", () =>
      Do(($) => {
        const deferred = $(Deferred.make<never, void>())
        const ref = $(Ref.make(0))
        $(
          ref
            .update((n) => n + 2)
            .repeat(Schedule.recurs(2))
            .ensuring(deferred.succeed(undefined))
        )
        const value = $(ref.get)
        const finalizerValue = $(deferred.poll)

        assert.strictEqual(value, 6)
        assert.isTrue(finalizerValue.isSome())
      }).unsafeRunPromise())
  })

  describe.concurrent("repeat on success according to a provided strategy", () => {
    it("for 'recurs(a negative number)' repeats 0 additional time", () =>
      Do(($) => {
        // A repeat with a negative number of times should not repeat the action at all
        const result = $(repeat(Schedule.recurs(-5)))
        assert.strictEqual(result, 0)
      }).unsafeRunPromise())

    it("for 'recurs(0)' does repeat 0 additional time", () =>
      Do(($) => {
        // A repeat with 0 number of times should not repeat the action at all
        const result = $(repeat(Schedule.recurs(0)))
        assert.strictEqual(result, 0)
      }).unsafeRunPromise())

    it("for 'recurs(1)' does repeat 1 additional time", () =>
      Do(($) => {
        const result = $(repeat(Schedule.recurs(1)))
        assert.strictEqual(result, 1)
      }).unsafeRunPromise())

    it("for 'once' will repeat 1 additional time", () =>
      Do(($) => {
        const ref = $(Ref.make(0))
        $(ref.update((n) => n + 1).repeat(Schedule.once))
        const result = $(ref.get)
        assert.strictEqual(result, 2)
      }).unsafeRunPromise())

    it("for 'recurs(a positive given number)' repeats that additional number of time", () =>
      Do(($) => {
        const result = $(repeat(Schedule.recurs(42)))
        assert.strictEqual(result, 42)
      }).unsafeRunPromise())

    it("for 'recurWhile(cond)' repeats while the cond still holds", () =>
      Do(($) => {
        const result = $(repeat(Schedule.recurWhile((n) => n < 10)))
        assert.strictEqual(result, 10)
      }).unsafeRunPromise())

    it("for 'recurWhileEffect(cond)' repeats while the effectful cond still holds", () =>
      Do(($) => {
        const result = $(repeat(Schedule.recurWhileEffect((n) => Effect.sync(n > 10))))
        assert.strictEqual(result, 1)
      }).unsafeRunPromise())

    it("for 'recurWhileEquals(cond)' repeats while the cond is equal", () =>
      Do(($) => {
        const result = $(repeat(Schedule.recurWhileEquals(Equivalence.number, 1 as number)))
        assert.strictEqual(result, 2)
      }).unsafeRunPromise())

    it("for 'recurUntil(cond)' repeats until the cond is satisfied", () =>
      Do(($) => {
        const result = $(repeat(Schedule.recurUntil((n) => n < 10)))
        assert.strictEqual(result, 1)
      }).unsafeRunPromise())

    it("for 'recurUntilEffect(cond)' repeats until the effectful cond is satisfied", () =>
      Do(($) => {
        const result = $(repeat(Schedule.recurUntilEffect((n) => Effect.sync(n > 10))))
        assert.strictEqual(result, 11)
      }).unsafeRunPromise())

    it("for 'recurUntilEquals(cond)' repeats until the cond is equal", () =>
      Do(($) => {
        const result = $(repeat(Schedule.recurUntilEquals(Equivalence.number, 1 as number)))
        assert.strictEqual(result, 1)
      }).unsafeRunPromise())
  })
})
