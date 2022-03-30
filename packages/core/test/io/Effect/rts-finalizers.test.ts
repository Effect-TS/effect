import { List } from "../../../src/collection/immutable/List"
import { Duration } from "../../../src/data/Duration"
import { constTrue } from "../../../src/data/Function"
import { Cause } from "../../../src/io/Cause"
import type { UIO } from "../../../src/io/Effect"
import { Effect } from "../../../src/io/Effect"
import { Exit } from "../../../src/io/Exit"
import { Promise } from "../../../src/io/Promise"
import { Ref } from "../../../src/io/Ref"
import {
  asyncExampleError,
  asyncUnit,
  ExampleError,
  ExampleErrorFail
} from "./test-utils"

describe("Effect", () => {
  describe("RTS finalizers", () => {
    it("fail ensuring", async () => {
      let finalized = false
      const program = Effect.fail(ExampleError).ensuring(
        Effect.succeed(() => {
          finalized = true
        })
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(ExampleError))
      expect(finalized).toBe(true)
    })

    it("fail on error", async () => {
      let finalized = false
      const program = Effect.fail(ExampleError).onError((cause) =>
        Effect.succeed(() => {
          finalized = true
        })
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(ExampleError))
      expect(finalized).toBe(true)
    })

    it("finalizer errors not caught", async () => {
      const e2 = new Error("e2")
      const e3 = new Error("e3")
      const program = ExampleErrorFail.ensuring(Effect.die(e2))
        .ensuring(Effect.die(e3))
        .sandbox()
        .flip()
        .map((cause) => cause.untraced())

      const result = await program.unsafeRunPromise()

      const expectedCause = Cause.fail(ExampleError) + Cause.die(e2) + Cause.die(e3)

      expect(result).toEqual(expectedCause)
    })

    it("finalizer errors reported", async () => {
      let reported: Exit<never, number> | undefined
      const program = Effect.succeed(42)
        .ensuring(Effect.die(ExampleError))
        .fork()
        .flatMap((fiber) =>
          fiber.await().flatMap((e) =>
            Effect.succeed(() => {
              reported = e
            })
          )
        )
        .map(constTrue)

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(true)
      expect(reported && reported.isSuccess()).toBe(false)
    })

    it("acquireReleaseWith exit is usage result", async () => {
      const program = Effect.acquireReleaseWith(
        Effect.unit,
        () => Effect.succeed(42),
        () => Effect.unit
      )

      const result = await program.unsafeRunPromise()

      expect(result).toBe(42)
    })

    it("error in just acquisition", async () => {
      const program = Effect.acquireReleaseWith(
        ExampleErrorFail,
        () => Effect.unit,
        () => Effect.unit
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(ExampleError))
    })

    it("error in just release", async () => {
      const program = Effect.acquireReleaseWith(
        Effect.unit,
        () => Effect.unit,
        () => Effect.die(ExampleError)
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.die(ExampleError))
    })

    it("error in just usage", async () => {
      const program = Effect.acquireReleaseWith(
        Effect.unit,
        () => Effect.fail(ExampleError),
        () => Effect.unit
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(ExampleError))
    })

    it("rethrown caught error in acquisition", async () => {
      const program = Effect.absolve(
        Effect.acquireReleaseWith(
          ExampleErrorFail,
          () => Effect.unit,
          () => Effect.unit
        ).either()
      ).flip()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(ExampleError)
    })

    it("rethrown caught error in release", async () => {
      const program = Effect.acquireReleaseWith(
        Effect.unit,
        () => Effect.unit,
        () => Effect.die(ExampleError)
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.die(ExampleError))
    })

    it("rethrown caught error in usage", async () => {
      const program = Effect.absolve(
        Effect.acquireReleaseWithDiscard(
          Effect.unit,
          ExampleErrorFail,
          Effect.unit
        ).either()
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(ExampleError))
    })

    it("test eval of async fail", async () => {
      const io1 = Effect.acquireReleaseWithDiscard(
        Effect.unit,
        asyncExampleError(),
        asyncUnit()
      )
      const io2 = Effect.acquireReleaseWithDiscard(
        asyncUnit(),
        asyncExampleError(),
        asyncUnit()
      )
      const program = Effect.Do()
        .bind("a1", () => io1.exit().map((exit) => exit.untraced()))
        .bind("a2", () => io2.exit().map((exit) => exit.untraced()))
        .bind("a3", () =>
          Effect.absolve(io1.either())
            .exit()
            .map((exit) => exit.untraced())
        )
        .bind("a4", () =>
          Effect.absolve(io2.either())
            .exit()
            .map((exit) => exit.untraced())
        )

      const { a1, a2, a3, a4 } = await program.unsafeRunPromise()

      expect(a1).toEqual(Exit.fail(ExampleError))
      expect(a2).toEqual(Exit.fail(ExampleError))
      expect(a3).toEqual(Exit.fail(ExampleError))
      expect(a4).toEqual(Exit.fail(ExampleError))
    })

    it("acquireReleaseWith regression 1", async () => {
      function makeLogger(ref: Ref<List<string>>) {
        return (line: string): UIO<void> => ref.update((list) => list + List(line))
      }

      const program = Effect.Do()
        .bind("ref", () => Ref.make(List.empty<string>()))
        .bindValue("log", ({ ref }) => makeLogger(ref))
        .bind("fiber", ({ log }) =>
          Effect.acquireReleaseWith(
            Effect.acquireReleaseWith(
              Effect.unit,
              () => Effect.unit,
              () => log("start 1") > Effect.sleep(Duration(10)) > log("release 1")
            ),
            () => Effect.unit,
            () => log("start 2") > Effect.sleep(Duration(10)) > log("release 2")
          ).fork()
        )
        .tap(({ ref }) =>
          (ref.get < Effect.sleep(Duration(1))).repeatUntil((list) =>
            list.contains("start 1")
          )
        )
        .tap(({ fiber }) => fiber.interrupt())
        .tap(({ ref }) =>
          (ref.get < Effect.sleep(Duration(1))).repeatUntil((list) =>
            list.contains("release 2")
          )
        )
        .flatMap(({ ref }) => ref.get.map((list) => list.toArray()))

      const result = await program.unsafeRunPromise()

      expect(result).toContain("start 1")
      expect(result).toContain("release 1")
      expect(result).toContain("start 2")
      expect(result).toContain("release 2")
    })

    it("interrupt waits for finalizer", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(false))
        .bind("promise1", () => Promise.make<never, void>())
        .bind("promise2", () => Promise.make<never, number>())
        .bind("fiber", ({ promise1, promise2, ref }) =>
          (promise1.succeed(undefined) > promise2.await())
            .ensuring(ref.set(true) > Effect.sleep(Duration(10)))
            .fork()
        )
        .tap(({ promise1 }) => promise1.await())
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ ref }) => ref.get)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })
  })
})
