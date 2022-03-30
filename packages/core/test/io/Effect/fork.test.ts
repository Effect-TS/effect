import { List } from "../../../src/collection/immutable/List"
import { Either } from "../../../src/data/Either"
import { constTrue } from "../../../src/data/Function"
import { Option } from "../../../src/data/Option"
import { Effect } from "../../../src/io/Effect"
import { Promise } from "../../../src/io/Promise"

describe("Effect", () => {
  describe("fork", () => {
    it("propagates interruption", async () => {
      const program = Effect.never.fork().flatMap((fiber) => fiber.interrupt())

      const result = await program.unsafeRunPromise()

      expect(result.isInterrupted()).toBe(true)
    })

    it("propagates interruption with zip of defect", async () => {
      const program = Effect.Do()
        .bind("latch", () => Promise.make<never, void>())
        .bind("fiber", ({ latch }) =>
          (latch.succeed(undefined) > Effect.die(new Error()))
            .zipPar(Effect.never)
            .fork()
        )
        .tap(({ latch }) => latch.await())
        .flatMap(({ fiber }) =>
          fiber
            .interrupt()
            .map((exit) => exit.mapErrorCause((cause) => cause.untraced()))
        )

      const result = await program.unsafeRunPromise()

      expect(result.isInterrupted()).toBe(true)
    })
  })

  describe("forkWithErrorHandler", () => {
    it("calls provided function when task fails", async () => {
      const program = Promise.make<never, void>()
        .tap((promise) =>
          Effect.fail(undefined).forkWithErrorHandler((e) =>
            promise.succeed(e).asUnit()
          )
        )
        .flatMap((promise) => promise.await())
        .map(constTrue)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })
  })

  describe("head", () => {
    it("on non empty list", async () => {
      const program = Effect.succeed(List(1, 2, 3)).head.either()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.right(1))
    })

    it("on empty list", async () => {
      const program = Effect.succeed(List.empty<number>()).head.either()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.left(Option.none))
    })

    it("on failure", async () => {
      const program = Effect.fail("fail").head.either()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.left(Option.some("fail")))
    })
  })
})
