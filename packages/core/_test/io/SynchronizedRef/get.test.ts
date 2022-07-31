import { State } from "@effect/core/test/io/SynchronizedRef/test-utils"

const current = "value"
const update = "new value"
const failure = "failure"

describe.concurrent("SynchronizedRef", () => {
  describe.concurrent("simple", () => {
    it("get", () =>
      Do(($) => {
        const result = $(Ref.Synchronized.make(current).flatMap((ref) => ref.get()))
        assert.strictEqual(result, current)
      }).unsafeRunPromise())
  })

  describe.concurrent("getAndUpdateEffect", () => {
    it("happy path", () =>
      Do(($) => {
        const ref = $(Ref.Synchronized.make(current))
        const v1 = $(ref.getAndUpdateEffect(() => Effect.succeed(update)))
        const v2 = $(ref.get())
        assert.strictEqual(v1, current)
        assert.strictEqual(v2, update)
      }).unsafeRunPromise())

    it("with failure", () =>
      Do(($) => {
        const ref = $(Ref.Synchronized.make(current))
        const result = $(ref.getAndUpdateEffect(() => Effect.fail(failure)).exit)
        assert.isTrue(result == Exit.fail(failure))
      }).unsafeRunPromiseExit())
  })

  describe.concurrent("getAndUpdateSomeEffect", () => {
    it("happy path", () =>
      Do(($) => {
        const ref = $(Ref.Synchronized.make<State>(State.Active))
        const v1 = $(
          ref.getAndUpdateSomeEffect((state) =>
            state.isClosed() ?
              Maybe.some(Effect.succeed(State.Changed)) :
              Maybe.none
          )
        )
        const v2 = $(ref.get())
        assert.deepEqual(v1, State.Active)
        assert.deepEqual(v2, State.Active)
      }).unsafeRunPromise())

    it("twice", () =>
      Do(($) => {
        const ref = $(Ref.Synchronized.make<State>(State.Active))
        const v1 = $(
          ref.getAndUpdateSomeEffect((state) =>
            state.isActive() ?
              Maybe.some(Effect.sync(State.Changed)) :
              Maybe.none
          )
        )
        const v2 = $(
          ref.getAndUpdateSomeEffect((state) =>
            state.isClosed()
              ? Maybe.some(Effect.sync(State.Active))
              : state.isChanged()
              ? Maybe.some(Effect.sync(State.Closed))
              : Maybe.none
          )
        )
        const v3 = $(ref.get())
        assert.deepEqual(v1, State.Active)
        assert.deepEqual(v2, State.Changed)
        assert.deepEqual(v3, State.Closed)
      }).unsafeRunPromise())

    it("with failure", () =>
      Do(($) => {
        const ref = $(Ref.Synchronized.make<State>(State.Active))
        const result = $(
          ref.getAndUpdateSomeEffect((state) =>
            state.isActive() ?
              Maybe.some(Effect.failSync(failure)) :
              Maybe.none
          ).exit
        )
        assert.isTrue(result == Exit.fail(failure))
      }).unsafeRunPromiseExit())

    it("interrupt parent fiber and update", () =>
      Do(($) => {
        const deferred = $(Deferred.make<never, Ref.Synchronized<State>>())
        const latch = $(Deferred.make<never, void>())
        const makeAndWait = deferred
          .complete(Ref.Synchronized.make<State>(State.Active))
          .zipRight(latch.await)
        const fiber = $(makeAndWait.fork)
        const ref = $(deferred.await)
        $(fiber.interrupt)
        const result = $(ref.updateAndGetEffect(() => Effect.succeed(State.Closed)))
        assert.deepEqual(result, State.Closed)
      }).unsafeRunPromise())
  })
})
