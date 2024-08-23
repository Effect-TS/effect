import * as Prompt from "@effect/cli/Prompt"
import * as MockTerminal from "@effect/cli/test/services/MockTerminal"
import type { Terminal } from "@effect/platform/Terminal"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Redacted from "effect/Redacted"
import { describe, expect, it } from "vitest"

const runEffect = <E, A>(
  self: Effect.Effect<A, E, Terminal>
): Promise<A> => Effect.provide(self, MockTerminal.layer).pipe(Effect.runPromise)

describe("Prompt", () => {
  describe("text", () => {
    it("should use the prompt value when no default is provided", () =>
      Effect.gen(function*() {
        const prompt = Prompt.text({
          message: "This does not have a default"
        })

        const fiber = yield* Effect.fork(prompt)
        yield* MockTerminal.inputKey("enter")
        const result = yield* Fiber.join(fiber)

        expect(result).toBe("")
      }).pipe(runEffect))

    it("should use the default value when the default is provided", () =>
      Effect.gen(function*() {
        const prompt = Prompt.text({
          message: "This should have a default",
          default: "default-value"
        })

        const fiber = yield* Effect.fork(prompt)
        yield* MockTerminal.inputKey("enter")
        const result = yield* Fiber.join(fiber)

        expect(result).toBe("default-value")
      }).pipe(runEffect))
  })

  describe("hidden", () => {
    it("should use the prompt value when no default is provided", () =>
      Effect.gen(function*() {
        const prompt = Prompt.hidden({
          message: "This does not have a default"
        })

        const fiber = yield* Effect.fork(prompt)
        yield* MockTerminal.inputKey("enter")
        const result = yield* Fiber.join(fiber)

        expect(result).toEqual(Redacted.make(""))
      }).pipe(runEffect))

    it("should use the default value when the default is provided", () =>
      Effect.gen(function*() {
        const prompt = Prompt.hidden({
          message: "This should have a default",
          default: "default-value"
        })

        const fiber = yield* Effect.fork(prompt)
        yield* MockTerminal.inputKey("enter")
        const result = yield* Fiber.join(fiber)

        expect(result).toEqual(Redacted.make("default-value"))
      }).pipe(runEffect))
  })

  describe("list", () => {
    it("should use the prompt value when no default is provided", () =>
      Effect.gen(function*() {
        const prompt = Prompt.list({
          message: "This does not have a default"
        })

        const fiber = yield* Effect.fork(prompt)
        yield* MockTerminal.inputKey("enter")
        const result = yield* Fiber.join(fiber)

        expect(result).toEqual([''])
      }).pipe(runEffect))

    it("should use the default value when the default is provided", () =>
      Effect.gen(function*() {
        const prompt = Prompt.list({
          message: "This should have a default",
          default: "default-value"
        })

        const fiber = yield* Effect.fork(prompt)
        yield* MockTerminal.inputKey("enter")
        const result = yield* Fiber.join(fiber)

        expect(result).toEqual(["default-value"])
      }).pipe(runEffect))
  })

  describe("password", () => {
    it("should use the prompt value when no default is provided", () =>
      Effect.gen(function*() {
        const prompt = Prompt.password({
          message: "This does not have a default"
        })

        const fiber = yield* Effect.fork(prompt)
        yield* MockTerminal.inputKey("enter")
        const result = yield* Fiber.join(fiber)

        expect(result).toEqual(Redacted.make(""))
      }).pipe(runEffect))

    it("should use the default value when the default is provided", () =>
      Effect.gen(function*() {
        const prompt = Prompt.password({
          message: "This should have a default",
          default: "default-value"
        })

        const fiber = yield* Effect.fork(prompt)
        yield* MockTerminal.inputKey("enter")
        const result = yield* Fiber.join(fiber)

        expect(result).toEqual(Redacted.make("default-value"))
      }).pipe(runEffect))
  })
})
