import { List } from "../../../src/collection/immutable/List"
import { RuntimeError } from "../../../src/io/Cause"
import { Effect } from "../../../src/io/Effect"
import { Ref } from "../../../src/io/Ref"

describe("Effect", () => {
  describe("acquireReleaseWith", () => {
    it("happy path", async () => {
      const program = Effect.Do()
        .bind("release", () => Ref.make(false))
        .bind("result", ({ release }) =>
          Effect.acquireReleaseWith(
            Effect.succeed(42),
            (n) => Effect.succeed(n + 1),
            () => release.set(true)
          )
        )
        .bind("released", ({ release }) => release.get)

      const { released, result } = await program.unsafeRunPromise()

      expect(result).toBe(43)
      expect(released).toBe(true)
    })

    it("happy path + disconnect", async () => {
      const program = Effect.Do()
        .bind("release", () => Ref.make(false))
        .bind("result", ({ release }) =>
          Effect.acquireReleaseWith(
            Effect.succeed(42),
            (n) => Effect.succeed(n + 1),
            () => release.set(true)
          ).disconnect()
        )
        .bind("released", ({ release }) => release.get)

      const { released, result } = await program.unsafeRunPromise()

      expect(result).toBe(43)
      expect(released).toBe(true)
    })
  })

  describe("acquireReleaseWithDiscard", () => {
    it("happy path", async () => {
      const program = Effect.Do()
        .bind("release", () => Ref.make(false))
        .bind("result", ({ release }) =>
          Effect.acquireReleaseWithDiscard(
            Effect.succeed(42),
            Effect.succeed(0),
            release.set(true)
          )
        )
        .bind("released", ({ release }) => release.get)

      const { released, result } = await program.unsafeRunPromise()

      expect(result).toBe(0)
      expect(released).toBe(true)
    })

    it("happy path + disconnect", async () => {
      const program = Effect.Do()
        .bind("release", () => Ref.make(false))
        .bind("result", ({ release }) =>
          Effect.acquireReleaseWithDiscard(
            Effect.succeed(42),
            Effect.succeed(0),
            release.set(true)
          ).disconnect()
        )
        .bind("released", ({ release }) => release.get)

      const { released, result } = await program.unsafeRunPromise()

      expect(result).toBe(0)
      expect(released).toBe(true)
    })
  })

  describe("acquireReleaseExitWith", () => {
    it("happy path", async () => {
      const program = Effect.Do()
        .bind("release", () => Ref.make(false))
        .bind("result", ({ release }) =>
          Effect.acquireReleaseExitWith(
            Effect.succeed(42),
            () => Effect.succeed(0),
            () => release.set(true)
          )
        )
        .bind("released", ({ release }) => release.get)

      const { released, result } = await program.unsafeRunPromise()

      expect(result).toBe(0)
      expect(released).toBe(true)
    })
  })

  describe("acquireReleaseExitWith", () => {
    it("happy path", async () => {
      const program = Effect.Do()
        .bind("release", () => Ref.make(false))
        .bind("result", ({ release }) =>
          Effect.acquireReleaseExitWith(
            Effect.succeed(42),
            () => Effect.succeed(0),
            () => release.set(true)
          ).disconnect()
        )
        .bind("released", ({ release }) => release.get)

      const { released, result } = await program.unsafeRunPromise()

      expect(result).toBe(0)
      expect(released).toBe(true)
    })

    it("error handling", async () => {
      const releaseDied = new RuntimeError("release died")
      const program = Effect.Do()
        .bind("exit", () =>
          Effect.acquireReleaseExitWith(
            Effect.succeed(42),
            () => Effect.fail("use failed"),
            () => Effect.die(releaseDied)
          ).exit()
        )
        .flatMap(({ exit }) =>
          exit.foldEffect(
            (cause) => Effect.succeed(cause),
            () => Effect.fail("effect should have failed")
          )
        )

      const result = await program.unsafeRunPromise()

      expect(result.failures()).toEqual(List("use failed"))
      expect(result.defects()).toEqual(List(releaseDied))
    })

    it("happy path + disconnect", async () => {
      const program = Effect.Do()
        .bind("release", () => Ref.make(false))
        .bind("result", ({ release }) =>
          Effect.acquireReleaseExitWith(
            Effect.succeed(42),
            () => Effect.succeed(0),
            () => release.set(true)
          ).disconnect()
        )
        .bind("released", ({ release }) => release.get)

      const { released, result } = await program.unsafeRunPromise()

      expect(result).toBe(0)
      expect(released).toBe(true)
    })

    it("error handling + disconnect", async () => {
      const releaseDied = new RuntimeError("release died")
      const program = Effect.Do()
        .bind("exit", () =>
          Effect.acquireReleaseExitWith(
            Effect.succeed(42),
            () => Effect.fail("use failed"),
            () => Effect.die(releaseDied)
          )
            .disconnect()
            .exit()
        )
        .flatMap(({ exit }) =>
          exit.foldEffect(
            (cause) => Effect.succeed(cause),
            () => Effect.fail("effect should have failed")
          )
        )

      const result = await program.unsafeRunPromise()

      expect(result.failures()).toEqual(List("use failed"))
      expect(result.defects()).toEqual(List(releaseDied))
    })

    it("beast mode error handling + disconnect", async () => {
      const releaseDied = new RuntimeError("release died")
      const program = Effect.Do()
        .bind("release", () => Ref.make(false))
        .bind("exit", ({ release }) =>
          Effect.acquireReleaseExitWith(
            Effect.succeed(42),
            () => {
              throw releaseDied
            },
            () => release.set(true)
          )
            .disconnect()
            .exit()
        )
        .bind("cause", ({ exit }) =>
          exit.foldEffect(
            (cause) => Effect.succeed(cause),
            () => Effect.fail("effect should have failed")
          )
        )
        .bind("released", ({ release }) => release.get)

      const { cause, released } = await program.unsafeRunPromise()

      expect(cause.defects()).toEqual(List(releaseDied))
      expect(released).toBe(true)
    })
  })
})
