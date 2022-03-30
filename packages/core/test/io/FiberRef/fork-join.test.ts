import { identity } from "../../../src/data/Function"
import { Effect } from "../../../src/io/Effect"
import { FiberRef } from "../../../src/io/FiberRef"

const initial = "initial"
const update = "update"

describe("FiberRef", () => {
  describe("initialValue", () => {
    it("its value is inherited on join", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bind("child", ({ fiberRef }) => fiberRef.set(update).fork())
        .tap(({ child }) => child.join())
        .flatMap(({ fiberRef }) => fiberRef.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(update)
    })

    it("initial value is always available", async () => {
      const program = Effect.Do()
        .bind("child", () => FiberRef.make(initial).fork())
        .bind("fiberRef", ({ child }) => child.await().flatMap((_) => Effect.done(_)))
        .flatMap(({ fiberRef }) => fiberRef.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(initial)
    })
  })

  describe("fork", () => {
    it("fork function is applied on fork - 1", async () => {
      function increment(x: number): number {
        return x + 1
      }

      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(0, increment))
        .bind("child", () => Effect.unit.fork())
        .tap(({ child }) => child.join())
        .flatMap(({ fiberRef }) => fiberRef.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(1)
    })

    it("fork function is applied on fork - 2", async () => {
      function increment(x: number): number {
        return x + 1
      }

      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(0, increment))
        .bind("child", () =>
          Effect.unit
            .fork()
            .flatMap((fiber) => fiber.join())
            .fork()
        )
        .tap(({ child }) => child.join())
        .flatMap(({ fiberRef }) => fiberRef.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(2)
    })
  })

  describe("join", () => {
    it("join function is applied on join - 1", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(0, identity, Math.max))
        .bind("child", ({ fiberRef }) => fiberRef.update((_) => _ + 1).fork())
        .tap(({ child }) => child.join())
        .flatMap(({ fiberRef }) => fiberRef.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(1)
    })

    it("join function is applied on join - 2", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(0, identity, Math.max))
        .bind("child", ({ fiberRef }) => fiberRef.update((_) => _ + 1).fork())
        .tap(({ fiberRef }) => fiberRef.update((_) => _ + 2))
        .tap(({ child }) => child.join())
        .flatMap(({ fiberRef }) => fiberRef.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(2)
    })
  })
})
