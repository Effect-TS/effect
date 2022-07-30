const initial = "initial"
const update = "update"

function increment(x: number): number {
  return x + 1
}

describe.concurrent("FiberRef", () => {
  describe.concurrent("initialValue", () => {
    it("its value is inherited on join", () =>
      Do(($) => {
        const fiberRef = $(FiberRef.make(initial))
        const child = $(fiberRef.set(update).fork)
        $(child.join)
        const result = $(fiberRef.get)
        assert.strictEqual(result, update)
      }).scoped.unsafeRunPromise())

    it("initial value is always available", () =>
      Do(($) => {
        const child = $(FiberRef.make(initial).fork)
        const fiberRef = $(child.await.flatMap((exit) => Effect.done(exit)))
        const result = $(fiberRef.get)
        assert.strictEqual(result, initial)
      }).scoped.unsafeRunPromise())
  })

  describe.concurrent("fork", () => {
    it("fork function is applied on fork - 1", () =>
      Do(($) => {
        const fiberRef = $(FiberRef.make(0, increment))
        const child = $(Effect.unit.fork)
        $(child.join)
        const result = $(fiberRef.get)
        assert.strictEqual(result, 1)
      }).scoped.unsafeRunPromise())

    it("fork function is applied on fork - 2", () =>
      Do(($) => {
        const fiberRef = $(FiberRef.make(0, increment))
        const child = $(Effect.unit.fork.flatMap((fiber) => fiber.join).fork)
        $(child.join)
        const result = $(fiberRef.get)
        assert.strictEqual(result, 2)
      }).scoped.unsafeRunPromise())
  })

  describe.concurrent("join", () => {
    it("join function is applied on join - 1", () =>
      Do(($) => {
        const fiberRef = $(FiberRef.make(0, identity, Math.max))
        const child = $(fiberRef.update(increment).fork)
        $(child.join)
        const result = $(fiberRef.get)
        assert.strictEqual(result, 1)
      }).scoped.unsafeRunPromise())

    it("join function is applied on join - 2", () =>
      Do(($) => {
        const fiberRef = $(FiberRef.make(0, identity, Math.max))
        const child = $(fiberRef.update(increment).fork)
        $(fiberRef.update((n) => n + 2))
        $(child.join)
        const result = $(fiberRef.get)
        assert.strictEqual(result, 2)
      }).scoped.unsafeRunPromise())
  })
})
